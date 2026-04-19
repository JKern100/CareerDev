"""Payment API routes.

Handles Paddle checkout integration, webhook processing, and subscription
status management. Legacy LemonSqueezy webhook kept for existing integrations.
"""

import json
import logging
from datetime import datetime, timezone
from uuid import UUID


def _parse_paddle_datetime(iso_str: str) -> datetime | None:
    """Parse a Paddle ISO datetime string to a naive UTC datetime."""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.replace(tzinfo=None)
    except (ValueError, AttributeError):
        return None

import httpx

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.models.user import User
from app.models.payment import Payment, Subscription
from app.api.deps import get_current_user
from app.services.payment import (
    create_checkout_url,
    get_or_create_subscription,
    activate_plan,
    handle_subscription_cancelled,
    handle_subscription_expired,
    handle_subscription_renewed,
    verify_webhook_signature,
    verify_paddle_webhook,
    is_premium,
    cancel_paddle_subscription,
    _variant_map,
)
from app.services.activity import log_activity
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["payment"])


# ── Schemas ──────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str

class CheckoutResponse(BaseModel):
    checkout_url: str

class PaddleCheckoutInfoResponse(BaseModel):
    price_id: str
    environment: str

class SubscriptionOut(BaseModel):
    plan: str
    is_active: bool
    is_premium: bool
    activated_at: str | None
    expires_at: str | None
    cancelled_at: str | None
    has_paddle_subscription: bool

class PaymentOut(BaseModel):
    id: str
    plan: str
    amount_cents: int
    currency: str
    status: str
    created_at: str


# ── Paddle Checkout Info ────────────────────────────────────────────────

PADDLE_PLAN_PRICES = {
    "pro": lambda: settings.PADDLE_PRICE_PRO,
}


@router.get("/paddle-info/{plan}", response_model=PaddleCheckoutInfoResponse)
async def get_paddle_checkout_info(
    plan: str,
    user: User = Depends(get_current_user),
):
    """Return the Paddle price ID and environment for the given plan.

    The frontend uses this to open the Paddle.js checkout overlay.
    """
    price_getter = PADDLE_PLAN_PRICES.get(plan)
    if not price_getter:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")

    price_id = price_getter()
    if not price_id:
        raise HTTPException(status_code=503, detail="Payment system not configured for this plan")

    return PaddleCheckoutInfoResponse(
        price_id=price_id,
        environment=settings.PADDLE_ENVIRONMENT,
    )


# ── Paddle Transaction (debug) ──────────────────────────────────────────

@router.post("/paddle-create-transaction")
async def paddle_create_transaction(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Create a Paddle transaction via API — returns transactionId for checkout.

    Also useful for debugging: returns the raw Paddle API response.
    """
    price_id = settings.PADDLE_PRICE_PRO
    if not price_id or not settings.PADDLE_API_KEY:
        raise HTTPException(status_code=503, detail="Paddle not configured")

    paddle_api = "https://api.paddle.com"
    payload = {
        "items": [{"price_id": price_id, "quantity": 1}],
        "customer_email": user.email,
        "custom_data": {"user_id": str(user.id)},
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{paddle_api}/transactions",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.PADDLE_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        body = resp.json()
        logger.info("Paddle create transaction: status=%s body=%s", resp.status_code, json.dumps(body)[:500])

        if resp.status_code >= 400:
            return {"error": True, "status": resp.status_code, "detail": body}

        transaction_id = body.get("data", {}).get("id")
        return {"error": False, "transaction_id": transaction_id, "detail": body}


# ── Legacy LemonSqueezy Checkout ────────────────────────────────────────

PLAN_TO_VARIANT = {
    "pro": lambda: settings.LEMONSQUEEZY_VARIANT_PRO,
    "premium": lambda: settings.LEMONSQUEEZY_VARIANT_PREMIUM,
    "monthly": lambda: settings.LEMONSQUEEZY_VARIANT_MONTHLY,
}


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("10/minute")
async def create_checkout(
    request: Request,
    data: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a LemonSqueezy checkout URL (legacy fallback)."""
    if data.plan not in PLAN_TO_VARIANT:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")

    variant_id = PLAN_TO_VARIANT[data.plan]()
    if not variant_id:
        raise HTTPException(status_code=503, detail="Payment system not configured for this plan")

    try:
        url = await create_checkout_url(
            variant_id=variant_id,
            user_id=user.id,
            user_email=user.email,
            user_name=user.full_name,
        )
        await log_activity(db, user, "checkout_started", f"Plan: {data.plan}")
        await db.commit()
        return CheckoutResponse(checkout_url=url)
    except Exception as e:
        logger.exception("Checkout creation failed")
        raise HTTPException(status_code=503, detail="Failed to create checkout. Please try again.")


# ── Subscription Status ──────────────────────────────────────────────────

@router.get("/subscription", response_model=SubscriptionOut)
async def get_subscription_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's subscription status."""
    sub = await get_or_create_subscription(user.id, db)
    return _sub_out(sub)


@router.post("/cancel-subscription", response_model=SubscriptionOut)
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel the current user's Paddle subscription at end of billing period."""
    try:
        sub = await cancel_paddle_subscription(user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return _sub_out(sub)


def _sub_out(sub: Subscription) -> SubscriptionOut:
    return SubscriptionOut(
        plan=sub.plan,
        is_active=sub.is_active,
        is_premium=is_premium(sub),
        activated_at=sub.activated_at.isoformat() if sub.activated_at else None,
        expires_at=sub.expires_at.isoformat() if sub.expires_at else None,
        cancelled_at=sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        has_paddle_subscription=bool(sub.paddle_subscription_id),
    )


# ── Payment Sync (verify with Paddle directly) ─────────────────────────

@router.post("/sync", response_model=SubscriptionOut)
@limiter.limit("5/minute")
async def sync_subscription(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check Paddle for the user's transactions and activate their plan.

    This is a fallback for when the webhook fails to fire or link the payment.
    The frontend calls this after a successful checkout.
    """
    if not settings.PADDLE_API_KEY:
        raise HTTPException(status_code=503, detail="Payment system not configured")

    api_url = "https://api.paddle.com"
    if settings.PADDLE_ENVIRONMENT == "sandbox":
        api_url = "https://sandbox-api.paddle.com"

    headers = {
        "Authorization": f"Bearer {settings.PADDLE_API_KEY}",
        "Content-Type": "application/json",
    }

    sub = await get_or_create_subscription(user.id, db)

    # If already active Pro, just return current status
    if is_premium(sub):
        return _sub_out(sub)

    # Search Paddle for transactions with this user's email
    try:
        async with httpx.AsyncClient() as client:
            # First, find customers by email
            resp = await client.get(
                f"{api_url}/customers",
                params={"search": user.email},
                headers=headers,
                timeout=15,
            )
            if resp.status_code >= 400:
                logger.warning("Paddle customer search failed: %s", resp.status_code)
                return _sub_out(sub)

            customers = resp.json().get("data", [])
            if not customers:
                logger.info("Paddle sync: no customer found for %s", user.email)
                return _sub_out(sub)

            customer_id = customers[0].get("id", "")

            # Get transactions for this customer
            resp = await client.get(
                f"{api_url}/transactions",
                params={"customer_id": customer_id, "status": "completed"},
                headers=headers,
                timeout=15,
            )
            if resp.status_code >= 400:
                logger.warning("Paddle transaction search failed: %s", resp.status_code)
                return _sub_out(sub)

            transactions = resp.json().get("data", [])
            if not transactions:
                logger.info("Paddle sync: no completed transactions for %s", user.email)
                return _sub_out(sub)

            # Use the most recent completed transaction
            txn = transactions[0]
            transaction_id = txn.get("id", "")
            subscription_id = txn.get("subscription_id")
            total = txn.get("details", {}).get("totals", {}).get("total", "0")
            currency = txn.get("currency_code", "USD")

            # Check if we already recorded this transaction
            existing = await db.execute(
                select(Payment).where(Payment.ls_order_id == f"paddle-{transaction_id}")
            )
            if existing.scalar_one_or_none():
                logger.info("Paddle sync: transaction %s already recorded", transaction_id)
                return _sub_out(sub)

            # Parse expiry
            expires_at = None
            next_billed = txn.get("next_billed_at")
            if next_billed:
                expires_at = _parse_paddle_datetime(next_billed)
            elif subscription_id:
                bp = txn.get("billing_period", {})
                ends_at = bp.get("ends_at")
                if ends_at:
                    expires_at = _parse_paddle_datetime(ends_at)

            await activate_plan(
                user_id=user.id,
                plan="pro",
                order_id=f"paddle-{transaction_id}",
                customer_id=customer_id,
                variant_id=settings.PADDLE_PRICE_PRO,
                amount_cents=int(total) if total else 0,
                currency=currency,
                subscription_id=subscription_id,
                expires_at=expires_at,
                db=db,
                paddle_subscription_id=subscription_id,
                paddle_customer_id=customer_id,
                paddle_transaction_id=transaction_id,
            )
            logger.info("Paddle sync: activated pro for %s (txn %s)", user.email, transaction_id)

            sub = await get_or_create_subscription(user.id, db)
            return _sub_out(sub)

    except Exception:
        logger.exception("Paddle sync failed for %s", user.email)
        return _sub_out(sub)


# ── Payment History ─────────────────────────────────────────────────────

@router.get("/history", response_model=list[PaymentOut])
async def get_payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's payment history."""
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()
    return [
        PaymentOut(
            id=str(p.id),
            plan=p.plan,
            amount_cents=p.amount_cents,
            currency=p.currency,
            status=p.status,
            created_at=p.created_at.isoformat() if p.created_at else "",
        )
        for p in payments
    ]


# ── Paddle Webhook ───────────────────────────────────────────────────────

@router.post("/webhook/paddle")
async def paddle_webhook(request: Request):
    """Handle Paddle Billing webhook events.

    Events handled:
    - transaction.completed: Payment succeeded
    - subscription.activated: Subscription started
    - subscription.updated: Subscription renewed or changed
    - subscription.canceled: User cancelled
    - subscription.past_due: Payment failed
    """
    body = await request.body()
    signature = request.headers.get("paddle-signature", "")

    if not verify_paddle_webhook(body, signature):
        logger.warning("Paddle webhook signature verification failed")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("event_type", "")
    data = payload.get("data", {})

    logger.info("Paddle webhook: %s", event_type)

    async with async_session() as db:
        try:
            if event_type == "transaction.completed":
                await _handle_paddle_transaction_completed(data, db)
            elif event_type == "subscription.activated":
                await _handle_paddle_subscription_activated(data, db)
            elif event_type == "subscription.updated":
                await _handle_paddle_subscription_updated(data, db)
            elif event_type == "subscription.canceled":
                sub_id = data.get("id", "")
                await handle_subscription_cancelled(sub_id, db)
            elif event_type == "subscription.past_due":
                sub_id = data.get("id", "")
                await handle_subscription_expired(sub_id, db)
            elif event_type in ("transaction.refunded", "adjustment.created"):
                await _handle_paddle_refund(data, db)
            else:
                logger.info("Unhandled Paddle event: %s", event_type)
        except Exception:
            logger.exception("Paddle webhook processing failed for %s", event_type)
            raise HTTPException(status_code=500, detail="Webhook processing failed")

    return {"status": "ok"}


async def _resolve_paddle_user(
    custom_data: dict,
    customer_id: str,
    db: AsyncSession,
) -> UUID | None:
    """Resolve a user_id from Paddle custom_data or by looking up the customer email."""
    from sqlalchemy import func

    user_id_str = (custom_data or {}).get("user_id")
    if user_id_str:
        try:
            return UUID(user_id_str)
        except ValueError:
            logger.warning("Invalid user_id in Paddle custom_data: %s", user_id_str)

    # Fall back: look up the customer email via Paddle API, match in our DB
    if not customer_id or not settings.PADDLE_API_KEY:
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.paddle.com/customers/{customer_id}",
                headers={"Authorization": f"Bearer {settings.PADDLE_API_KEY}"},
                timeout=10,
            )
            if resp.status_code >= 400:
                logger.warning("Paddle customer lookup failed: %s", resp.status_code)
                return None
            email = resp.json().get("data", {}).get("email", "")
            if not email:
                return None
            result = await db.execute(
                select(User).where(func.lower(User.email) == email.strip().lower())
            )
            user = result.scalar_one_or_none()
            if user:
                logger.info("Paddle: resolved user %s via email fallback", user.id)
                return user.id
    except Exception:
        logger.exception("Paddle customer email lookup failed")

    return None


async def _handle_paddle_transaction_completed(data: dict, db: AsyncSession):
    """Process a completed Paddle transaction."""
    transaction_id = data.get("id", "")
    customer_id = data.get("customer_id", "")
    subscription_id = data.get("subscription_id")
    custom_data = data.get("custom_data") or {}

    user_id = await _resolve_paddle_user(custom_data, customer_id, db)
    if not user_id:
        logger.warning(
            "Paddle transaction %s: could not resolve user. customer_id=%s custom_data=%s",
            transaction_id, customer_id, json.dumps(custom_data),
        )
        return

    items = data.get("items", [])
    total = data.get("details", {}).get("totals", {}).get("total", "0")
    currency = data.get("currency_code", "USD")
    next_billed_at = data.get("next_billed_at")

    # Determine plan from price ID
    plan = "pro"  # default
    for item in items:
        price_id = item.get("price", {}).get("id", "")
        if price_id == settings.PADDLE_PRICE_PRO:
            plan = "pro"

    amount_cents = int(total) if total else 0

    # Parse expiry from billing period or next_billed_at
    expires_at = None
    if next_billed_at:
        expires_at = _parse_paddle_datetime(next_billed_at)
    elif subscription_id:
        billing_period = data.get("billing_period", {})
        ends_at = billing_period.get("ends_at")
        if ends_at:
            expires_at = _parse_paddle_datetime(ends_at)

    await activate_plan(
        user_id=user_id,
        plan=plan,
        order_id=f"paddle-{transaction_id}",
        customer_id=customer_id,
        variant_id=settings.PADDLE_PRICE_PRO,
        amount_cents=amount_cents,
        currency=currency,
        subscription_id=subscription_id,
        expires_at=expires_at,
        db=db,
        paddle_subscription_id=subscription_id,
        paddle_customer_id=customer_id,
        paddle_transaction_id=transaction_id,
    )
    logger.info("Paddle: activated plan %s for user %s (txn %s)", plan, user_id, transaction_id)


async def _handle_paddle_subscription_activated(data: dict, db: AsyncSession):
    """Process a Paddle subscription activation."""
    subscription_id = data.get("id", "")
    customer_id = data.get("customer_id", "")
    custom_data = data.get("custom_data") or {}
    next_billed_at = data.get("next_billed_at")

    user_id = await _resolve_paddle_user(custom_data, customer_id, db)
    if not user_id:
        logger.warning(
            "Paddle subscription %s: could not resolve user. customer_id=%s custom_data=%s",
            subscription_id, customer_id, json.dumps(custom_data),
        )
        return

    items = data.get("items", [])
    plan = "pro"
    amount_cents = 0
    currency = data.get("currency_code", "USD")
    for item in items:
        price_id = item.get("price", {}).get("id", "")
        if price_id == settings.PADDLE_PRICE_PRO:
            plan = "pro"
        unit_price = item.get("price", {}).get("unit_price", {})
        amount_cents = int(unit_price.get("amount", "0"))

    expires_at = _parse_paddle_datetime(next_billed_at) if next_billed_at else None

    await activate_plan(
        user_id=user_id,
        plan=plan,
        order_id=f"paddle-sub-{subscription_id}",
        customer_id=customer_id,
        variant_id=settings.PADDLE_PRICE_PRO,
        amount_cents=amount_cents,
        currency=currency,
        subscription_id=subscription_id,
        expires_at=expires_at,
        db=db,
        paddle_subscription_id=subscription_id,
        paddle_customer_id=customer_id,
    )
    logger.info("Paddle: subscription %s activated for user %s", subscription_id, user_id)


async def _handle_paddle_subscription_updated(data: dict, db: AsyncSession):
    """Process a Paddle subscription update (renewal, plan change)."""
    subscription_id = data.get("id", "")
    status = data.get("status", "")
    next_billed_at = data.get("next_billed_at")

    if status == "active":
        await handle_subscription_renewed(subscription_id, next_billed_at, db)
    elif status in ("past_due", "paused"):
        await handle_subscription_expired(subscription_id, db)
    elif status == "canceled":
        await handle_subscription_cancelled(subscription_id, db)


async def _handle_paddle_refund(data: dict, db: AsyncSession):
    """Handle a Paddle refund — revoke the user's plan and mark payment as refunded."""
    transaction_id = data.get("transaction_id") or data.get("id", "")
    customer_id = data.get("customer_id", "")
    custom_data = data.get("custom_data") or {}

    user_id = await _resolve_paddle_user(custom_data, customer_id, db)
    if not user_id:
        logger.warning("Paddle refund: could not resolve user for txn %s", transaction_id)
        return

    # Mark matching payment records as refunded
    payment_result = await db.execute(
        select(Payment).where(
            Payment.user_id == user_id,
            Payment.ls_order_id.like(f"paddle-%{transaction_id}%"),
        )
    )
    refunded_payments = payment_result.scalars().all()
    if not refunded_payments:
        payment_result = await db.execute(
            select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
        )
        refunded_payments = payment_result.scalars().all()[:1]

    for p in refunded_payments:
        p.status = "refunded"

    sub = await get_or_create_subscription(user_id, db)
    if sub.plan != "free":
        sub.plan = "free"
        sub.is_active = False
        sub.cancelled_at = datetime.utcnow()

    await db.commit()
    logger.info("Paddle refund: revoked plan for user %s (txn %s, %d payments marked)", user_id, transaction_id, len(refunded_payments))


# ── Legacy LemonSqueezy Webhook ──────────────────────────────────────────

@router.post("/webhook/lemonsqueezy")
async def lemonsqueezy_webhook(request: Request):
    """Handle LemonSqueezy webhook events (legacy)."""
    body = await request.body()
    signature = request.headers.get("x-signature", "")

    if not verify_webhook_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_name = payload.get("meta", {}).get("event_name", "")
    custom_data = payload.get("meta", {}).get("custom_data", {})
    user_id_str = custom_data.get("user_id")
    attrs = payload.get("data", {}).get("attributes", {})

    logger.info("LemonSqueezy webhook: %s (user: %s)", event_name, user_id_str)

    async with async_session() as db:
        try:
            if event_name == "order_created":
                await _handle_ls_order_created(user_id_str, attrs, db)
            elif event_name == "subscription_created":
                await _handle_ls_subscription_created(user_id_str, attrs, db)
            elif event_name in ("subscription_cancelled",):
                sub_id = str(payload.get("data", {}).get("id", ""))
                await handle_subscription_cancelled(sub_id, db)
            elif event_name in ("subscription_expired",):
                sub_id = str(payload.get("data", {}).get("id", ""))
                await handle_subscription_expired(sub_id, db)
        except Exception:
            logger.exception("LemonSqueezy webhook failed for %s", event_name)

    return {"status": "ok"}


async def _handle_ls_order_created(user_id_str: str | None, attrs: dict, db: AsyncSession):
    if not user_id_str:
        return
    user_id = UUID(user_id_str)
    order_id = str(attrs.get("identifier", attrs.get("order_number", "")))
    customer_id = str(attrs.get("customer_id", ""))
    variant_id = str(attrs.get("first_order_item", {}).get("variant_id", ""))
    if attrs.get("first_order_item", {}).get("is_subscription", False):
        return
    plan = _variant_map().get(variant_id, "pro")
    await activate_plan(
        user_id=user_id, plan=plan, order_id=order_id, customer_id=customer_id,
        variant_id=variant_id, amount_cents=attrs.get("total", 0),
        currency=attrs.get("currency", "USD"), subscription_id=None,
        expires_at=None, db=db,
    )


async def _handle_ls_subscription_created(user_id_str: str | None, attrs: dict, db: AsyncSession):
    if not user_id_str:
        return
    user_id = UUID(user_id_str)
    order_id = str(attrs.get("order_id", ""))
    customer_id = str(attrs.get("customer_id", ""))
    subscription_id = str(attrs.get("subscription_id", attrs.get("id", "")))
    variant_id = str(attrs.get("variant_id", ""))
    renews_at = attrs.get("renews_at")
    expires = _parse_paddle_datetime(renews_at) if renews_at else None
    plan = _variant_map().get(variant_id, "monthly")
    await activate_plan(
        user_id=user_id, plan=plan, order_id=f"sub-{order_id}", customer_id=customer_id,
        variant_id=variant_id, amount_cents=attrs.get("total", 0),
        currency=attrs.get("currency", "USD"), subscription_id=subscription_id,
        expires_at=expires, db=db,
    )

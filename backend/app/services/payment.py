"""Payment service.

Handles Paddle checkout, webhook verification, and subscription management.
Legacy LemonSqueezy support kept for existing data.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.payment import Payment, Subscription

logger = logging.getLogger(__name__)

# ── LemonSqueezy legacy ─────────────────────────────────────────────────

LS_API = "https://api.lemonsqueezy.com/v1"
VARIANT_TO_PLAN = {}


def _variant_map() -> dict[str, str]:
    global VARIANT_TO_PLAN
    if not VARIANT_TO_PLAN:
        if settings.LEMONSQUEEZY_VARIANT_PRO:
            VARIANT_TO_PLAN[settings.LEMONSQUEEZY_VARIANT_PRO] = "pro"
        if settings.LEMONSQUEEZY_VARIANT_PREMIUM:
            VARIANT_TO_PLAN[settings.LEMONSQUEEZY_VARIANT_PREMIUM] = "premium"
        if settings.LEMONSQUEEZY_VARIANT_MONTHLY:
            VARIANT_TO_PLAN[settings.LEMONSQUEEZY_VARIANT_MONTHLY] = "monthly"
    return VARIANT_TO_PLAN


def _ls_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.LEMONSQUEEZY_API_KEY}",
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
    }


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify LemonSqueezy webhook HMAC-SHA256 signature."""
    secret = settings.LEMONSQUEEZY_WEBHOOK_SECRET
    if not secret:
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def create_checkout_url(
    variant_id: str,
    user_id: UUID,
    user_email: str,
    user_name: str | None = None,
) -> str:
    """Create a LemonSqueezy checkout URL (legacy)."""
    if not settings.LEMONSQUEEZY_API_KEY:
        raise RuntimeError("LemonSqueezy API key not configured")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": user_email,
                    "name": user_name or "",
                    "custom": {"user_id": str(user_id)},
                },
                "product_options": {
                    "redirect_url": f"{settings.FRONTEND_URL}/plan?payment=success",
                },
            },
            "relationships": {
                "store": {"data": {"type": "stores", "id": settings.LEMONSQUEEZY_STORE_ID}},
                "variant": {"data": {"type": "variants", "id": variant_id}},
            },
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{LS_API}/checkouts", json=payload, headers=_ls_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data["data"]["attributes"]["url"]


# ── Paddle ───────────────────────────────────────────────────────────────

PADDLE_API = "https://api.paddle.com"
PADDLE_SANDBOX_API = "https://sandbox-api.paddle.com"


def _paddle_api_url() -> str:
    if settings.PADDLE_ENVIRONMENT == "sandbox":
        return PADDLE_SANDBOX_API
    return PADDLE_API


def _paddle_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.PADDLE_API_KEY}",
        "Content-Type": "application/json",
    }


def verify_paddle_webhook(payload: bytes, signature_header: str) -> bool:
    """Verify Paddle webhook signature.

    Paddle Billing sends a Paddle-Signature header with format:
    ts=<timestamp>;h1=<hash>
    The hash is HMAC-SHA256 of "<timestamp>:<payload>" using the webhook secret.
    """
    secret = settings.PADDLE_WEBHOOK_SECRET
    if not secret:
        logger.warning("PADDLE_WEBHOOK_SECRET not set — rejecting webhook")
        return False

    try:
        parts = dict(p.split("=", 1) for p in signature_header.split(";"))
        ts = parts.get("ts", "")
        h1 = parts.get("h1", "")
        if not ts or not h1:
            return False

        signed_payload = f"{ts}:{payload.decode()}"
        expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, h1)
    except Exception:
        logger.exception("Paddle webhook signature verification failed")
        return False


# ── Shared helpers ───────────────────────────────────────────────────────

async def get_or_create_subscription(user_id: UUID, db: AsyncSession) -> Subscription:
    """Get or create the subscription record for a user."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = Subscription(user_id=user_id, plan="free", is_active=False)
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


async def activate_plan(
    user_id: UUID,
    plan: str,
    order_id: str,
    customer_id: str,
    variant_id: str,
    amount_cents: int,
    currency: str,
    subscription_id: str | None,
    expires_at: datetime | None,
    db: AsyncSession,
    paddle_subscription_id: str | None = None,
    paddle_customer_id: str | None = None,
    paddle_transaction_id: str | None = None,
) -> Subscription:
    """Record a payment and activate the user's plan."""
    payment = Payment(
        user_id=user_id,
        ls_order_id=order_id,
        ls_subscription_id=subscription_id,
        ls_customer_id=customer_id,
        ls_variant_id=variant_id,
        plan=plan,
        amount_cents=amount_cents,
        currency=currency,
        status="paid",
    )
    db.add(payment)

    sub = await get_or_create_subscription(user_id, db)
    plan_rank = {"free": 0, "pro": 1, "monthly": 2, "premium": 3}
    if plan_rank.get(plan, 0) >= plan_rank.get(sub.plan, 0):
        sub.plan = plan
        sub.is_active = True
        sub.activated_at = datetime.utcnow()
        sub.cancelled_at = None

        # Paddle IDs
        if paddle_subscription_id:
            sub.paddle_subscription_id = paddle_subscription_id
        if paddle_customer_id:
            sub.paddle_customer_id = paddle_customer_id
        if paddle_transaction_id:
            sub.paddle_transaction_id = paddle_transaction_id

        # Legacy LS IDs
        if customer_id and not paddle_customer_id:
            sub.ls_customer_id = customer_id
        if subscription_id and not paddle_subscription_id:
            sub.ls_subscription_id = subscription_id

        if expires_at:
            sub.expires_at = expires_at

    await db.commit()
    await db.refresh(sub)
    return sub


async def handle_subscription_cancelled(
    subscription_id: str,
    db: AsyncSession,
) -> None:
    """Handle subscription cancellation — mark as cancelled but keep active until expiry."""
    # Check Paddle first, then legacy LS
    result = await db.execute(
        select(Subscription).where(Subscription.paddle_subscription_id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        result = await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == subscription_id)
        )
        sub = result.scalar_one_or_none()
    if sub:
        sub.cancelled_at = datetime.utcnow()
        await db.commit()


async def handle_subscription_expired(
    subscription_id: str,
    db: AsyncSession,
) -> None:
    """Handle subscription expiry — deactivate."""
    result = await db.execute(
        select(Subscription).where(Subscription.paddle_subscription_id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        result = await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == subscription_id)
        )
        sub = result.scalar_one_or_none()
    if sub and sub.plan in ("monthly", "pro"):
        sub.is_active = False
        sub.plan = "free"
        await db.commit()


async def handle_subscription_renewed(
    subscription_id: str,
    next_billed_at: str | None,
    db: AsyncSession,
) -> None:
    """Handle subscription renewal — extend expiry."""
    result = await db.execute(
        select(Subscription).where(Subscription.paddle_subscription_id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.is_active = True
        sub.cancelled_at = None
        if next_billed_at:
            try:
                sub.expires_at = datetime.fromisoformat(next_billed_at.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass
        await db.commit()


async def cancel_paddle_subscription(
    user_id: UUID,
    db: AsyncSession,
) -> Subscription:
    """Cancel a user's Paddle subscription at end of billing period."""
    sub = await get_or_create_subscription(user_id, db)
    if not sub.paddle_subscription_id:
        raise ValueError("No active Paddle subscription found")
    if sub.cancelled_at:
        raise ValueError("Subscription is already cancelled")

    api_url = _paddle_api_url()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{api_url}/subscriptions/{sub.paddle_subscription_id}/cancel",
            json={"effective_from": "next_billing_period"},
            headers=_paddle_headers(),
            timeout=15,
        )
        if resp.status_code >= 400:
            body = resp.json()
            logger.error("Paddle cancel failed: %s %s", resp.status_code, body)
            raise RuntimeError(f"Paddle cancel failed: {body.get('error', {}).get('detail', 'Unknown error')}")

    sub.cancelled_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sub)
    return sub


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _is_expired(expires_at: datetime | None) -> bool:
    if not expires_at:
        return False
    now = _utcnow()
    if expires_at.tzinfo is None:
        return expires_at < now.replace(tzinfo=None)
    return expires_at < now


def is_premium(sub: Subscription | None) -> bool:
    """Check if user has an active paid plan."""
    if not sub:
        return False
    if not sub.is_active:
        return False
    if sub.plan in ("pro", "premium", "monthly"):
        return not _is_expired(sub.expires_at)
    return False

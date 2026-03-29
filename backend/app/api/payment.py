"""Payment API routes.

Handles checkout URL creation for authenticated users and
LemonSqueezy webhook processing for payment events.
"""

import json
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.models.user import User
from app.models.payment import Subscription
from app.api.deps import get_current_user
from app.services.payment import (
    create_checkout_url,
    get_or_create_subscription,
    activate_plan,
    handle_subscription_cancelled,
    handle_subscription_expired,
    verify_webhook_signature,
    is_premium,
    _variant_map,
)
from app.services.activity import log_activity
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["payment"])


# ── Schemas ──────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # "pro", "premium", "monthly"


class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionOut(BaseModel):
    plan: str
    is_active: bool
    is_premium: bool
    activated_at: str | None
    expires_at: str | None
    cancelled_at: str | None


# ── Checkout ─────────────────────────────────────────────────────────────

PLAN_TO_VARIANT = {
    "pro": lambda: settings.LEMONSQUEEZY_VARIANT_PRO,
    "premium": lambda: settings.LEMONSQUEEZY_VARIANT_PREMIUM,
    "monthly": lambda: settings.LEMONSQUEEZY_VARIANT_MONTHLY,
}


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a LemonSqueezy checkout URL for the given plan."""
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
    return SubscriptionOut(
        plan=sub.plan,
        is_active=sub.is_active,
        is_premium=is_premium(sub),
        activated_at=sub.activated_at.isoformat() if sub.activated_at else None,
        expires_at=sub.expires_at.isoformat() if sub.expires_at else None,
        cancelled_at=sub.cancelled_at.isoformat() if sub.cancelled_at else None,
    )


# ── Webhook ──────────────────────────────────────────────────────────────

@router.post("/webhook/lemonsqueezy")
async def lemonsqueezy_webhook(request: Request):
    """Handle LemonSqueezy webhook events.

    Events handled:
    - order_created: One-time purchase completed
    - subscription_created: Monthly subscription started
    - subscription_updated: Subscription renewed or changed
    - subscription_cancelled: User cancelled (still active until period end)
    - subscription_expired: Subscription period ended
    """
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
                await _handle_order_created(user_id_str, attrs, db)
            elif event_name == "subscription_created":
                await _handle_subscription_created(user_id_str, attrs, db)
            elif event_name == "subscription_updated":
                await _handle_subscription_updated(attrs, db)
            elif event_name == "subscription_cancelled":
                sub_id = str(payload.get("data", {}).get("id", ""))
                await handle_subscription_cancelled(sub_id, db)
            elif event_name == "subscription_expired":
                sub_id = str(payload.get("data", {}).get("id", ""))
                await handle_subscription_expired(sub_id, db)
            else:
                logger.info("Unhandled webhook event: %s", event_name)
        except Exception:
            logger.exception("Webhook processing failed for event %s", event_name)

    return {"status": "ok"}


async def _handle_order_created(user_id_str: str | None, attrs: dict, db: AsyncSession):
    """Process a one-time purchase."""
    if not user_id_str:
        logger.warning("Order webhook missing user_id in custom_data")
        return

    user_id = UUID(user_id_str)
    order_id = str(attrs.get("identifier", attrs.get("order_number", "")))
    customer_id = str(attrs.get("customer_id", ""))
    variant_id = str(attrs.get("first_order_item", {}).get("variant_id", ""))
    total = attrs.get("total", 0)
    currency = attrs.get("currency", "USD")

    plan = _variant_map().get(variant_id, "pro")

    # Skip if this is a subscription order (handled by subscription_created)
    if attrs.get("first_order_item", {}).get("is_subscription", False):
        return

    await activate_plan(
        user_id=user_id,
        plan=plan,
        order_id=order_id,
        customer_id=customer_id,
        variant_id=variant_id,
        amount_cents=total,
        currency=currency,
        subscription_id=None,
        expires_at=None,  # one-time = lifetime
        db=db,
    )
    logger.info("Activated plan %s for user %s (order %s)", plan, user_id, order_id)


async def _handle_subscription_created(user_id_str: str | None, attrs: dict, db: AsyncSession):
    """Process a new subscription."""
    if not user_id_str:
        logger.warning("Subscription webhook missing user_id in custom_data")
        return

    user_id = UUID(user_id_str)
    order_id = str(attrs.get("order_id", ""))
    customer_id = str(attrs.get("customer_id", ""))
    subscription_id = str(attrs.get("subscription_id", attrs.get("id", "")))
    variant_id = str(attrs.get("variant_id", ""))
    renews_at = attrs.get("renews_at")

    expires = None
    if renews_at:
        try:
            expires = datetime.fromisoformat(renews_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pass

    plan = _variant_map().get(variant_id, "monthly")

    await activate_plan(
        user_id=user_id,
        plan=plan,
        order_id=f"sub-{order_id}",
        customer_id=customer_id,
        variant_id=variant_id,
        amount_cents=attrs.get("total", 0),
        currency=attrs.get("currency", "USD"),
        subscription_id=subscription_id,
        expires_at=expires,
        db=db,
    )
    logger.info("Subscription created for user %s (sub %s)", user_id, subscription_id)


async def _handle_subscription_updated(attrs: dict, db: AsyncSession):
    """Process a subscription renewal/update."""
    subscription_id = str(attrs.get("id", ""))
    renews_at = attrs.get("renews_at")
    status = attrs.get("status", "")

    result = await db.execute(
        select(Subscription).where(Subscription.ls_subscription_id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    if status == "active":
        sub.is_active = True
        sub.cancelled_at = None
        if renews_at:
            try:
                sub.expires_at = datetime.fromisoformat(renews_at.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass
    elif status in ("past_due", "unpaid"):
        sub.is_active = False

    await db.commit()

"""LemonSqueezy payment service.

Handles checkout URL generation, webhook processing, and subscription
status management.
"""

import hashlib
import hmac
import logging
from datetime import datetime
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.payment import Payment, Subscription

logger = logging.getLogger(__name__)

LS_API = "https://api.lemonsqueezy.com/v1"

VARIANT_TO_PLAN = {}  # populated at first use


def _variant_map() -> dict[str, str]:
    """Build variant_id → plan name mapping from config."""
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
        logger.warning("LEMONSQUEEZY_WEBHOOK_SECRET not set — skipping verification")
        return True
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def create_checkout_url(
    variant_id: str,
    user_id: UUID,
    user_email: str,
    user_name: str | None = None,
) -> str:
    """Create a LemonSqueezy checkout URL for the given variant.

    Passes user_id as custom data so we can link the payment back to the user.
    """
    if not settings.LEMONSQUEEZY_API_KEY:
        raise RuntimeError("LemonSqueezy API key not configured")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": user_email,
                    "name": user_name or "",
                    "custom": {
                        "user_id": str(user_id),
                    },
                },
                "product_options": {
                    "redirect_url": f"{settings.FRONTEND_URL}/plan?payment=success",
                },
            },
            "relationships": {
                "store": {
                    "data": {
                        "type": "stores",
                        "id": settings.LEMONSQUEEZY_STORE_ID,
                    }
                },
                "variant": {
                    "data": {
                        "type": "variants",
                        "id": variant_id,
                    }
                },
            },
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LS_API}/checkouts",
            json=payload,
            headers=_ls_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["data"]["attributes"]["url"]


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
) -> Subscription:
    """Record a payment and activate the user's plan."""
    # Record payment
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

    # Update subscription
    sub = await get_or_create_subscription(user_id, db)
    # Only upgrade, never downgrade
    plan_rank = {"free": 0, "pro": 1, "monthly": 2, "premium": 3}
    if plan_rank.get(plan, 0) >= plan_rank.get(sub.plan, 0):
        sub.plan = plan
        sub.is_active = True
        sub.activated_at = datetime.utcnow()
        sub.ls_customer_id = customer_id
        if subscription_id:
            sub.ls_subscription_id = subscription_id
        if expires_at:
            sub.expires_at = expires_at
        sub.cancelled_at = None

    await db.commit()
    await db.refresh(sub)
    return sub


async def handle_subscription_cancelled(
    subscription_id: str,
    db: AsyncSession,
) -> None:
    """Handle subscription cancellation — mark as cancelled but keep active until expiry."""
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
        select(Subscription).where(Subscription.ls_subscription_id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if sub and sub.plan == "monthly":
        sub.is_active = False
        sub.plan = "free"
        await db.commit()


def is_premium(sub: Subscription | None) -> bool:
    """Check if user has an active paid plan."""
    if not sub:
        return False
    if not sub.is_active:
        return False
    # One-time purchases (pro/premium) never expire
    if sub.plan in ("pro", "premium"):
        return True
    # Monthly subscription — check expiry
    if sub.plan == "monthly":
        if sub.expires_at and sub.expires_at < datetime.utcnow():
            return False
        return True
    return False

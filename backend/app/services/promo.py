"""Promo code service.

Validates, applies, and redeems promotional codes.
"""

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.promo import PromoCode, PromoRedemption
from app.models.payment import Subscription
from app.services.payment import get_or_create_subscription

logger = logging.getLogger(__name__)

# Prices in cents for discount calculation
PLAN_PRICES_CENTS = {
    "pro": 2900,
    "premium": 4900,
    "monthly": 1500,
}


class PromoValidationError(Exception):
    pass


async def validate_code(
    code: str,
    user_id: UUID,
    plan: str,
    db: AsyncSession,
) -> PromoCode:
    """Validate a promo code for a given user and plan.

    Returns the PromoCode if valid, raises PromoValidationError otherwise.
    """
    # Find the code (case-insensitive)
    result = await db.execute(
        select(PromoCode).where(func.lower(PromoCode.code) == code.strip().lower())
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise PromoValidationError("Invalid promo code")

    if not promo.is_active:
        raise PromoValidationError("This promo code is no longer active")

    if promo.expires_at and promo.expires_at < datetime.utcnow():
        raise PromoValidationError("This promo code has expired")

    # Check applies_to
    if promo.applies_to != "all" and promo.applies_to != plan:
        raise PromoValidationError(f"This code is not valid for the {plan} plan")

    # Check global usage limit
    if promo.max_uses is not None and promo.times_used >= promo.max_uses:
        raise PromoValidationError("This promo code has reached its usage limit")

    # Check per-user limit
    result = await db.execute(
        select(func.count(PromoRedemption.id)).where(
            PromoRedemption.promo_code_id == promo.id,
            PromoRedemption.user_id == user_id,
        )
    )
    user_uses = result.scalar() or 0
    if user_uses >= promo.max_uses_per_user:
        raise PromoValidationError("You have already used this promo code")

    return promo


def calculate_discount(promo: PromoCode, plan: str) -> dict:
    """Calculate the discount for a promo code on a given plan.

    Returns {
        "original_cents": int,
        "discount_cents": int,
        "final_cents": int,
        "description": str,
        "is_free": bool,
    }
    """
    original = PLAN_PRICES_CENTS.get(plan, 0)

    if promo.discount_type == "full_unlock":
        return {
            "original_cents": original,
            "discount_cents": original,
            "final_cents": 0,
            "description": f"Full unlock ({promo.unlocks_plan or plan})",
            "is_free": True,
        }

    if promo.discount_type == "percent":
        pct = min(promo.discount_value, 100)
        discount = int(original * pct / 100)
        return {
            "original_cents": original,
            "discount_cents": discount,
            "final_cents": max(0, original - discount),
            "description": f"{pct}% off",
            "is_free": discount >= original,
        }

    if promo.discount_type == "fixed":
        discount = min(promo.discount_value, original)
        return {
            "original_cents": original,
            "discount_cents": discount,
            "final_cents": max(0, original - discount),
            "description": f"${promo.discount_value / 100:.2f} off",
            "is_free": discount >= original,
        }

    return {
        "original_cents": original,
        "discount_cents": 0,
        "final_cents": original,
        "description": "No discount",
        "is_free": False,
    }


async def redeem_full_unlock(
    promo: PromoCode,
    user_id: UUID,
    plan: str,
    db: AsyncSession,
) -> Subscription:
    """Redeem a full_unlock code — directly activate the plan without payment."""
    target_plan = promo.unlocks_plan or plan

    sub = await get_or_create_subscription(user_id, db)

    # Only upgrade
    plan_rank = {"free": 0, "pro": 1, "monthly": 2, "premium": 3}
    if plan_rank.get(target_plan, 0) >= plan_rank.get(sub.plan, 0):
        sub.plan = target_plan
        sub.is_active = True
        sub.activated_at = datetime.utcnow()
        sub.cancelled_at = None

    # Record redemption
    redemption = PromoRedemption(
        promo_code_id=promo.id,
        user_id=user_id,
        plan_applied=target_plan,
        discount_applied=f"Full unlock ({target_plan})",
    )
    db.add(redemption)

    # Increment usage count
    promo.times_used += 1

    await db.commit()
    await db.refresh(sub)
    return sub


async def record_redemption(
    promo: PromoCode,
    user_id: UUID,
    plan: str,
    discount_description: str,
    db: AsyncSession,
) -> None:
    """Record a promo code redemption (for discount codes used at checkout)."""
    redemption = PromoRedemption(
        promo_code_id=promo.id,
        user_id=user_id,
        plan_applied=plan,
        discount_applied=discount_description,
    )
    db.add(redemption)
    promo.times_used += 1
    await db.commit()

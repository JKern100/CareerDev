"""Referral system API.

Endpoints for referral stats, reward checking, and admin analytics.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.payment import Subscription
from app.api.deps import get_current_user, get_admin_user

router = APIRouter(prefix="/referral", tags=["referral"])

REFERRALS_FOR_REWARD = 3


# ── Schemas ──────────────────────────────────────────────────

class ReferralStats(BaseModel):
    referral_code: str
    total_referrals: int
    rewards_earned: int
    next_reward_in: int  # referrals needed for next reward


class ReferralRewardResult(BaseModel):
    rewarded: bool
    message: str
    plan: str | None = None
    expires_at: str | None = None


class AdminReferralOverview(BaseModel):
    total_referrals: int
    total_rewards_granted: int
    top_referrers: list[dict]
    recent_referrals: list[dict]


class AdminReferrerDetail(BaseModel):
    referrer_id: str
    referrer_email: str
    referrer_name: str | None
    referral_code: str
    total_referrals: int
    rewards_earned: int
    referred_users: list[dict]


# ── User endpoints ───────────────────────────────────────────

@router.get("/stats", response_model=ReferralStats)
async def get_referral_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's referral stats."""
    # Count how many users this user referred
    result = await db.execute(
        select(func.count()).where(User.referred_by == user.id)
    )
    total = result.scalar() or 0

    rewards_earned = total // REFERRALS_FOR_REWARD
    next_reward_in = REFERRALS_FOR_REWARD - (total % REFERRALS_FOR_REWARD)

    return ReferralStats(
        referral_code=user.referral_code or "",
        total_referrals=total,
        rewards_earned=rewards_earned,
        next_reward_in=next_reward_in,
    )


@router.post("/claim-reward", response_model=ReferralRewardResult)
async def claim_referral_reward(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check referral count and grant Pro extension if eligible.

    Each set of 3 referrals grants 1 month of Pro. Already-granted
    rewards are tracked by checking the subscription's expires_at.
    """
    # Count referrals
    result = await db.execute(
        select(func.count()).where(User.referred_by == user.id)
    )
    total = result.scalar() or 0
    rewards_deserved = total // REFERRALS_FOR_REWARD

    if rewards_deserved == 0:
        return ReferralRewardResult(
            rewarded=False,
            message=f"You need {REFERRALS_FOR_REWARD} referrals to earn a free month of Pro. You have {total} so far.",
        )

    # Get or create subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        sub = Subscription(user_id=user.id, plan="free", is_active=False)
        db.add(sub)
        await db.flush()

    # Calculate how many months have already been granted via referrals
    # We track this by counting how many full REFERRALS_FOR_REWARD sets
    # have been applied. We store the count in a simple way: each claim
    # extends by (rewards_deserved * 1 month) from now or current expiry.
    now = datetime.now(timezone.utc)

    # Determine base date for extension
    if sub.plan in ("pro", "monthly") and sub.is_active and sub.expires_at and sub.expires_at > now:
        base_date = sub.expires_at
    else:
        base_date = now

    new_expiry = base_date + timedelta(days=30 * rewards_deserved)

    # Activate/extend as pro
    sub.plan = "pro"
    sub.is_active = True
    if not sub.activated_at:
        sub.activated_at = now
    sub.expires_at = new_expiry
    sub.cancelled_at = None

    await db.commit()
    await db.refresh(sub)

    return ReferralRewardResult(
        rewarded=True,
        message=f"You earned {rewards_deserved} month(s) of Pro from {total} referrals!",
        plan="pro",
        expires_at=sub.expires_at.isoformat() if sub.expires_at else None,
    )


# ── Admin endpoints ──────────────────────────────────────────

@router.get("/admin/overview", response_model=AdminReferralOverview)
async def admin_referral_overview(
    _user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin overview of referral activity."""
    # Total referrals (users who were referred)
    result = await db.execute(
        select(func.count()).where(User.referred_by.isnot(None))
    )
    total_referrals = result.scalar() or 0

    # Total rewards granted (rough: count users with >= 3 referrals, sum rewards)
    referrer_counts = (
        select(
            User.referred_by.label("referrer_id"),
            func.count().label("cnt"),
        )
        .where(User.referred_by.isnot(None))
        .group_by(User.referred_by)
        .subquery()
    )
    result = await db.execute(
        select(func.sum(referrer_counts.c.cnt / REFERRALS_FOR_REWARD))
    )
    total_rewards = int(result.scalar() or 0)

    # Top referrers
    from sqlalchemy.orm import aliased
    Referrer = aliased(User)
    stmt = (
        select(
            Referrer.id,
            Referrer.email,
            Referrer.full_name,
            Referrer.referral_code,
            func.count(User.id).label("referral_count"),
        )
        .join(User, User.referred_by == Referrer.id)
        .group_by(Referrer.id, Referrer.email, Referrer.full_name, Referrer.referral_code)
        .order_by(func.count(User.id).desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    top_referrers = [
        {
            "user_id": str(row.id),
            "email": row.email,
            "full_name": row.full_name,
            "referral_code": row.referral_code,
            "referral_count": row.referral_count,
            "rewards_earned": row.referral_count // REFERRALS_FOR_REWARD,
        }
        for row in result.all()
    ]

    # Recent referrals (last 20 referred users)
    Referrer2 = aliased(User)
    stmt = (
        select(
            User.id,
            User.email,
            User.full_name,
            User.created_at,
            Referrer2.email.label("referrer_email"),
            Referrer2.referral_code.label("referrer_code"),
        )
        .join(Referrer2, User.referred_by == Referrer2.id)
        .where(User.referred_by.isnot(None))
        .order_by(User.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    recent = [
        {
            "user_id": str(row.id),
            "email": row.email,
            "full_name": row.full_name,
            "signed_up_at": row.created_at.isoformat() if row.created_at else None,
            "referrer_email": row.referrer_email,
            "referrer_code": row.referrer_code,
        }
        for row in result.all()
    ]

    return AdminReferralOverview(
        total_referrals=total_referrals,
        total_rewards_granted=total_rewards,
        top_referrers=top_referrers,
        recent_referrals=recent,
    )

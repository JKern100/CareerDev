"""Promo code API routes.

Admin: CRUD for promo codes + usage stats.
User: validate a code, redeem a full-unlock code.
"""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.promo import PromoCode, PromoRedemption
from app.api.deps import get_current_user, get_admin_user
from app.services.promo import (
    validate_code,
    calculate_discount,
    redeem_full_unlock,
    record_redemption,
    PromoValidationError,
)
from app.services.payment import is_premium, get_or_create_subscription
from app.services.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/promo", tags=["promo"])


# ── Schemas ──────────────────────────────────────────────────────────────

class PromoCodeCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    discount_type: str = Field(..., pattern="^(percent|fixed|full_unlock)$")
    discount_value: int = 0  # percent (0-100) or cents for fixed
    applies_to: str = Field(default="all", pattern="^(all|pro|premium|monthly)$")
    unlocks_plan: str | None = None  # for full_unlock
    max_uses: int | None = None
    max_uses_per_user: int = 1
    expires_at: str | None = None  # ISO datetime
    note: str | None = None
    is_active: bool = True


class PromoCodeOut(BaseModel):
    id: str
    code: str
    discount_type: str
    discount_value: int
    applies_to: str
    unlocks_plan: str | None
    max_uses: int | None
    max_uses_per_user: int
    times_used: int
    is_active: bool
    expires_at: str | None
    note: str | None
    created_at: str


class PromoCodeUpdate(BaseModel):
    is_active: bool | None = None
    max_uses: int | None = None
    max_uses_per_user: int | None = None
    expires_at: str | None = None
    note: str | None = None
    discount_value: int | None = None
    applies_to: str | None = None


class RedemptionOut(BaseModel):
    id: str
    user_id: str
    plan_applied: str
    discount_applied: str
    created_at: str


class ValidateRequest(BaseModel):
    code: str = Field(..., min_length=1)
    plan: str = Field(..., pattern="^(pro|premium|monthly)$")


class ValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: str
    description: str
    original_cents: int
    discount_cents: int
    final_cents: int
    is_free: bool


class RedeemRequest(BaseModel):
    code: str = Field(..., min_length=1)
    plan: str = Field(default="pro", pattern="^(pro|premium|monthly)$")


class RedeemResponse(BaseModel):
    redeemed: bool
    plan: str
    message: str


def _promo_out(p: PromoCode) -> PromoCodeOut:
    return PromoCodeOut(
        id=str(p.id),
        code=p.code,
        discount_type=p.discount_type,
        discount_value=p.discount_value,
        applies_to=p.applies_to,
        unlocks_plan=p.unlocks_plan,
        max_uses=p.max_uses,
        max_uses_per_user=p.max_uses_per_user,
        times_used=p.times_used,
        is_active=p.is_active,
        expires_at=p.expires_at.isoformat() if p.expires_at else None,
        note=p.note,
        created_at=p.created_at.isoformat(),
    )


# ── Admin CRUD ───────────────────────────────────────────────────────────

@router.get("/admin/codes", response_model=list[PromoCodeOut])
async def list_promo_codes(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    return [_promo_out(p) for p in result.scalars().all()]


@router.post("/admin/codes", response_model=PromoCodeOut, status_code=201)
async def create_promo_code(
    data: PromoCodeCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Check uniqueness
    result = await db.execute(select(PromoCode).where(PromoCode.code == data.code.strip().upper()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A code with this name already exists")

    expires = None
    if data.expires_at:
        try:
            expires = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format")

    promo = PromoCode(
        code=data.code.strip().upper(),
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        applies_to=data.applies_to,
        unlocks_plan=data.unlocks_plan,
        max_uses=data.max_uses,
        max_uses_per_user=data.max_uses_per_user,
        is_active=data.is_active,
        expires_at=expires,
        note=data.note,
        created_by=admin.id,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    await log_activity(db, admin, "promo_created", f"Code: {promo.code}")
    await db.commit()
    return _promo_out(promo)


@router.patch("/admin/codes/{code_id}", response_model=PromoCodeOut)
async def update_promo_code(
    code_id: str,
    data: PromoCodeUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_id = UUID(code_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid code ID")

    result = await db.execute(select(PromoCode).where(PromoCode.id == parsed_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    if data.is_active is not None:
        promo.is_active = data.is_active
    if data.max_uses is not None:
        promo.max_uses = data.max_uses
    if data.max_uses_per_user is not None:
        promo.max_uses_per_user = data.max_uses_per_user
    if data.expires_at is not None:
        try:
            promo.expires_at = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00")) if data.expires_at else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format")
    if data.note is not None:
        promo.note = data.note
    if data.discount_value is not None:
        promo.discount_value = data.discount_value
    if data.applies_to is not None:
        promo.applies_to = data.applies_to

    await db.commit()
    await db.refresh(promo)
    return _promo_out(promo)


@router.delete("/admin/codes/{code_id}")
async def delete_promo_code(
    code_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_id = UUID(code_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid code ID")

    result = await db.execute(select(PromoCode).where(PromoCode.id == parsed_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    await db.delete(promo)
    await db.commit()
    return {"detail": f"Deleted code {promo.code}"}


@router.get("/admin/codes/{code_id}/redemptions", response_model=list[RedemptionOut])
async def get_code_redemptions(
    code_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        parsed_id = UUID(code_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid code ID")

    result = await db.execute(
        select(PromoRedemption)
        .where(PromoRedemption.promo_code_id == parsed_id)
        .order_by(PromoRedemption.created_at.desc())
    )
    return [
        RedemptionOut(
            id=str(r.id),
            user_id=str(r.user_id),
            plan_applied=r.plan_applied,
            discount_applied=r.discount_applied,
            created_at=r.created_at.isoformat(),
        )
        for r in result.scalars().all()
    ]


# ── User-facing ──────────────────────────────────────────────────────────

@router.post("/validate", response_model=ValidateResponse)
async def validate_promo(
    data: ValidateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate a promo code and return the discount details without redeeming."""
    try:
        promo = await validate_code(data.code, user.id, data.plan, db)
    except PromoValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    discount = calculate_discount(promo, data.plan)
    return ValidateResponse(
        valid=True,
        code=promo.code,
        discount_type=promo.discount_type,
        description=discount["description"],
        original_cents=discount["original_cents"],
        discount_cents=discount["discount_cents"],
        final_cents=discount["final_cents"],
        is_free=discount["is_free"],
    )


@router.post("/redeem", response_model=RedeemResponse)
async def redeem_promo(
    data: RedeemRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Redeem a promo code. Only full_unlock codes can be redeemed directly.

    Discount codes (percent/fixed) are applied at checkout instead.
    """
    try:
        promo = await validate_code(data.code, user.id, data.plan, db)
    except PromoValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if promo.discount_type != "full_unlock":
        # For discount codes, just validate — they'll be applied at checkout
        discount = calculate_discount(promo, data.plan)
        return RedeemResponse(
            redeemed=False,
            plan=data.plan,
            message=f"This code gives you {discount['description']}. Apply it at checkout.",
        )

    # Full unlock — activate immediately
    sub = await redeem_full_unlock(promo, user.id, data.plan, db)
    await log_activity(db, user, "promo_redeemed", f"Code: {promo.code}, plan: {sub.plan}")
    await db.commit()
    return RedeemResponse(
        redeemed=True,
        plan=sub.plan,
        message=f"Your {sub.plan} plan has been activated!",
    )

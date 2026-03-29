"""Promo code models.

Stores promotional/discount codes and tracks redemptions.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, Integer, Uuid, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # What it does
    discount_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "percent", "fixed", "full_unlock"
    discount_value: Mapped[int] = mapped_column(Integer, default=0)  # percent (0-100) or cents for fixed; ignored for full_unlock
    applies_to: Mapped[str] = mapped_column(String(30), default="all")  # "all", "pro", "premium", "monthly"
    unlocks_plan: Mapped[str | None] = mapped_column(String(30), nullable=True)  # for full_unlock: which plan to grant

    # Limits
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)  # null = unlimited
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1)
    times_used: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Attribution
    note: Mapped[str | None] = mapped_column(Text, nullable=True)  # admin note: "Influencer X campaign"

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)  # admin who created it


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"
    __table_args__ = (
        Index("ix_promo_redemptions_user", "user_id"),
        Index("ix_promo_redemptions_code", "promo_code_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    promo_code_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("promo_codes.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    plan_applied: Mapped[str] = mapped_column(String(30), nullable=False)  # which plan the code was used on
    discount_applied: Mapped[str] = mapped_column(String(100), nullable=False)  # human-readable: "30% off", "$10 off", "Full unlock (pro)"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

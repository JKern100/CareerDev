"""Payment and subscription models.

Tracks user purchases and subscriptions via LemonSqueezy.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, Integer, Uuid, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    """Records each successful payment event from LemonSqueezy."""
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)

    # LemonSqueezy identifiers
    ls_order_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    ls_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ls_customer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    ls_variant_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # What they bought
    plan: Mapped[str] = mapped_column(String(30), nullable=False)  # "pro", "premium", "monthly"
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # "paid", "refunded"

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    """Tracks the user's current subscription/purchase status."""
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Current plan
    plan: Mapped[str] = mapped_column(String(30), default="free")  # "free", "pro", "premium", "monthly"
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    # LemonSqueezy subscription (for monthly plan only)
    ls_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ls_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Dates
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # null = lifetime for one-time
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

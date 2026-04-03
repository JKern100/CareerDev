import secrets
import string
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SAEnum, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

import enum


def _generate_referral_code() -> str:
    """Generate a short unique referral code like 'JAYK-2X9F'."""
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(secrets.choice(chars) for _ in range(4))
    part2 = "".join(secrets.choice(chars) for _ in range(4))
    return f"{part1}-{part2}"


class UserRole(str, enum.Enum):
    USER = "user"
    ADVISOR = "advisor"
    ADMIN = "admin"
    AUDITOR = "auditor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255))

    # OAuth
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, native_enum=False), default=UserRole.USER, nullable=False)

    # Profile fields
    country_pack: Mapped[str] = mapped_column(String(10), default="UAE")
    language: Mapped[str] = mapped_column(String(10), default="en")

    # Email verification
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # First-login tracking
    has_logged_in: Mapped[bool] = mapped_column(Boolean, default=False)

    # Login timestamps
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    login_count: Mapped[int | None] = mapped_column(Integer, default=0)

    # Activity tracking (updated on every authenticated request, throttled to 1/min)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Consent
    consent_processing: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_anonymized: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_advisor_access: Mapped[bool] = mapped_column(Boolean, default=False)

    # Report regeneration (admin-controlled)
    can_regenerate: Mapped[bool] = mapped_column(Boolean, default=False)
    can_regenerate_summary: Mapped[bool] = mapped_column(Boolean, default=False)

    # Questionnaire progress
    questionnaire_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    current_module: Mapped[str | None] = mapped_column(String(10))
    current_question_id: Mapped[str | None] = mapped_column(String(10))

    # Referral system
    referral_code: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, default=_generate_referral_code)
    referred_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    answers: Mapped[list["Answer"]] = relationship("Answer", back_populates="user", lazy="selectin")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="user", lazy="selectin")

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

import enum


class UserRole(str, enum.Enum):
    USER = "user"
    ADVISOR = "advisor"
    ADMIN = "admin"
    AUDITOR = "auditor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
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
    login_count: Mapped[int] = mapped_column(default=0)

    # Consent
    consent_processing: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_anonymized: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_advisor_access: Mapped[bool] = mapped_column(Boolean, default=False)

    # Report regeneration (admin-controlled)
    can_regenerate: Mapped[bool] = mapped_column(Boolean, default=False)

    # Questionnaire progress
    questionnaire_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    current_module: Mapped[str | None] = mapped_column(String(10))
    current_question_id: Mapped[str | None] = mapped_column(String(10))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    answers: Mapped[list["Answer"]] = relationship("Answer", back_populates="user", lazy="selectin")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="user", lazy="selectin")

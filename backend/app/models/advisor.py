import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Advisor(Base):
    __tablename__ = "advisors"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), unique=True, nullable=False)
    credentials: Mapped[str | None] = mapped_column(Text)
    specialties: Mapped[list | None] = mapped_column(JSON)
    languages: Mapped[list | None] = mapped_column(JSON)
    timezone: Mapped[str | None] = mapped_column(String(50))
    calendar_link: Mapped[str | None] = mapped_column(String(500))
    jurisdiction_scope: Mapped[list | None] = mapped_column(JSON)  # ["UAE", "EU"]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AdvisorSession(Base):
    __tablename__ = "advisor_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    advisor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("advisors.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="booked")  # booked, in_progress, completed, cancelled
    notes: Mapped[str | None] = mapped_column(Text)
    recording_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Integer, DateTime, Text, ForeignKey, JSON, Uuid, Date, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Advisor(Base):
    __tablename__ = "advisors"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), unique=True, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    credentials: Mapped[str | None] = mapped_column(Text)
    specialties: Mapped[list | None] = mapped_column(JSON)
    languages: Mapped[list | None] = mapped_column(JSON)
    timezone: Mapped[str | None] = mapped_column(String(50), default="Asia/Dubai")
    session_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    jurisdiction_scope: Mapped[list | None] = mapped_column(JSON)  # ["UAE", "EU"]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AvailabilitySlot(Base):
    """Weekly recurring availability for an advisor.

    day_of_week: 0=Monday, 6=Sunday
    start_time/end_time: e.g. 09:00, 17:00
    """
    __tablename__ = "availability_slots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    advisor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("advisors.id"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon, 6=Sun
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "09:00"
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "17:00"


class Booking(Base):
    """A booked session between a user and an advisor."""
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    advisor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("advisors.id"), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # "2026-03-15"
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "10:00"
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "11:00"
    status: Mapped[str] = mapped_column(String(20), default="confirmed")  # confirmed, cancelled, completed
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

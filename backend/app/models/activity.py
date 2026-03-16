import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ActivityEvent(Base):
    """Tracks user actions for admin analytics: logins, report generation, etc."""
    __tablename__ = "activity_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    user_role: Mapped[str] = mapped_column(String(20), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    detail: Mapped[str | None] = mapped_column(String(500))
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

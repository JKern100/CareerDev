"""Email event model — populated by Resend webhooks."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailEvent(Base):
    __tablename__ = "email_events"
    __table_args__ = (
        UniqueConstraint("resend_id", "event_type", "event_at", name="uq_email_events_resend_type_time"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    resend_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    to_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    # Resend types: email.sent, email.delivered, email.opened, email.clicked,
    # email.bounced, email.complained, email.delivery_delayed, email.failed
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)  # populated for click events
    event_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)

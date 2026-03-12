import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    object_id: Mapped[str | None] = mapped_column(String(255))
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    before_hash: Mapped[str | None] = mapped_column(String(64))
    after_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

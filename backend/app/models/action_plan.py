"""Action plan models.

Stores structured next steps extracted from the user's career analysis,
with tracking for completion status.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, Integer, Uuid, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ActionStep(Base):
    __tablename__ = "action_steps"
    __table_args__ = (
        Index("ix_action_steps_user_pathway", "user_id", "pathway_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)

    # Where this step comes from
    pathway_id: Mapped[str | None] = mapped_column(String(10), nullable=True)  # P1-P16, or null for universal steps
    pathway_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # "first_step", "credential", "this_week"

    # Content
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)  # for credentials
    duration: Mapped[str | None] = mapped_column(String(100), nullable=True)  # for credentials
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Tracking
    status: Mapped[str] = mapped_column(String(20), default="todo")  # "todo", "in_progress", "done", "skipped"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

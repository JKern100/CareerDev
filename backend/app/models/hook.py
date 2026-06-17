import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HookEvent(Base):
    """Anonymous events from the ungated 60-second hook at /start.

    The 60-second hook runs entirely in the browser and never creates an
    account, so these are the only server-side record that it was used. One
    row per milestone: "started" (first question answered) and "completed"
    (reached the teaser). No user identity or PII — just enough to count
    runs and basic funnel shape in the admin dashboard.
    """
    __tablename__ = "hook_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # "started" | "completed"
    region: Mapped[str | None] = mapped_column(String(50))
    top_pathway: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

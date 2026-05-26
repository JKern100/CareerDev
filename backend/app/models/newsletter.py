"""Newsletter models: issues and subscribers."""

import secrets
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _token() -> str:
    return secrets.token_urlsafe(32)[:64]


class NewsletterIssue(Base):
    __tablename__ = "newsletter_issues"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    teaser_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    body_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # status: draft | published | sent
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    # status: pending | active | unsubscribed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    confirm_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    confirm_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    unsub_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True, default=_token)
    source: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, Float, DateTime, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)  # e.g. Q001
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # A-H
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)  # single_select, likert_1_5, etc.
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    options_json: Mapped[dict | None] = mapped_column(JSON)  # for select types
    min_val: Mapped[int | None] = mapped_column(Integer)
    max_val: Mapped[int | None] = mapped_column(Integer)
    route_if_json: Mapped[dict | None] = mapped_column(JSON)  # conditional routing rules
    tags_json: Mapped[list | None] = mapped_column(JSON)
    order: Mapped[int] = mapped_column(Integer, default=0)


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(10), ForeignKey("questions.id"), nullable=False)
    value_json: Mapped[dict] = mapped_column(JSON, nullable=False)  # the actual answer
    confidence: Mapped[int] = mapped_column(Integer, default=50)  # 0-100
    evidence_refs: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="answers")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)  # story, link, file, certificate, etc.
    storage_uri: Mapped[str | None] = mapped_column(String(500))
    content: Mapped[str | None] = mapped_column(Text)
    redaction_status: Mapped[str] = mapped_column(String(20), default="raw")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

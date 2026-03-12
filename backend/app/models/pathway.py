import uuid
from datetime import datetime

from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Pathway(Base):
    __tablename__ = "pathways"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)  # P1-P8
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    prerequisites: Mapped[dict | None] = mapped_column(JSON)
    typical_roles: Mapped[list] = mapped_column(JSON, default=list)
    salary_band_refs: Mapped[dict | None] = mapped_column(JSON)  # {min_aed, max_aed, source, date}
    recommended_credentials: Mapped[list | None] = mapped_column(JSON)
    country_pack: Mapped[str] = mapped_column(String(10), default="UAE")

    # Scoring weights (can be customized per pathway)
    weight_interest: Mapped[float] = mapped_column(Float, default=0.25)
    weight_skill: Mapped[float] = mapped_column(Float, default=0.25)
    weight_environment: Mapped[float] = mapped_column(Float, default=0.10)
    weight_feasibility: Mapped[float] = mapped_column(Float, default=0.20)
    weight_compensation: Mapped[float] = mapped_column(Float, default=0.15)
    weight_risk: Mapped[float] = mapped_column(Float, default=0.05)


class PathwayScore(Base):
    __tablename__ = "pathway_scores"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    pathway_id: Mapped[str] = mapped_column(String(10), ForeignKey("pathways.id"), nullable=False)

    raw_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_factor: Mapped[float] = mapped_column(Float, default=0.5)
    adjusted_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Component scores
    interest_score: Mapped[float] = mapped_column(Float, default=0.0)
    skill_score: Mapped[float] = mapped_column(Float, default=0.0)
    environment_score: Mapped[float] = mapped_column(Float, default=0.0)
    feasibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    compensation_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)

    gate_flags: Mapped[list | None] = mapped_column(JSON)  # hard constraints that triggered
    top_evidence_signals: Mapped[list | None] = mapped_column(JSON)
    risks_unknowns: Mapped[list | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class PathwayScoreOut(BaseModel):
    pathway_id: str
    pathway_name: str
    description: str
    adjusted_score: float
    raw_score: float
    confidence_factor: float
    interest_score: float
    skill_score: float
    environment_score: float
    feasibility_score: float
    compensation_score: float
    risk_score: float
    typical_roles: list[str]
    salary_band_refs: dict | None
    recommended_credentials: list[dict] | None
    gate_flags: list[str] | None
    top_evidence_signals: list[str] | None
    risks_unknowns: list[str] | None

    model_config = {"from_attributes": True}


class AnalysisRunOut(BaseModel):
    job_id: UUID
    status: str


class SummaryOut(BaseModel):
    summary_text: str
    generated_with_ai: bool
    created_at: datetime | None = None


class ReportOut(BaseModel):
    id: UUID
    user_id: UUID
    report_json: dict
    citations_map: dict | None
    version: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}

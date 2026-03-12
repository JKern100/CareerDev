import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer
from app.models.pathway import PathwayScore
from app.models.report import Report
from app.schemas.analysis import PathwayScoreOut, AnalysisRunOut, ReportOut
from app.services.scoring import score_pathways
from app.api.deps import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/run", response_model=AnalysisRunOut)
async def run_analysis(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run the deterministic scoring engine on user's answers."""
    if not user.questionnaire_completed:
        raise HTTPException(status_code=400, detail="Complete the questionnaire before running analysis")

    # Load user answers
    result = await db.execute(select(Answer).where(Answer.user_id == user.id))
    answers_raw = result.scalars().all()
    answers = {
        a.question_id: {
            "value": a.value_json.get("value") if a.value_json else None,
            "value_json": a.value_json,
            "confidence": a.confidence,
            "evidence_refs": a.evidence_refs,
        }
        for a in answers_raw
    }

    # Run scoring
    scored = score_pathways(answers)

    # Persist scores
    for sp in scored:
        ps = PathwayScore(
            user_id=user.id,
            pathway_id=sp.pathway_id,
            raw_score=sp.raw_score,
            confidence_factor=sp.confidence_factor,
            adjusted_score=sp.adjusted_score,
            interest_score=sp.interest_score,
            skill_score=sp.skill_score,
            environment_score=sp.environment_score,
            feasibility_score=sp.feasibility_score,
            compensation_score=sp.compensation_score,
            risk_score=sp.risk_score,
            gate_flags=sp.gate_flags,
            top_evidence_signals=sp.top_evidence_signals,
            risks_unknowns=sp.risks_unknowns,
        )
        db.add(ps)

    # Create report
    report_data = {
        "top_pathways": [
            {
                "rank": i + 1,
                "pathway_id": sp.pathway_id,
                "pathway_name": sp.pathway_name,
                "description": sp.description,
                "adjusted_score": sp.adjusted_score,
                "typical_roles": sp.typical_roles,
                "salary_band_refs": sp.salary_band_refs,
                "recommended_credentials": sp.recommended_credentials,
                "gate_flags": sp.gate_flags,
                "top_evidence_signals": sp.top_evidence_signals,
                "risks_unknowns": sp.risks_unknowns,
            }
            for i, sp in enumerate(scored)
        ],
    }

    report = Report(
        user_id=user.id,
        report_json=report_data,
        status="complete",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return AnalysisRunOut(job_id=report.id, status="complete")


@router.get("/results", response_model=list[PathwayScoreOut])
async def get_results(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest scored pathways for the current user."""
    result = await db.execute(
        select(PathwayScore)
        .where(PathwayScore.user_id == user.id)
        .order_by(PathwayScore.adjusted_score.desc())
    )
    scores = result.scalars().all()
    if not scores:
        raise HTTPException(status_code=404, detail="No analysis results found. Run analysis first.")

    from app.services.scoring import load_pathways
    pathways_map = {p["id"]: p for p in load_pathways()}

    return [
        PathwayScoreOut(
            pathway_id=s.pathway_id,
            pathway_name=pathways_map.get(s.pathway_id, {}).get("name", ""),
            description=pathways_map.get(s.pathway_id, {}).get("description", ""),
            adjusted_score=s.adjusted_score,
            raw_score=s.raw_score,
            confidence_factor=s.confidence_factor,
            interest_score=s.interest_score,
            skill_score=s.skill_score,
            environment_score=s.environment_score,
            feasibility_score=s.feasibility_score,
            compensation_score=s.compensation_score,
            risk_score=s.risk_score,
            typical_roles=pathways_map.get(s.pathway_id, {}).get("typical_roles", []),
            salary_band_refs=pathways_map.get(s.pathway_id, {}).get("salary_band_refs"),
            recommended_credentials=pathways_map.get(s.pathway_id, {}).get("recommended_credentials"),
            gate_flags=s.gate_flags,
            top_evidence_signals=s.top_evidence_signals,
            risks_unknowns=s.risks_unknowns,
        )
        for s in scores
    ]


@router.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

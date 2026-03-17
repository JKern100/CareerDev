import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer
from app.models.pathway import PathwayScore
from app.models.report import Report, AnalysisReport
from app.config import settings
from app.schemas.analysis import PathwayScoreOut, AnalysisRunOut, ReportOut, SummaryOut, CareerAnalysisOut
from app.services.scoring import score_pathways
from app.services.summary import generate_summary_with_ai, generate_summary_without_ai
from app.services.career_analysis import (
    build_system_prompt,
    build_user_message,
    check_completion_gate,
    call_analysis_api,
)
from app.api.deps import get_current_user
from app.services.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/summary", response_model=SummaryOut)
async def generate_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a narrative summary report playing back the user's answers."""
    if not user.questionnaire_completed:
        raise HTTPException(status_code=400, detail="Complete the questionnaire first")

    # Check if user already has a summary and needs permission to regenerate
    existing = await db.execute(
        select(Report).where(Report.user_id == user.id)
    )
    existing_summaries = [
        r for r in existing.scalars().all()
        if isinstance(r.report_json, dict) and r.report_json.get("type") == "summary"
    ]
    if existing_summaries and not user.can_regenerate_summary:
        raise HTTPException(
            status_code=403,
            detail="Profile summary regeneration is not enabled. Please contact your administrator.",
        )

    # Reset the flag after use
    if user.can_regenerate_summary:
        user.can_regenerate_summary = False

    # Load user answers
    result = await db.execute(select(Answer).where(Answer.user_id == user.id))
    answers_raw = result.scalars().all()
    answers = {
        a.question_id: {
            "value": a.value_json.get("value") if a.value_json else None,
            "confidence": a.confidence,
        }
        for a in answers_raw
    }

    # Generate the narrative
    api_key = settings.LLM_API_KEY
    if api_key:
        summary_text = await generate_summary_with_ai(answers, user.full_name, api_key)
        used_ai = True
    else:
        summary_text = generate_summary_without_ai(answers, user.full_name)
        used_ai = False

    # Store in a report record
    report = Report(
        user_id=user.id,
        report_json={"type": "summary", "text": summary_text, "generated_with_ai": used_ai},
        status="complete",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return SummaryOut(
        summary_text=summary_text,
        generated_with_ai=used_ai,
        created_at=report.created_at,
    )


@router.get("/summary", response_model=SummaryOut)
async def get_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest summary report for the current user."""
    result = await db.execute(
        select(Report)
        .where(Report.user_id == user.id)
        .order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    # Find the most recent summary-type report
    summary_report = None
    for r in reports:
        if isinstance(r.report_json, dict) and r.report_json.get("type") == "summary":
            summary_report = r
            break

    if not summary_report:
        raise HTTPException(status_code=404, detail="No summary found. Generate one first.")

    return SummaryOut(
        summary_text=summary_report.report_json.get("text", ""),
        generated_with_ai=summary_report.report_json.get("generated_with_ai", False),
        created_at=summary_report.created_at,
    )


@router.post("/run", response_model=AnalysisRunOut)
async def run_analysis(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run the full analysis pipeline: completion gate, AI call, and store results.

    Step 1: Check questionnaire_completed flag and completion gate (all required answered).
    Step 2: Build system prompt (cached) and user message.
    Step 3: Call Gemini API for Markdown report.
    Step 4: Store the report (overwrite if exists).
    """
    # --- Pre-checks ---
    if not user.questionnaire_completed:
        raise HTTPException(
            status_code=400,
            detail="Complete the questionnaire before running analysis.",
        )

    # Check if user already has a report and needs permission to regenerate
    existing_report = await db.execute(
        select(AnalysisReport).where(AnalysisReport.user_id == user.id)
    )
    if existing_report.scalar_one_or_none() and not user.can_regenerate:
        raise HTTPException(
            status_code=403,
            detail="Report regeneration is not enabled. Please contact your administrator.",
        )

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

    # Step 1 — Completion gate
    gate_passed, gate_error = check_completion_gate(answers)
    if not gate_passed:
        raise HTTPException(status_code=400, detail=gate_error)

    # Step 2 — Build the AI call
    system_prompt = build_system_prompt()
    user_message = build_user_message(answers, user.full_name, user.updated_at)

    # Step 3 — Call the Claude API
    model_name = settings.LLM_MODEL
    try:
        markdown_report = await call_analysis_api(system_prompt, user_message)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("AI analysis call failed")
        raise HTTPException(status_code=500, detail=f"Analysis generation failed: {type(e).__name__}: {str(e)}")

    # Step 4 — Store the result (overwrite if exists)
    try:
        # Delete any existing analysis report for this user
        await db.execute(
            delete(AnalysisReport).where(AnalysisReport.user_id == user.id)
        )

        analysis_report = AnalysisReport(
            user_id=user.id,
            markdown_report=markdown_report,
            model_name=model_name,
        )
        db.add(analysis_report)

        # Also run the deterministic scoring engine and persist scores
        scored = score_pathways(answers)

        old_scores = await db.execute(
            select(PathwayScore).where(PathwayScore.user_id == user.id)
        )
        for old in old_scores.scalars().all():
            await db.delete(old)
        await db.flush()

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

        # Create a Report record too for backwards compatibility
        report_data = {
            "type": "career_analysis",
            "top_pathways": [
                {
                    "rank": i + 1,
                    "pathway_id": sp.pathway_id,
                    "pathway_name": sp.pathway_name,
                    "description": sp.description,
                    "adjusted_score": sp.adjusted_score,
                    "typical_roles": sp.typical_roles,
                    "salary_band_refs": sp.salary_band_refs,
                    "salary_global_note": sp.salary_global_note,
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

        # Reset can_regenerate flag after successful regeneration
        user.can_regenerate = False

        await log_activity(db, user, "report_generated", f"Model: {model_name}")
        await db.commit()
        await db.refresh(report)

        return AnalysisRunOut(job_id=report.id, status="complete")

    except Exception as e:
        await db.rollback()
        logger.exception("Failed to save analysis results")
        raise HTTPException(status_code=500, detail=f"Failed to save results: {type(e).__name__}: {str(e)}")


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
            salary_global_note=pathways_map.get(s.pathway_id, {}).get("salary_global_note"),
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

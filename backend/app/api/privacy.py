from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer, Evidence
from app.models.pathway import PathwayScore
from app.models.report import Report
from app.models.audit import AuditEvent
from app.api.deps import get_current_user

router = APIRouter(prefix="/privacy", tags=["privacy"])


@router.post("/export")
async def export_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all user data (PDPL data subject right)."""
    answers = await db.execute(select(Answer).where(Answer.user_id == user.id))
    scores = await db.execute(select(PathwayScore).where(PathwayScore.user_id == user.id))
    reports = await db.execute(select(Report).where(Report.user_id == user.id))

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "country_pack": user.country_pack,
            "language": user.language,
            "created_at": user.created_at.isoformat(),
        },
        "answers": [
            {"question_id": a.question_id, "value_json": a.value_json, "confidence": a.confidence}
            for a in answers.scalars().all()
        ],
        "pathway_scores": [
            {"pathway_id": s.pathway_id, "adjusted_score": s.adjusted_score}
            for s in scores.scalars().all()
        ],
        "reports": [
            {"id": str(r.id), "report_json": r.report_json, "version": r.version, "created_at": r.created_at.isoformat()}
            for r in reports.scalars().all()
        ],
    }


@router.post("/delete")
async def delete_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all user data (PDPL erasure right)."""
    # Log the deletion event before deleting
    audit = AuditEvent(
        actor_id=user.id,
        event_type="user_data_deletion",
        object_id=str(user.id),
        metadata_json={"email": user.email},
    )
    db.add(audit)

    await db.execute(delete(PathwayScore).where(PathwayScore.user_id == user.id))
    await db.execute(delete(Report).where(Report.user_id == user.id))
    await db.execute(delete(Evidence).where(Evidence.user_id == user.id))
    await db.execute(delete(Answer).where(Answer.user_id == user.id))
    await db.delete(user)
    await db.commit()

    return {"detail": "All user data has been deleted"}


@router.post("/withdraw-consent")
async def withdraw_consent(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Withdraw processing consent."""
    user.consent_processing = False
    user.consent_anonymized = False

    audit = AuditEvent(
        actor_id=user.id,
        event_type="consent_withdrawn",
        object_id=str(user.id),
    )
    db.add(audit)
    await db.commit()

    return {"detail": "Consent withdrawn. Processing paused."}

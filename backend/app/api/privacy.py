from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer, Evidence
from app.models.pathway import PathwayScore
from app.models.report import Report, AnalysisReport
from app.models.audit import AuditEvent
from app.models.coach import CoachMessage, CoachGoal
from app.models.action_plan import ActionStep
from app.models.advisor import Booking
from app.models.payment import Payment, Subscription
from app.models.activity import ActivityEvent
from app.models.promo import PromoRedemption
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
    analysis = await db.execute(select(AnalysisReport).where(AnalysisReport.user_id == user.id))
    coach_msgs = await db.execute(select(CoachMessage).where(CoachMessage.user_id == user.id).order_by(CoachMessage.created_at))
    goals = await db.execute(select(CoachGoal).where(CoachGoal.user_id == user.id))
    steps = await db.execute(select(ActionStep).where(ActionStep.user_id == user.id))
    bookings = await db.execute(select(Booking).where(Booking.user_id == user.id))
    sub = await db.execute(select(Subscription).where(Subscription.user_id == user.id))

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
        "analysis_reports": [
            {"id": str(r.id), "created_at": r.created_at.isoformat()}
            for r in analysis.scalars().all()
        ],
        "coach_messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in coach_msgs.scalars().all()
        ],
        "coach_goals": [
            {"title": g.title, "completed": g.completed, "target_date": g.target_date, "created_at": g.created_at.isoformat()}
            for g in goals.scalars().all()
        ],
        "action_steps": [
            {"title": s.title, "status": s.status, "category": s.category}
            for s in steps.scalars().all()
        ],
        "bookings": [
            {"advisor_id": str(b.advisor_id), "date": b.date, "start_time": b.start_time, "status": b.status}
            for b in bookings.scalars().all()
        ],
        "subscription": [
            {"plan": s.plan, "is_active": s.is_active, "activated_at": s.activated_at.isoformat() if s.activated_at else None}
            for s in sub.scalars().all()
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

    # Delete all user-owned data across every table
    await db.execute(delete(CoachMessage).where(CoachMessage.user_id == user.id))
    await db.execute(delete(CoachGoal).where(CoachGoal.user_id == user.id))
    await db.execute(delete(ActionStep).where(ActionStep.user_id == user.id))
    await db.execute(delete(Booking).where(Booking.user_id == user.id))
    await db.execute(delete(AnalysisReport).where(AnalysisReport.user_id == user.id))
    await db.execute(delete(PathwayScore).where(PathwayScore.user_id == user.id))
    await db.execute(delete(Report).where(Report.user_id == user.id))
    await db.execute(delete(Evidence).where(Evidence.user_id == user.id))
    await db.execute(delete(Answer).where(Answer.user_id == user.id))
    await db.execute(delete(Payment).where(Payment.user_id == user.id))
    await db.execute(delete(Subscription).where(Subscription.user_id == user.id))
    await db.execute(delete(ActivityEvent).where(ActivityEvent.user_id == user.id))
    await db.execute(delete(PromoRedemption).where(PromoRedemption.user_id == user.id))
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

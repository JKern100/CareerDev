"""Admin API endpoints for managing users, questions, and viewing app stats."""

import csv
import hmac
import logging
import io
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole, UserNote, EmailLog, EmailTemplate
from app.models.email_event import EmailEvent
from app.models.questionnaire import Answer, Question, Evidence
from app.models.report import Report, AnalysisReport
from app.models.pathway import PathwayScore
from app.models.activity import ActivityEvent
from app.models.coach import CoachMessage, CoachGoal
from app.models.action_plan import ActionStep
from app.models.advisor import Advisor, AvailabilitySlot, Booking
from app.models.payment import Payment, Subscription
from app.models.promo import PromoRedemption
from app.models.hook import HookEvent
from app.api.deps import get_admin_user
from app.services.auth import hash_password, create_access_token
from app.services.activity import log_activity
from app.services.routing import TIER1_QUESTION_IDS
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: str
    questionnaire_completed: bool
    current_module: str | None
    can_regenerate: bool
    can_regenerate_summary: bool
    answers_count: int
    reports_count: int
    has_analysis_report: bool
    last_login_at: datetime | None
    last_active_at: datetime | None
    is_online: bool
    login_count: int
    created_at: datetime
    coach_message_count: int
    last_emailed_at: datetime | None
    last_email_type: str | None
    plan: str
    is_premium: bool


class AdminUserUpdate(BaseModel):
    role: str | None = None
    full_name: str | None = None
    questionnaire_completed: bool | None = None
    can_regenerate: bool | None = None
    can_regenerate_summary: bool | None = None
    new_password: str | None = None


class DashboardStats(BaseModel):
    total_users: int
    users_online: int
    users_completed_tier1: int
    users_completed_questionnaire: int
    users_with_reports: int
    total_answers: int
    total_reports: int
    users_last_7_days: int
    users_last_30_days: int
    completion_rate: float
    avg_answers_per_user: float
    # Runs of the ungated 60-second assessment at /start. Anonymous and
    # account-free, so it sits outside every user-based metric above.
    assessments_run: int


class LoginDigest(BaseModel):
    """Activity since the admin was last logged in. Counts are 0 on first login."""
    since: datetime | None
    new_users: int
    quick_assessment_starts: int  # gated Tier 1 (signed-in) starts
    assessments_run: int          # runs of the anonymous 60-second assessment (/start)


VALID_QUESTION_TYPES = [
    "single_select", "multi_select", "likert_1_5", "slider_0_10",
    "numeric", "text_short", "text_long", "file_upload",
]


class QuestionOut(BaseModel):
    question_id: str
    module: str
    prompt: str
    question_type: str
    required: bool
    options_json: list | None
    min_val: float | None
    max_val: float | None
    tags_json: list | None
    order: int = 0

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    question_id: str
    module: str
    prompt: str
    question_type: str
    required: bool = True
    options_json: list | None = None
    min_val: float | None = None
    max_val: float | None = None
    tags_json: list | None = None


class QuestionUpdate(BaseModel):
    prompt: str | None = None
    module: str | None = None
    question_type: str | None = None
    required: bool | None = None
    options_json: list | None = None
    min_val: float | None = None
    max_val: float | None = None
    tags_json: list | None = None


class QuestionReorder(BaseModel):
    question_id: str
    direction: str  # "up" or "down"


class UserAnswerOut(BaseModel):
    question_id: str
    value: str | int | list | None
    confidence: int
    created_at: datetime | None

    model_config = {"from_attributes": True}


# ── Dashboard ────────────────────────────────────────────────────────────

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    online_threshold = now - timedelta(minutes=5)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    users_online = (await db.execute(
        select(func.count(User.id)).where(User.last_active_at >= online_threshold)
    )).scalar() or 0

    completed = (await db.execute(
        select(func.count(User.id)).where(User.questionnaire_completed == True)
    )).scalar() or 0

    # Free Tier 1 completions: users who have answered all Tier 1 questions.
    # Tier 1 completion is derived from answers (no stored flag), so count
    # users whose distinct answered Tier 1 question IDs covers the full set.
    tier1_done_sub = (
        select(Answer.user_id)
        .where(Answer.question_id.in_(TIER1_QUESTION_IDS))
        .group_by(Answer.user_id)
        .having(func.count(func.distinct(Answer.question_id)) == len(TIER1_QUESTION_IDS))
        .subquery()
    )
    completed_tier1 = (await db.execute(
        select(func.count()).select_from(tier1_done_sub)
    )).scalar() or 0

    users_with_reports = (await db.execute(
        select(func.count(func.distinct(Report.user_id)))
    )).scalar() or 0

    total_answers = (await db.execute(select(func.count(Answer.id)))).scalar() or 0
    total_reports = (await db.execute(select(func.count(Report.id)))).scalar() or 0

    users_7d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )).scalar() or 0

    users_30d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_ago)
    )).scalar() or 0

    # 60-second assessment runs (anonymous, from the hook_events table).
    # One "started" row = one run.
    assessments_run = (await db.execute(
        select(func.count(HookEvent.id)).where(HookEvent.event == "started")
    )).scalar() or 0

    return DashboardStats(
        total_users=total_users,
        users_online=users_online,
        users_completed_tier1=completed_tier1,
        users_completed_questionnaire=completed,
        users_with_reports=users_with_reports,
        total_answers=total_answers,
        total_reports=total_reports,
        users_last_7_days=users_7d,
        users_last_30_days=users_30d,
        completion_rate=round(completed / total_users * 100, 1) if total_users > 0 else 0,
        avg_answers_per_user=round(total_answers / total_users, 1) if total_users > 0 else 0,
        assessments_run=assessments_run,
    )


@router.get("/login-digest", response_model=LoginDigest)
async def get_login_digest(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Summarise activity for a welcome popup.

    New users + gated Tier 1 starts are reported "since you were last here"
    (`previous_login_at`, captured at login before `last_login_at` is
    overwritten). The 60-second assessment runs use their own per-admin
    high-water mark instead: the first time, every run to date is reported
    (so the seeded baseline shows once); after that, only newer runs. The
    mark advances here, the moment the count is handed to the popup.
    """
    # 60-second assessment runs: unseen by THIS admin (independent of login).
    seen = admin.assessments_digest_seen_at
    runs_q = select(func.count(HookEvent.id)).where(HookEvent.event == "started")
    if seen is not None:
        runs_q = runs_q.where(HookEvent.created_at > seen)
    assessments_run = (await db.execute(runs_q)).scalar() or 0
    if assessments_run > 0:
        # Reported now → don't report these same runs again.
        admin.assessments_digest_seen_at = datetime.utcnow()

    since = admin.previous_login_at
    if since is None:
        await db.commit()
        return LoginDigest(since=None, new_users=0, quick_assessment_starts=0, assessments_run=assessments_run)

    new_users = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= since)
    )).scalar() or 0

    # People who *started* the quick (Tier 1) assessment since `since`:
    # users whose earliest Tier 1 answer falls inside the window. Using the
    # first answer (not any answer) so returning users who merely continued an
    # earlier attempt aren't counted as new triers.
    first_t1 = (
        select(
            Answer.user_id,
            func.min(Answer.created_at).label("first_at"),
        )
        .where(Answer.question_id.in_(TIER1_QUESTION_IDS))
        .group_by(Answer.user_id)
        .subquery()
    )
    quick_assessment_starts = (await db.execute(
        select(func.count()).select_from(first_t1).where(first_t1.c.first_at >= since)
    )).scalar() or 0

    await db.commit()
    return LoginDigest(
        since=since,
        new_users=new_users,
        quick_assessment_starts=quick_assessment_starts,
        assessments_run=assessments_run,
    )


# ── Users ────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Single query with subqueries instead of N+1
    answers_sub = (
        select(Answer.user_id, func.count(Answer.id).label("cnt"))
        .group_by(Answer.user_id)
        .subquery()
    )
    reports_sub = (
        select(Report.user_id, func.count(Report.id).label("cnt"))
        .group_by(Report.user_id)
        .subquery()
    )
    coach_msg_sub = (
        select(CoachMessage.user_id, func.count(CoachMessage.id).label("cnt"))
        .group_by(CoachMessage.user_id)
        .subquery()
    )
    analysis_sub = (
        select(AnalysisReport.user_id, func.count(AnalysisReport.id).label("cnt"))
        .group_by(AnalysisReport.user_id)
        .subquery()
    )

    email_log_sub = (
        select(EmailLog.user_id, func.max(EmailLog.created_at).label("last_emailed_at"))
        .where(EmailLog.status == "sent")
        .group_by(EmailLog.user_id)
        .subquery()
    )
    sub_plan_sub = (
        select(Subscription.user_id, Subscription.plan, Subscription.is_active)
        .subquery()
    )

    last_email_type_scalar = (
        select(EmailLog.email_type)
        .where(EmailLog.user_id == User.id, EmailLog.status == "sent")
        .order_by(EmailLog.created_at.desc())
        .limit(1)
        .correlate(User)
        .scalar_subquery()
        .label("last_email_type")
    )

    query = (
        select(
            User,
            func.coalesce(answers_sub.c.cnt, 0).label("answers_count"),
            func.coalesce(reports_sub.c.cnt, 0).label("reports_count"),
            func.coalesce(analysis_sub.c.cnt, 0).label("analysis_count"),
            func.coalesce(coach_msg_sub.c.cnt, 0).label("coach_message_count"),
            email_log_sub.c.last_emailed_at,
            last_email_type_scalar,
            func.coalesce(sub_plan_sub.c.plan, "free").label("user_plan"),
            func.coalesce(sub_plan_sub.c.is_active, False).label("plan_active"),
        )
        .outerjoin(answers_sub, User.id == answers_sub.c.user_id)
        .outerjoin(reports_sub, User.id == reports_sub.c.user_id)
        .outerjoin(analysis_sub, User.id == analysis_sub.c.user_id)
        .outerjoin(coach_msg_sub, User.id == coach_msg_sub.c.user_id)
        .outerjoin(email_log_sub, User.id == email_log_sub.c.user_id)
        .outerjoin(sub_plan_sub, User.id == sub_plan_sub.c.user_id)
        .order_by(User.created_at.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    now = datetime.utcnow()
    online_threshold = now - timedelta(minutes=5)

    return [
        AdminUserOut(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if hasattr(u.role, 'value') else u.role,
            questionnaire_completed=u.questionnaire_completed,
            current_module=u.current_module,
            can_regenerate=u.can_regenerate,
            can_regenerate_summary=u.can_regenerate_summary,
            answers_count=answers_count,
            reports_count=reports_count,
            has_analysis_report=analysis_count > 0,
            coach_message_count=coach_message_count,
            last_emailed_at=last_emailed_at,
            last_email_type=last_email_type,
            last_login_at=u.last_login_at,
            last_active_at=u.last_active_at,
            is_online=u.last_active_at is not None and u.last_active_at >= online_threshold,
            login_count=u.login_count or 0,
            created_at=u.created_at,
            plan=user_plan or "free",
            is_premium=bool(plan_active) and user_plan in ("pro", "premium", "monthly"),
        )
        for u, answers_count, reports_count, analysis_count, coach_message_count, last_emailed_at, last_email_type, user_plan, plan_active in rows
    ]


@router.get("/users/{user_id}", response_model=AdminUserOut)
async def get_user(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    answers_count = (await db.execute(
        select(func.count(Answer.id)).where(Answer.user_id == u.id)
    )).scalar() or 0
    reports_count = (await db.execute(
        select(func.count(Report.id)).where(Report.user_id == u.id)
    )).scalar() or 0
    has_analysis = (await db.execute(
        select(func.count(AnalysisReport.id)).where(AnalysisReport.user_id == u.id)
    )).scalar() or 0
    coach_msg_count = (await db.execute(
        select(func.count(CoachMessage.id)).where(CoachMessage.user_id == u.id)
    )).scalar() or 0

    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == u.id))
    sub = sub_result.scalars().first()

    last_email_row = (await db.execute(
        select(EmailLog.created_at, EmailLog.email_type)
        .where(EmailLog.user_id == u.id, EmailLog.status == "sent")
        .order_by(EmailLog.created_at.desc())
        .limit(1)
    )).first()

    now = datetime.utcnow()
    online_threshold = now - timedelta(minutes=5)

    return AdminUserOut(
        id=str(u.id),
        email=u.email,
        full_name=u.full_name,
        role=u.role.value if hasattr(u.role, 'value') else u.role,
        questionnaire_completed=u.questionnaire_completed,
        current_module=u.current_module,
        can_regenerate=u.can_regenerate,
        can_regenerate_summary=u.can_regenerate_summary,
        answers_count=answers_count,
        reports_count=reports_count,
        has_analysis_report=has_analysis > 0,
        coach_message_count=coach_msg_count,
        last_emailed_at=last_email_row[0] if last_email_row else None,
        last_email_type=last_email_row[1] if last_email_row else None,
        last_login_at=u.last_login_at,
        last_active_at=u.last_active_at,
        is_online=u.last_active_at is not None and u.last_active_at >= online_threshold,
        login_count=u.login_count or 0,
        created_at=u.created_at,
        plan=sub.plan if sub else "free",
        is_premium=bool(sub and sub.is_active and sub.plan in ("pro", "premium", "monthly")),
    )


@router.patch("/users/{user_id}")
async def update_user(
    user_id: UUID,
    data: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if data.role is not None:
        try:
            u.role = UserRole(data.role)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {data.role}")
    if data.full_name is not None:
        u.full_name = data.full_name
    if data.questionnaire_completed is not None:
        u.questionnaire_completed = data.questionnaire_completed
    if data.can_regenerate is not None:
        u.can_regenerate = data.can_regenerate
    if data.can_regenerate_summary is not None:
        u.can_regenerate_summary = data.can_regenerate_summary
    if data.new_password is not None:
        u.hashed_password = hash_password(data.new_password)

    # Audit log for admin user modifications
    changes = []
    if data.role is not None:
        changes.append(f"role={data.role}")
    if data.new_password is not None:
        changes.append("password_reset")
    if changes:
        await log_activity(db, admin, "admin_update_user", f"Updated {u.email}: {', '.join(changes)}")

    await db.commit()
    return {"detail": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if str(u.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    # Audit log before deletion
    await log_activity(db, admin, "admin_delete_user", f"Deleted user {u.email} ({u.id})")

    # Delete related data — order matters for foreign key constraints
    # 1. Advisor-related (AvailabilitySlot → Advisor, Booking → Advisor)
    advisor_result = await db.execute(select(Advisor.id).where(Advisor.user_id == u.id))
    advisor_row = advisor_result.scalar_one_or_none()
    if advisor_row:
        await db.execute(delete(AvailabilitySlot).where(AvailabilitySlot.advisor_id == advisor_row))
        await db.execute(delete(Booking).where(Booking.advisor_id == advisor_row))
        await db.execute(delete(Advisor).where(Advisor.user_id == u.id))

    # 2. Bookings where user is the booker (not advisor)
    await db.execute(delete(Booking).where(Booking.user_id == u.id))

    # 3. Coach data
    await db.execute(delete(CoachMessage).where(CoachMessage.user_id == u.id))
    await db.execute(delete(CoachGoal).where(CoachGoal.user_id == u.id))

    # 4. Action plan, payments, promo
    await db.execute(delete(ActionStep).where(ActionStep.user_id == u.id))
    await db.execute(delete(Payment).where(Payment.user_id == u.id))
    await db.execute(delete(Subscription).where(Subscription.user_id == u.id))
    await db.execute(delete(PromoRedemption).where(PromoRedemption.user_id == u.id))

    # 5. Questionnaire and reports
    await db.execute(delete(AnalysisReport).where(AnalysisReport.user_id == u.id))
    await db.execute(delete(PathwayScore).where(PathwayScore.user_id == u.id))
    await db.execute(delete(Report).where(Report.user_id == u.id))
    await db.execute(delete(Evidence).where(Evidence.user_id == u.id))
    await db.execute(delete(Answer).where(Answer.user_id == u.id))

    # 6. Nullify referral references pointing to this user
    from sqlalchemy import update
    await db.execute(update(User).where(User.referred_by == u.id).values(referred_by=None))

    # 7. Activity log and user
    await db.execute(delete(ActivityEvent).where(ActivityEvent.user_id == u.id))
    await db.delete(u)
    await db.commit()
    return {"detail": "User deleted"}


@router.get("/users/{user_id}/answers", response_model=list[UserAnswerOut])
async def get_user_answers(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Answer).where(Answer.user_id == user_id).order_by(Answer.question_id)
    )
    answers = result.scalars().all()
    return [
        UserAnswerOut(
            question_id=a.question_id,
            value=a.value_json.get("value") if a.value_json else None,
            confidence=a.confidence,
            created_at=a.created_at if hasattr(a, "created_at") else None,
        )
        for a in answers
    ]


@router.delete("/users/{user_id}/answers")
async def reset_user_answers(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all questionnaire answers for a user and reset their progress."""
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    deleted = (await db.execute(
        select(func.count(Answer.id)).where(Answer.user_id == u.id)
    )).scalar() or 0

    await db.execute(delete(Answer).where(Answer.user_id == u.id))
    await db.execute(delete(Report).where(Report.user_id == u.id))
    await db.execute(delete(AnalysisReport).where(AnalysisReport.user_id == u.id))
    await db.execute(delete(PathwayScore).where(PathwayScore.user_id == u.id))

    u.questionnaire_completed = False
    u.current_module = None

    await db.commit()
    return {"detail": f"Reset complete: {deleted} answers deleted, questionnaire progress cleared"}


# ── Questions ────────────────────────────────────────────────────────────

@router.get("/questions", response_model=list[QuestionOut])
async def list_questions(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Question).order_by(Question.module, Question.order, Question.id)
    )
    questions = result.scalars().all()
    return [
        QuestionOut(
            question_id=q.id,
            module=q.module,
            prompt=q.prompt,
            question_type=q.question_type,
            required=q.required,
            options_json=q.options_json,
            min_val=q.min_val,
            max_val=q.max_val,
            tags_json=q.tags_json if isinstance(q.tags_json, list) else None,
            order=q.order or 0,
        )
        for q in questions
    ]


@router.post("/questions", response_model=QuestionOut)
async def create_question(
    data: QuestionCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Question).where(Question.id == data.question_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Question ID '{data.question_id}' already exists")

    if data.question_type not in VALID_QUESTION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid question type. Must be one of: {', '.join(VALID_QUESTION_TYPES)}",
        )

    # Place new question at the end of its module
    max_order = (await db.execute(
        select(func.max(Question.order)).where(Question.module == data.module)
    )).scalar() or 0

    q = Question(
        id=data.question_id,
        module=data.module,
        prompt=data.prompt,
        question_type=data.question_type,
        required=data.required,
        options_json=data.options_json,
        min_val=data.min_val,
        max_val=data.max_val,
        tags_json=data.tags_json,
        order=max_order + 1,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)

    return QuestionOut(
        question_id=q.id,
        module=q.module,
        prompt=q.prompt,
        question_type=q.question_type,
        required=q.required,
        options_json=q.options_json,
        min_val=q.min_val,
        max_val=q.max_val,
        tags_json=q.tags_json if isinstance(q.tags_json, list) else None,
        order=q.order or 0,
    )


@router.patch("/questions/{question_id}")
async def update_question(
    question_id: str,
    data: QuestionUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if data.question_type is not None and data.question_type not in VALID_QUESTION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid question type. Must be one of: {', '.join(VALID_QUESTION_TYPES)}",
        )

    if data.prompt is not None:
        q.prompt = data.prompt
    if data.module is not None:
        q.module = data.module
    if data.question_type is not None:
        q.question_type = data.question_type
    if data.required is not None:
        q.required = data.required
    if data.options_json is not None:
        q.options_json = data.options_json
    if data.min_val is not None:
        q.min_val = data.min_val
    if data.max_val is not None:
        q.max_val = data.max_val
    if data.tags_json is not None:
        q.tags_json = data.tags_json

    await db.commit()
    return {"detail": "Question updated"}


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if any answers reference this question
    answer_count = (await db.execute(
        select(func.count(Answer.id)).where(Answer.question_id == question_id)
    )).scalar() or 0

    if answer_count > 0:
        # Delete associated answers first
        await db.execute(delete(Answer).where(Answer.question_id == question_id))

    await db.delete(q)
    await db.commit()
    return {"detail": f"Question {question_id} deleted" + (f" (along with {answer_count} answers)" if answer_count else "")}


@router.post("/questions/reorder")
async def reorder_question(
    data: QuestionReorder,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == data.question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if data.direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Direction must be 'up' or 'down'")

    # Get all questions in the same module sorted by order
    module_result = await db.execute(
        select(Question)
        .where(Question.module == q.module)
        .order_by(Question.order, Question.id)
    )
    module_questions = list(module_result.scalars().all())

    # Find current index
    current_idx = next((i for i, mq in enumerate(module_questions) if mq.id == q.id), None)
    if current_idx is None:
        raise HTTPException(status_code=500, detail="Question not found in module")

    if data.direction == "up" and current_idx == 0:
        return {"detail": "Already at top"}
    if data.direction == "down" and current_idx == len(module_questions) - 1:
        return {"detail": "Already at bottom"}

    # Swap with neighbor in the list
    swap_idx = current_idx - 1 if data.direction == "up" else current_idx + 1
    module_questions[current_idx], module_questions[swap_idx] = module_questions[swap_idx], module_questions[current_idx]

    # Reassign sequential order values to avoid gaps/duplicates
    for i, mq in enumerate(module_questions):
        mq.order = i + 1

    await db.commit()
    return {"detail": f"Question moved {data.direction}"}


# ── Promote user to admin (utility) ─────────────────────────────────────

@router.post("/promote/{user_id}")
async def promote_to_admin(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.role = UserRole.ADMIN
    await db.commit()
    return {"detail": f"{u.email} promoted to admin"}


# ── One-time setup: promote by email + secret key ────────────────────────

class AdminSetupRequest(BaseModel):
    email: str
    secret_key: str


@router.post("/setup")
async def admin_setup(
    data: AdminSetupRequest,
    db: AsyncSession = Depends(get_db),
):
    """One-time endpoint to create the first admin. Requires SECRET_KEY.
    Disabled once any admin exists."""
    # Block if any admin already exists
    existing = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.ADMIN)
    )).scalar() or 0
    if existing > 0:
        raise HTTPException(status_code=403, detail="Admin already exists. Use an existing admin to promote users.")

    if not hmac.compare_digest(data.secret_key, settings.SECRET_KEY):
        raise HTTPException(status_code=403, detail="Invalid secret key")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = UserRole.ADMIN
    await db.commit()
    return {"detail": f"{user.email} is now an admin"}


# ── Impersonate user ──────────────────────────────────────────────────

@router.post("/impersonate/{user_id}")
async def impersonate_user(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a token to log in as another user. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Audit log: record who impersonated whom
    await log_activity(db, admin, "admin_impersonate", f"Impersonated {target.email} ({target.id})")
    await db.commit()

    token = create_access_token(data={"sub": str(target.id), "imp": True})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_email": target.email,
        "user_name": target.full_name,
    }


# ── User Report Viewer ──────────────────────────────────────────────

class AdminAnalysisReportOut(BaseModel):
    markdown_report: str
    model_name: str
    created_at: datetime


@router.get("/users/{user_id}/report", response_model=AdminAnalysisReportOut)
async def get_user_report(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the AI-generated career analysis report for a user."""
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.user_id == user_id)
        .order_by(AnalysisReport.created_at.desc())
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="No analysis report found for this user")

    return AdminAnalysisReportOut(
        markdown_report=report.markdown_report,
        model_name=report.model_name,
        created_at=report.created_at,
    )


# ── Activity Log ────────────────────────────────────────────────────

class ActivityEventOut(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_role: str
    action: str
    detail: str | None
    created_at: datetime


@router.get("/activity", response_model=list[ActivityEventOut])
async def get_activity(
    role: str | None = None,
    action: str | None = None,
    days: int = 30,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity events with optional filters."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = select(ActivityEvent).where(ActivityEvent.created_at >= cutoff)

    if role:
        query = query.where(ActivityEvent.user_role == role)
    if action:
        query = query.where(ActivityEvent.action == action)

    query = query.order_by(ActivityEvent.created_at.desc()).limit(500)

    result = await db.execute(query)
    events = result.scalars().all()

    return [
        ActivityEventOut(
            id=str(e.id),
            user_id=str(e.user_id),
            user_email=e.user_email,
            user_role=e.user_role,
            action=e.action,
            detail=e.detail,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.get("/users/{user_id}/activity", response_model=list[ActivityEventOut])
async def get_user_activity(
    user_id: UUID,
    action: str | None = None,
    days: int = 90,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity events for a specific user."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = (
        select(ActivityEvent)
        .where(ActivityEvent.user_id == user_id, ActivityEvent.created_at >= cutoff)
    )
    if action:
        query = query.where(ActivityEvent.action == action)

    query = query.order_by(ActivityEvent.created_at.asc()).limit(1000)

    result = await db.execute(query)
    events = result.scalars().all()

    return [
        ActivityEventOut(
            id=str(e.id),
            user_id=str(e.user_id),
            user_email=e.user_email,
            user_role=e.user_role,
            action=e.action,
            detail=e.detail,
            created_at=e.created_at,
        )
        for e in events
    ]


# ── Coach Usage Analytics ───────────────────────────────────────────────


class CoachUsageOverview(BaseModel):
    total_messages: int
    total_user_messages: int
    total_assistant_messages: int
    unique_users: int
    messages_today: int
    messages_7d: int
    messages_30d: int
    avg_messages_per_user: float
    top_users: list[dict]


class CoachUserUsage(BaseModel):
    user_id: str
    user_email: str
    total_messages: int
    user_messages: int
    assistant_messages: int
    first_message_at: datetime | None
    last_message_at: datetime | None
    messages_today: int
    messages_7d: int


@router.get("/coach-usage", response_model=CoachUsageOverview)
async def get_coach_usage(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get overall AI coach usage analytics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_result = await db.execute(select(func.count()).select_from(CoachMessage))
    total_messages = total_result.scalar() or 0

    user_msgs_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(CoachMessage.role == "user")
    )
    total_user_messages = user_msgs_result.scalar() or 0
    total_assistant_messages = total_messages - total_user_messages

    unique_result = await db.execute(
        select(func.count(func.distinct(CoachMessage.user_id))).select_from(CoachMessage)
    )
    unique_users = unique_result.scalar() or 0

    today_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(CoachMessage.created_at >= today_start)
    )
    messages_today = today_result.scalar() or 0

    week_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(CoachMessage.created_at >= week_ago)
    )
    messages_7d = week_result.scalar() or 0

    month_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(CoachMessage.created_at >= month_ago)
    )
    messages_30d = month_result.scalar() or 0

    avg_per_user = round(total_user_messages / unique_users, 1) if unique_users > 0 else 0.0

    top_query = (
        select(
            CoachMessage.user_id,
            User.email,
            func.count().label("msg_count"),
        )
        .join(User, CoachMessage.user_id == User.id)
        .where(CoachMessage.role == "user")
        .group_by(CoachMessage.user_id, User.email)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_result = await db.execute(top_query)
    top_users = [
        {"user_id": str(row.user_id), "email": row.email, "messages": row.msg_count}
        for row in top_result.all()
    ]

    return CoachUsageOverview(
        total_messages=total_messages,
        total_user_messages=total_user_messages,
        total_assistant_messages=total_assistant_messages,
        unique_users=unique_users,
        messages_today=messages_today,
        messages_7d=messages_7d,
        messages_30d=messages_30d,
        avg_messages_per_user=avg_per_user,
        top_users=top_users,
    )


@router.get("/coach-usage/{user_id}", response_model=CoachUserUsage)
async def get_coach_user_usage(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI coach usage for a specific user."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(CoachMessage.user_id == user_id)
    )
    total = total_result.scalar() or 0

    user_msg_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(
            CoachMessage.user_id == user_id, CoachMessage.role == "user"
        )
    )
    user_msgs = user_msg_result.scalar() or 0

    first_result = await db.execute(
        select(func.min(CoachMessage.created_at)).where(CoachMessage.user_id == user_id)
    )
    first_at = first_result.scalar()

    last_result = await db.execute(
        select(func.max(CoachMessage.created_at)).where(CoachMessage.user_id == user_id)
    )
    last_at = last_result.scalar()

    today_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(
            CoachMessage.user_id == user_id,
            CoachMessage.role == "user",
            CoachMessage.created_at >= today_start,
        )
    )
    today_count = today_result.scalar() or 0

    week_result = await db.execute(
        select(func.count()).select_from(CoachMessage).where(
            CoachMessage.user_id == user_id,
            CoachMessage.role == "user",
            CoachMessage.created_at >= week_ago,
        )
    )
    week_count = week_result.scalar() or 0

    return CoachUserUsage(
        user_id=str(user_id),
        user_email=target_user.email,
        total_messages=total,
        user_messages=user_msgs,
        assistant_messages=total - user_msgs,
        first_message_at=first_at,
        last_message_at=last_at,
        messages_today=today_count,
        messages_7d=week_count,
    )


# ─── AI Resources ────────────────────────────────────────────────────

RESOURCES_DIR = Path(__file__).parent.parent / "data" / "resources"
PATHWAYS_PATH = Path(__file__).parent.parent / "data" / "pathways.json"

# Metadata about each resource — label and where it's used
from app.services.career_analysis import RESOURCE_FILES as ANALYSIS_RESOURCE_FILES

RESOURCE_METADATA: dict[str, dict] = {}
for _fname, _header in ANALYSIS_RESOURCE_FILES:
    RESOURCE_METADATA[_fname] = {
        "label": _header,
        "used_by": "career_analysis",
    }
# Extra files not in the RESOURCE_FILES list but still relevant
RESOURCE_METADATA["resource_0_index.md"] = {
    "label": "Resource Index & Assembly Guide",
    "used_by": "reference",
}
RESOURCE_METADATA["resource_14_master_system_prompt.md"] = {
    "label": "Master System Prompt Template",
    "used_by": "reference",
}


class ResourceListItem(BaseModel):
    filename: str
    label: str
    used_by: str
    size_bytes: int
    word_count: int


class ResourceContent(BaseModel):
    filename: str
    label: str
    used_by: str
    content: str
    size_bytes: int
    word_count: int


class ResourceUpdateIn(BaseModel):
    content: str


class ResourceUpdateOut(BaseModel):
    filename: str
    size_bytes: int
    word_count: int
    cache_cleared: bool


@router.get("/resources", response_model=list[ResourceListItem])
async def list_resources(admin: User = Depends(get_admin_user)):
    """List all AI resource files with metadata."""
    items = []
    for fname in sorted(RESOURCES_DIR.iterdir()):
        if not fname.name.endswith(".md"):
            continue
        content = fname.read_text(encoding="utf-8")
        meta = RESOURCE_METADATA.get(fname.name, {
            "label": fname.name,
            "used_by": "unknown",
        })
        items.append(ResourceListItem(
            filename=fname.name,
            label=meta["label"],
            used_by=meta["used_by"],
            size_bytes=len(content.encode("utf-8")),
            word_count=len(content.split()),
        ))

    # Also include pathways.json
    if PATHWAYS_PATH.exists():
        pj = PATHWAYS_PATH.read_text(encoding="utf-8")
        items.append(ResourceListItem(
            filename="pathways.json",
            label="Career Pathways Definitions",
            used_by="career_analysis + scoring",
            size_bytes=len(pj.encode("utf-8")),
            word_count=len(pj.split()),
        ))

    return items


@router.get("/resources/{filename}", response_model=ResourceContent)
async def get_resource(filename: str, admin: User = Depends(get_admin_user)):
    """Get the full content of a resource file."""
    if filename == "pathways.json":
        path = PATHWAYS_PATH
    else:
        # Prevent path traversal
        if "/" in filename or "\\" in filename or ".." in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        path = RESOURCES_DIR / filename

    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Resource not found: {filename}")

    content = path.read_text(encoding="utf-8")
    meta = RESOURCE_METADATA.get(filename, {
        "label": filename,
        "used_by": "career_analysis" if filename == "pathways.json" else "unknown",
    })

    return ResourceContent(
        filename=filename,
        label=meta["label"],
        used_by=meta["used_by"],
        content=content,
        size_bytes=len(content.encode("utf-8")),
        word_count=len(content.split()),
    )


@router.put("/resources/{filename}", response_model=ResourceUpdateOut)
async def update_resource(
    filename: str,
    data: ResourceUpdateIn,
    admin: User = Depends(get_admin_user),
):
    """Update a resource file and clear the cached system prompt."""
    if filename == "pathways.json":
        path = PATHWAYS_PATH
        # Validate JSON
        try:
            json.loads(data.content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")
    else:
        if "/" in filename or "\\" in filename or ".." in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        path = RESOURCES_DIR / filename

    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Resource not found: {filename}")

    path.write_text(data.content, encoding="utf-8")

    # Clear the cached system prompt so the next analysis uses the updated resource
    import app.services.career_analysis as ca
    ca._cached_system_prompt = None
    cache_cleared = True

    return ResourceUpdateOut(
        filename=filename,
        size_bytes=len(data.content.encode("utf-8")),
        word_count=len(data.content.split()),
        cache_cleared=cache_cleared,
    )


# ---------------------------------------------------------------------------
# User feedback notes
# ---------------------------------------------------------------------------

class NoteIn(BaseModel):
    content: str

class NoteOut(BaseModel):
    id: str
    content: str
    author_name: str
    created_at: str


@router.get("/users/{user_id}/notes", response_model=list[NoteOut])
async def get_user_notes(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List all admin notes for a user, newest first."""
    result = await db.execute(
        select(UserNote, User.full_name)
        .join(User, UserNote.author_id == User.id)
        .where(UserNote.user_id == user_id)
        .order_by(UserNote.created_at.desc())
    )
    return [
        NoteOut(
            id=str(note.id),
            content=note.content,
            author_name=author_name or "Admin",
            created_at=note.created_at.isoformat() if note.created_at else "",
        )
        for note, author_name in result.all()
    ]


@router.post("/users/{user_id}/notes", response_model=NoteOut)
async def add_user_note(
    user_id: uuid.UUID,
    data: NoteIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Add a feedback note to a user."""
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty")
    note = UserNote(
        user_id=user_id,
        author_id=admin.id,
        content=data.content.strip(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return NoteOut(
        id=str(note.id),
        content=note.content,
        author_name=admin.full_name or "Admin",
        created_at=note.created_at.isoformat() if note.created_at else "",
    )


@router.delete("/notes/{note_id}")
async def delete_user_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete a feedback note."""
    result = await db.execute(select(UserNote).where(UserNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
    return {"ok": True}


# ── Subscription Management ────────────────────────────────────────────


class ActivatePlanRequest(BaseModel):
    plan: str = "pro"


@router.post("/users/{user_id}/activate-plan")
async def admin_activate_plan(
    user_id: UUID,
    data: ActivatePlanRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually activate a user's plan (e.g. when webhook missed them)."""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        u = result.scalar_one_or_none()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")

        result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
        sub = result.scalars().first()
        if not sub:
            sub = Subscription(user_id=user_id, plan="free", is_active=False)
            db.add(sub)

        sub.plan = data.plan
        sub.is_active = True
        sub.activated_at = datetime.utcnow()
        sub.cancelled_at = None
        await log_activity(db, admin, "admin_activate_plan", f"Activated {data.plan} for {u.email}")
        await db.commit()
        return {"detail": f"Activated {data.plan} for {u.email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("admin_activate_plan failed for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail=f"Activate failed: {e}")


@router.post("/users/{user_id}/revoke-plan")
async def admin_revoke_plan(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a user's plan (e.g. after a refund)."""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        u = result.scalar_one_or_none()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")

        result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
        sub = result.scalars().first()
        if not sub or sub.plan == "free":
            raise HTTPException(status_code=400, detail="User is already on the free plan")

        sub.plan = "free"
        sub.is_active = False
        sub.cancelled_at = datetime.utcnow()
        await log_activity(db, admin, "admin_revoke_plan", f"Revoked plan for {u.email}")
        await db.commit()
        return {"detail": f"Revoked plan for {u.email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("admin_revoke_plan failed for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail=f"Revoke failed: {e}")


@router.get("/users/{user_id}/subscription")
async def admin_get_user_subscription(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """View a user's subscription details for diagnostics."""
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    sub = result.scalars().first()

    result = await db.execute(
        select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    return {
        "user_email": u.email,
        "subscription": {
            "plan": sub.plan if sub else "free",
            "is_active": sub.is_active if sub else False,
            "paddle_subscription_id": sub.paddle_subscription_id if sub else None,
            "paddle_customer_id": sub.paddle_customer_id if sub else None,
            "paddle_transaction_id": sub.paddle_transaction_id if sub else None,
            "activated_at": sub.activated_at.isoformat() if sub and sub.activated_at else None,
            "expires_at": sub.expires_at.isoformat() if sub and sub.expires_at else None,
            "cancelled_at": sub.cancelled_at.isoformat() if sub and sub.cancelled_at else None,
        } if sub else None,
        "payments": [
            {
                "id": str(p.id),
                "plan": p.plan,
                "amount_cents": p.amount_cents,
                "currency": p.currency,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ],
    }


# ── Email Log ────────────────────────────────────────────────────────────

@router.get("/email-logs")
async def get_email_logs(
    email_type: str | None = None,
    status: str | None = None,
    days: int = 30,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    q = select(EmailLog).where(EmailLog.created_at >= cutoff)
    if email_type:
        q = q.where(EmailLog.email_type == email_type)
    if status:
        q = q.where(EmailLog.status == status)
    q = q.order_by(EmailLog.created_at.desc()).limit(limit)

    result = await db.execute(q)
    logs = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "to_email": e.to_email,
            "user_id": str(e.user_id) if e.user_id else None,
            "subject": e.subject,
            "email_type": e.email_type,
            "status": e.status,
            "error_detail": e.error_detail,
            "resend_id": e.resend_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in logs
    ]


# ── Custom Email Engagement (open/click tracking) ────────────────────────

@router.get("/custom-email-engagement")
async def get_custom_email_engagement(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Open/click engagement for custom broadcast emails.

    Groups custom EmailLog rows by subject into "campaigns", then joins the
    Resend webhook events (email_events) by resend_id — the same tracking
    pipeline that powers the newsletter engagement view. Counts are per unique
    recipient, so multiple opens by one person count once.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    q = (
        select(EmailLog)
        .where(
            EmailLog.email_type == "custom",
            EmailLog.status == "sent",
            EmailLog.resend_id.isnot(None),
            EmailLog.created_at >= cutoff,
        )
        .order_by(EmailLog.created_at.asc())
    )
    logs = (await db.execute(q)).scalars().all()

    tracking_configured = bool(settings.RESEND_WEBHOOK_SECRET.strip())
    if not logs:
        return {"tracking_configured": tracking_configured, "campaigns": []}

    # resend_id -> (subject, email) for applying events back to recipients.
    rid_info: dict[str, tuple[str, str]] = {
        log.resend_id: (log.subject, log.to_email) for log in logs
    }
    resend_ids = list(rid_info.keys())

    def _blank(email: str) -> dict:
        return {
            "email": email, "delivered_at": None, "first_opened_at": None,
            "open_count": 0, "first_clicked_at": None, "click_count": 0,
            "clicked_urls": [], "bounced_at": None, "complained_at": None,
        }

    # Build campaigns (grouped by subject) and seed every recipient.
    campaigns: dict[str, dict] = {}
    for log in logs:
        camp = campaigns.setdefault(log.subject, {
            "subject": log.subject,
            "first_sent_at": log.created_at,
            "last_sent_at": log.created_at,
            "recipients": {},
        })
        if log.created_at and log.created_at < camp["first_sent_at"]:
            camp["first_sent_at"] = log.created_at
        if log.created_at and log.created_at > camp["last_sent_at"]:
            camp["last_sent_at"] = log.created_at
        camp["recipients"].setdefault(log.to_email, _blank(log.to_email))

    # One event query for every send id, applied to the right recipient row.
    ev_result = await db.execute(
        select(EmailEvent.resend_id, EmailEvent.event_type, EmailEvent.event_at, EmailEvent.url)
        .where(EmailEvent.resend_id.in_(resend_ids))
        .order_by(EmailEvent.event_at.asc())
    )
    for rid, etype, event_at, url in ev_result.all():
        info = rid_info.get(rid)
        if not info:
            continue
        subject, email = info
        camp = campaigns.get(subject)
        if not camp:
            continue
        row = camp["recipients"].setdefault(email, _blank(email))
        if etype == "email.delivered" and not row["delivered_at"]:
            row["delivered_at"] = event_at
        elif etype == "email.opened":
            row["open_count"] += 1
            if not row["first_opened_at"]:
                row["first_opened_at"] = event_at
        elif etype == "email.clicked":
            row["click_count"] += 1
            if not row["first_clicked_at"]:
                row["first_clicked_at"] = event_at
            if url and url not in row["clicked_urls"]:
                row["clicked_urls"].append(url)
        elif etype == "email.bounced" and not row["bounced_at"]:
            row["bounced_at"] = event_at
        elif etype == "email.complained" and not row["complained_at"]:
            row["complained_at"] = event_at

    def _iso(dt):
        return dt.isoformat() if dt else None

    def _sort_key(r: dict):
        return (
            0 if r["first_clicked_at"] else (1 if r["first_opened_at"] else 2),
            r["email"].lower(),
        )

    out = []
    for camp in campaigns.values():
        recipients = sorted(camp["recipients"].values(), key=_sort_key)
        sent = len(recipients)
        delivered = sum(1 for r in recipients if r["delivered_at"])
        opened = sum(1 for r in recipients if r["first_opened_at"])
        clicked = sum(1 for r in recipients if r["first_clicked_at"])
        bounced = sum(1 for r in recipients if r["bounced_at"])
        denom = delivered or sent
        for r in recipients:
            for k in ("delivered_at", "first_opened_at", "first_clicked_at", "bounced_at", "complained_at"):
                r[k] = _iso(r[k])
        out.append({
            "subject": camp["subject"],
            "first_sent_at": _iso(camp["first_sent_at"]),
            "last_sent_at": _iso(camp["last_sent_at"]),
            "sent": sent,
            "delivered": delivered,
            "opened": opened,
            "clicked": clicked,
            "bounced": bounced,
            "open_rate": round(opened / denom, 4) if denom else 0.0,
            "click_rate": round(clicked / denom, 4) if denom else 0.0,
            "recipients": recipients,
        })

    out.sort(key=lambda c: c["last_sent_at"] or "", reverse=True)
    return {"tracking_configured": tracking_configured, "campaigns": out}


# ── Send Test Email / Trigger Stage 1 Email ──────────────────────────────

@router.post("/send-test-email")
async def send_test_email(
    admin: User = Depends(get_admin_user),
):
    """Send a simple test email to the admin's own address."""
    from app.services.email import _send_email, _branded_email
    body = """\
        <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Test Email</h2>
        <p>If you're reading this, your email configuration is working correctly.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 16px;">Sent from the CrewTransition admin panel.</p>"""
    html = _branded_email(body)
    ok = await _send_email(admin.email, "CrewTransition Test Email", html, "test")
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed — check RESEND_API_KEY and logs")
    return {"detail": f"Test email sent to {admin.email}"}


@router.post("/users/{user_id}/send-stage1-email")
async def send_stage1_email_for_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Manually trigger the Stage 1 results email for a user."""
    import secrets as _secrets
    from app.services.scoring import score_pathways
    from app.services.email import send_stage1_results_email

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ans_result = await db.execute(
        select(Answer).where(Answer.user_id == user.id)
    )
    answers = ans_result.scalars().all()
    if not answers:
        raise HTTPException(status_code=400, detail="User has no answers")

    answers_dict = {
        a.question_id: {
            "value": a.value_json.get("value") if a.value_json else None,
            "value_json": a.value_json,
            "confidence": a.confidence,
            "evidence_refs": a.evidence_refs,
        }
        for a in answers
    }
    scored = score_pathways(answers_dict)
    if not scored:
        raise HTTPException(status_code=400, detail="No scored pathways — user may not have enough answers")

    top = scored[0]
    match_pct = max(0, min(100, int(round(top.adjusted_score * 100))))
    if not user.unsubscribe_token:
        user.unsubscribe_token = _secrets.token_urlsafe(32)
    user.stage1_email_sent_at = datetime.utcnow()
    await db.commit()

    ok = await send_stage1_results_email(
        to_email=user.email,
        user_name=user.full_name,
        top_pathway_name=top.pathway_name,
        match_pct=match_pct,
        unsubscribe_token=user.unsubscribe_token,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Email send failed — check RESEND_API_KEY")
    return {"detail": f"Stage 1 results email sent to {user.email}"}


# ── Bulk Email ──────────────────────────────────────────────────────────


class BulkEmailRequest(BaseModel):
    user_ids: list[str]
    template: str  # "coach_invite" | "come_back" | "complete_questionnaire" | "custom"
    custom_subject: str | None = None
    custom_body: str | None = None


@router.post("/send-bulk-email")
async def send_bulk_email(
    data: BulkEmailRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a template email to multiple users."""
    import secrets as _secrets
    from app.services.email import (
        send_coach_invite_email,
        send_come_back_email,
        send_complete_questionnaire_email,
        send_stage1_results_email,
        send_custom_email,
    )
    from app.services.scoring import score_pathways

    valid_templates = ("coach_invite", "come_back", "complete_questionnaire", "stage1_results", "custom")
    if data.template not in valid_templates:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid template. Must be one of: {', '.join(valid_templates)}",
        )

    if data.template == "custom":
        if not data.custom_subject or not data.custom_body:
            raise HTTPException(
                status_code=400,
                detail="custom_subject and custom_body are required for the 'custom' template",
            )

    sent = 0
    failed = 0
    details: list[dict] = []

    for uid_str in data.user_ids:
        try:
            uid = uuid.UUID(uid_str)
        except ValueError:
            failed += 1
            details.append({"email": uid_str, "status": "failed", "error": "Invalid user ID"})
            continue

        result = await db.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            failed += 1
            details.append({"email": uid_str, "status": "failed", "error": "User not found"})
            continue

        # Ensure unsubscribe token exists
        if not user.unsubscribe_token:
            user.unsubscribe_token = _secrets.token_urlsafe(32)
            await db.commit()

        try:
            ok = False
            if data.template == "coach_invite":
                ok = await send_coach_invite_email(
                    to_email=user.email,
                    user_name=user.full_name,
                    unsubscribe_token=user.unsubscribe_token,
                )
            elif data.template == "come_back":
                now = datetime.utcnow()
                if user.last_active_at:
                    days_away = (now - user.last_active_at).days
                else:
                    days_away = (now - user.created_at).days
                ok = await send_come_back_email(
                    to_email=user.email,
                    user_name=user.full_name,
                    days_away=days_away,
                    unsubscribe_token=user.unsubscribe_token,
                )
            elif data.template == "complete_questionnaire":
                ok = await send_complete_questionnaire_email(
                    to_email=user.email,
                    user_name=user.full_name,
                    current_module=user.current_module,
                    unsubscribe_token=user.unsubscribe_token,
                )
            elif data.template == "stage1_results":
                ans_result = await db.execute(
                    select(Answer).where(Answer.user_id == user.id)
                )
                answers_dict = {
                    a.question_id: {
                        "value": a.value_json.get("value") if a.value_json else None,
                        "value_json": a.value_json,
                        "confidence": a.confidence,
                        "evidence_refs": a.evidence_refs,
                    }
                    for a in ans_result.scalars().all()
                }
                scored = score_pathways(answers_dict)
                if scored:
                    top = scored[0]
                    match_pct = max(0, min(100, int(round(top.adjusted_score * 100))))
                    ok = await send_stage1_results_email(
                        to_email=user.email,
                        user_name=user.full_name,
                        top_pathway_name=top.pathway_name,
                        match_pct=match_pct,
                        unsubscribe_token=user.unsubscribe_token,
                    )
                else:
                    ok = False
            elif data.template == "custom":
                ok = await send_custom_email(
                    to_email=user.email,
                    subject=data.custom_subject,
                    body_text=data.custom_body,
                    unsubscribe_token=user.unsubscribe_token,
                    user_name=user.full_name,
                )

            if ok:
                sent += 1
                details.append({"email": user.email, "status": "sent", "error": None})
            else:
                failed += 1
                details.append({"email": user.email, "status": "failed", "error": "Send returned false"})
        except Exception as exc:
            failed += 1
            details.append({"email": user.email, "status": "failed", "error": str(exc)[:200]})

    return {"sent": sent, "failed": failed, "details": details}


# ── Email Templates ──────────────────────────────────────────────────────

@router.get("/email-templates")
async def list_email_templates(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    from app.services.email import DEFAULT_TEMPLATES
    result = await db.execute(select(EmailTemplate))
    db_templates = {t.id: t for t in result.scalars().all()}

    out = []
    for tmpl_id, defaults in DEFAULT_TEMPLATES.items():
        db_t = db_templates.get(tmpl_id)
        out.append({
            "id": tmpl_id,
            "subject": db_t.subject if db_t else defaults["subject"],
            "body_html": db_t.body_html if db_t else defaults["body_html"],
            "is_customized": db_t is not None,
            "updated_at": db_t.updated_at.isoformat() if db_t and db_t.updated_at else None,
        })
    return out


class EmailTemplateUpdate(BaseModel):
    subject: str
    body_html: str


@router.put("/email-templates/{template_id}")
async def update_email_template(
    template_id: str,
    data: EmailTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    from app.services.email import DEFAULT_TEMPLATES
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Unknown template ID")

    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    tmpl = result.scalar_one_or_none()
    if tmpl:
        tmpl.subject = data.subject
        tmpl.body_html = data.body_html
        tmpl.updated_at = datetime.utcnow()
    else:
        db.add(EmailTemplate(
            id=template_id,
            subject=data.subject,
            body_html=data.body_html,
        ))
    await db.commit()
    return {"detail": f"Template '{template_id}' saved"}


@router.delete("/email-templates/{template_id}")
async def reset_email_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Reset a template to its default by deleting the DB override."""
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    tmpl = result.scalar_one_or_none()
    if tmpl:
        await db.delete(tmpl)
        await db.commit()
    return {"detail": f"Template '{template_id}' reset to default"}

"""Admin API endpoints for managing users, questions, and viewing app stats."""

import csv
import io
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.questionnaire import Answer, Question
from app.models.report import Report
from app.models.pathway import PathwayScore
from app.api.deps import get_admin_user
from app.services.auth import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: str
    questionnaire_completed: bool
    current_module: str | None
    answers_count: int
    reports_count: int
    created_at: datetime


class AdminUserUpdate(BaseModel):
    role: str | None = None
    full_name: str | None = None
    questionnaire_completed: bool | None = None
    new_password: str | None = None


class DashboardStats(BaseModel):
    total_users: int
    users_completed_questionnaire: int
    users_with_reports: int
    total_answers: int
    total_reports: int
    users_last_7_days: int
    users_last_30_days: int
    completion_rate: float
    avg_answers_per_user: float


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

    model_config = {"from_attributes": True}


class QuestionUpdate(BaseModel):
    prompt: str | None = None
    question_type: str | None = None
    required: bool | None = None
    options_json: list | None = None
    min_val: float | None = None
    max_val: float | None = None
    tags_json: list | None = None


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

    total_users = (await db.execute(func.count(User.id))).scalar() or 0
    completed = (await db.execute(
        select(func.count(User.id)).where(User.questionnaire_completed == True)
    )).scalar() or 0

    users_with_reports = (await db.execute(
        select(func.count(func.distinct(Report.user_id)))
    )).scalar() or 0

    total_answers = (await db.execute(func.count(Answer.id))).scalar() or 0
    total_reports = (await db.execute(func.count(Report.id))).scalar() or 0

    users_7d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )).scalar() or 0

    users_30d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_ago)
    )).scalar() or 0

    return DashboardStats(
        total_users=total_users,
        users_completed_questionnaire=completed,
        users_with_reports=users_with_reports,
        total_answers=total_answers,
        total_reports=total_reports,
        users_last_7_days=users_7d,
        users_last_30_days=users_30d,
        completion_rate=round(completed / total_users * 100, 1) if total_users > 0 else 0,
        avg_answers_per_user=round(total_answers / total_users, 1) if total_users > 0 else 0,
    )


# ── Users ────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    out = []
    for u in users:
        answers_count = (await db.execute(
            select(func.count(Answer.id)).where(Answer.user_id == u.id)
        )).scalar() or 0
        reports_count = (await db.execute(
            select(func.count(Report.id)).where(Report.user_id == u.id)
        )).scalar() or 0

        out.append(AdminUserOut(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if hasattr(u.role, 'value') else u.role,
            questionnaire_completed=u.questionnaire_completed,
            current_module=u.current_module,
            answers_count=answers_count,
            reports_count=reports_count,
            created_at=u.created_at,
        ))
    return out


@router.get("/users/{user_id}", response_model=AdminUserOut)
async def get_user(
    user_id: str,
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

    return AdminUserOut(
        id=str(u.id),
        email=u.email,
        full_name=u.full_name,
        role=u.role.value if hasattr(u.role, 'value') else u.role,
        questionnaire_completed=u.questionnaire_completed,
        current_module=u.current_module,
        answers_count=answers_count,
        reports_count=reports_count,
        created_at=u.created_at,
    )


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
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
    if data.new_password is not None:
        u.hashed_password = hash_password(data.new_password)

    await db.commit()
    return {"detail": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if str(u.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    # Delete related data
    await db.execute(delete(Answer).where(Answer.user_id == u.id))
    await db.execute(delete(Report).where(Report.user_id == u.id))
    await db.execute(delete(PathwayScore).where(PathwayScore.user_id == u.id))
    await db.delete(u)
    await db.commit()
    return {"detail": "User deleted"}


@router.get("/users/{user_id}/answers", response_model=list[UserAnswerOut])
async def get_user_answers(
    user_id: str,
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


# ── Questions ────────────────────────────────────────────────────────────

@router.get("/questions", response_model=list[QuestionOut])
async def list_questions(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).order_by(Question.id))
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
            tags_json=q.tags_json,
        )
        for q in questions
    ]


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

    if data.prompt is not None:
        q.prompt = data.prompt
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


# ── Promote user to admin (utility) ─────────────────────────────────────

@router.post("/promote/{user_id}")
async def promote_to_admin(
    user_id: str,
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

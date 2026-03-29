"""Action Plan API routes.

Subscription-gated feature: structured next steps extracted from the
career analysis, with progress tracking.
"""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.action_plan import ActionStep
from app.api.deps import get_current_user, require_premium
from app.services.action_plan import generate_action_plan
from app.services.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/action-plan", tags=["action-plan"])


# ── Schemas ──────────────────────────────────────────────────────────────

class StepOut(BaseModel):
    id: str
    pathway_id: str | None
    pathway_name: str | None
    category: str
    title: str
    description: str | None
    url: str | None
    duration: str | None
    sort_order: int
    status: str
    notes: str | None
    started_at: str | None
    completed_at: str | None


class PlanSummary(BaseModel):
    total: int
    done: int
    in_progress: int
    skipped: int
    steps: list[StepOut]


class StepUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(todo|in_progress|done|skipped)$")
    notes: str | None = None


def _step_out(s: ActionStep) -> StepOut:
    return StepOut(
        id=str(s.id),
        pathway_id=s.pathway_id,
        pathway_name=s.pathway_name,
        category=s.category,
        title=s.title,
        description=s.description,
        url=s.url,
        duration=s.duration,
        sort_order=s.sort_order,
        status=s.status,
        notes=s.notes,
        started_at=s.started_at.isoformat() if s.started_at else None,
        completed_at=s.completed_at.isoformat() if s.completed_at else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("", response_model=PlanSummary)
async def get_action_plan(
    user: User = Depends(require_premium),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's action plan with all steps."""
    result = await db.execute(
        select(ActionStep)
        .where(ActionStep.user_id == user.id)
        .order_by(ActionStep.sort_order.asc())
    )
    steps = result.scalars().all()
    return PlanSummary(
        total=len(steps),
        done=sum(1 for s in steps if s.status == "done"),
        in_progress=sum(1 for s in steps if s.status == "in_progress"),
        skipped=sum(1 for s in steps if s.status == "skipped"),
        steps=[_step_out(s) for s in steps],
    )


@router.post("/generate", response_model=PlanSummary)
async def generate_plan(
    user: User = Depends(require_premium),
    db: AsyncSession = Depends(get_db),
):
    """Generate or regenerate the action plan from the career analysis.

    Replaces any existing plan. Requires a completed career analysis.
    """
    steps = await generate_action_plan(user.id, db)
    if not steps:
        raise HTTPException(
            status_code=404,
            detail="No career analysis found. Complete the questionnaire and generate your career analysis first.",
        )
    await log_activity(db, user, "action_plan_generated", f"{len(steps)} steps")
    await db.commit()
    return PlanSummary(
        total=len(steps),
        done=0,
        in_progress=0,
        skipped=0,
        steps=[_step_out(s) for s in steps],
    )


@router.patch("/steps/{step_id}", response_model=StepOut)
async def update_step(
    step_id: str,
    data: StepUpdate,
    user: User = Depends(require_premium),
    db: AsyncSession = Depends(get_db),
):
    """Update a step's status or notes."""
    try:
        parsed_id = UUID(step_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid step ID")

    result = await db.execute(
        select(ActionStep).where(
            ActionStep.id == parsed_id,
            ActionStep.user_id == user.id,
        )
    )
    step = result.scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    if data.status is not None:
        old_status = step.status
        step.status = data.status
        if data.status == "in_progress" and old_status == "todo":
            step.started_at = datetime.utcnow()
        elif data.status == "done":
            step.completed_at = datetime.utcnow()
            if not step.started_at:
                step.started_at = datetime.utcnow()
        elif data.status == "todo":
            step.completed_at = None

    if data.notes is not None:
        step.notes = data.notes

    await db.commit()
    await db.refresh(step)
    return _step_out(step)

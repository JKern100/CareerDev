"""AI Career Coach API routes."""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.coach import CoachMessage, CoachGoal
from app.api.deps import get_current_user
from app.services.coach import chat_with_coach
from app.services.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coach", tags=["coach"])


# ── Schemas ──────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class GoalCreate(BaseModel):
    title: str
    target_date: str | None = None


class GoalOut(BaseModel):
    id: str
    title: str
    target_date: str | None
    completed: bool
    created_at: str
    completed_at: str | None


class GoalUpdate(BaseModel):
    completed: bool | None = None
    title: str | None = None
    target_date: str | None = None


# ── Chat ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def send_chat_message(
    data: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI career coach and get a response."""
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(data.message) > 5000:
        raise HTTPException(status_code=400, detail="Message too long (max 5000 characters)")

    try:
        reply = await chat_with_coach(user.id, data.message.strip(), db)
        await log_activity(db, user, "coach_chat", f"Sent message ({len(data.message)} chars)")
        return ChatResponse(reply=reply)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Coach chat error")
        raise HTTPException(status_code=500, detail="Failed to get coach response. Please try again.")


@router.get("/history", response_model=list[MessageOut])
async def get_chat_history(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's chat history with the coach."""
    result = await db.execute(
        select(CoachMessage)
        .where(CoachMessage.user_id == user.id)
        .order_by(CoachMessage.created_at.asc())
        .offset(offset)
        .limit(min(limit, 200))
    )
    messages = result.scalars().all()
    return [
        MessageOut(
            id=str(m.id),
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.delete("/history")
async def clear_chat_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all chat history (start fresh)."""
    result = await db.execute(
        select(CoachMessage).where(CoachMessage.user_id == user.id)
    )
    messages = result.scalars().all()
    for m in messages:
        await db.delete(m)
    await db.commit()
    await log_activity(db, user, "coach_clear_history", f"Cleared {len(messages)} messages")
    return {"detail": f"Cleared {len(messages)} messages"}


# ── Goals ────────────────────────────────────────────────────────────────

@router.get("/goals", response_model=list[GoalOut])
async def list_goals(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all career goals."""
    result = await db.execute(
        select(CoachGoal)
        .where(CoachGoal.user_id == user.id)
        .order_by(CoachGoal.created_at.desc())
    )
    return [
        GoalOut(
            id=str(g.id),
            title=g.title,
            target_date=g.target_date,
            completed=g.completed,
            created_at=g.created_at.isoformat(),
            completed_at=g.completed_at.isoformat() if g.completed_at else None,
        )
        for g in result.scalars().all()
    ]


@router.post("/goals", response_model=GoalOut, status_code=201)
async def create_goal(
    data: GoalCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new career goal."""
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Goal title cannot be empty")

    goal = CoachGoal(
        user_id=user.id,
        title=data.title.strip(),
        target_date=data.target_date,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    await log_activity(db, user, "coach_goal_created", data.title[:100])
    return GoalOut(
        id=str(goal.id),
        title=goal.title,
        target_date=goal.target_date,
        completed=goal.completed,
        created_at=goal.created_at.isoformat(),
        completed_at=None,
    )


@router.patch("/goals/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a goal (mark complete, rename, change date)."""
    result = await db.execute(
        select(CoachGoal).where(
            CoachGoal.id == UUID(goal_id),
            CoachGoal.user_id == user.id,
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if data.completed is not None:
        goal.completed = data.completed
        goal.completed_at = datetime.utcnow() if data.completed else None
    if data.title is not None:
        goal.title = data.title.strip()
    if data.target_date is not None:
        goal.target_date = data.target_date

    await db.commit()
    await db.refresh(goal)
    return GoalOut(
        id=str(goal.id),
        title=goal.title,
        target_date=goal.target_date,
        completed=goal.completed,
        created_at=goal.created_at.isoformat(),
        completed_at=goal.completed_at.isoformat() if goal.completed_at else None,
    )


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a goal."""
    result = await db.execute(
        select(CoachGoal).where(
            CoachGoal.id == UUID(goal_id),
            CoachGoal.user_id == user.id,
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    await db.delete(goal)
    await db.commit()
    return {"detail": "Goal deleted"}

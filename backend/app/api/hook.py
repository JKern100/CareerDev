"""Public, anonymous endpoint for the 60-second hook funnel at /start.

The hook is ungated (no account), so the frontend posts a tiny event here
when a visitor starts it and again when they reach the teaser. This is what
lets the admin dashboard count first-touch 60-second runs — they never hit
any other backend route.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.hook import HookEvent

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/hook", tags=["hook"])


class HookEventIn(BaseModel):
    event: str  # "started" | "completed"
    region: str | None = None
    top_pathway: str | None = None

    @field_validator("event")
    @classmethod
    def _valid_event(cls, v: str) -> str:
        if v not in ("started", "completed"):
            raise ValueError("event must be 'started' or 'completed'")
        return v


@router.post("/event", status_code=204)
@limiter.limit("30/minute")
async def log_hook_event(
    request: Request,
    data: HookEventIn,
    db: AsyncSession = Depends(get_db),
):
    """Record one anonymous 60-second hook milestone. Fire-and-forget."""
    db.add(HookEvent(
        event=data.event,
        region=(data.region or None),
        top_pathway=(data.top_pathway or None),
    ))
    await db.commit()
    return None

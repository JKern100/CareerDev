"""Helper to log user activity events."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityEvent
from app.models.user import User


async def log_activity(
    db: AsyncSession,
    user: User,
    action: str,
    detail: str | None = None,
    metadata: dict | None = None,
) -> None:
    event = ActivityEvent(
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value if hasattr(user.role, "value") else user.role,
        action=action,
        detail=detail,
        metadata_json=metadata,
    )
    db.add(event)
    # Don't commit — caller controls the transaction

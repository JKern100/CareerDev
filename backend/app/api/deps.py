"""Shared API dependencies."""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Throttle last_active_at updates to once per minute
_ACTIVITY_THROTTLE = timedelta(minutes=1)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        uid = UUID(user_id)
    except (ValueError, AttributeError):
        raise credentials_exception
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    # Tag user object with impersonation flag from JWT claim
    user._impersonated = payload.get("imp", False)

    # Update last_active_at (throttled to avoid DB writes on every request)
    now = datetime.utcnow()
    if user.last_active_at is None or (now - user.last_active_at) > _ACTIVITY_THROTTLE:
        user.last_active_at = now
        await db.commit()

    return user


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "auditor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_premium(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that requires an active paid subscription."""
    # Admin/auditor and impersonation bypass premium check
    if getattr(user, "_impersonated", False) or user.role in ("admin", "auditor"):
        return user

    from app.models.payment import Subscription
    from app.services.payment import is_premium

    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()
    if not is_premium(sub):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a paid plan. Visit /pricing to upgrade.",
        )
    return user

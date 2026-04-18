from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.services.auth import (
    hash_password, verify_password, create_access_token,
    create_reset_token, decode_reset_token,
    create_email_verification_token, decode_email_verification_token,
    create_oauth_state_token, verify_oauth_state_token,
)
from app.services.email import send_reset_email, send_verification_email
from app.config import settings
from app.api.deps import get_current_user
from app.services.activity import log_activity
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: UserRegister, db: AsyncSession = Depends(get_db)):
    normalized_email = data.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Resolve referral code to referrer user ID
    referred_by = None
    if data.referral_code:
        ref_result = await db.execute(
            select(User).where(User.referral_code == data.referral_code.strip().upper())
        )
        referrer = ref_result.scalar_one_or_none()
        if referrer:
            referred_by = referrer.id

    from app.models.user import _generate_referral_code
    from sqlalchemy.exc import IntegrityError

    user = User(
        email=normalized_email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        referred_by=referred_by,
    )
    db.add(user)
    # Retry on referral code collision (unique constraint)
    for attempt in range(3):
        try:
            await db.commit()
            break
        except IntegrityError:
            await db.rollback()
            user.referral_code = _generate_referral_code()
            db.add(user)
    else:
        raise HTTPException(status_code=500, detail="Registration failed, please try again")
    await db.refresh(user)

    # Send verification email in background (non-blocking)
    token = create_email_verification_token(user.email)
    email_sent = await send_verification_email(user.email, token)

    if not email_sent:
        # Only auto-verify if Resend is not configured at all (dev mode)
        if not settings.RESEND_API_KEY:
            user.email_verified = True
            await db.commit()
            await db.refresh(user)

    # Track login
    user.has_logged_in = True
    user.last_login_at = datetime.utcnow()
    user.login_count = 1
    await log_activity(db, user, "register")
    await db.commit()

    # Auto-login: return JWT
    access_token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, is_first_login=True)


@router.post("/verify-email")
async def verify_email(data: dict, db: AsyncSession = Depends(get_db)):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    email = decode_email_verification_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    result = await db.execute(select(User).where(func.lower(User.email) == email.strip().lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    if user.email_verified:
        return {"detail": "Email already verified"}

    user.email_verified = True
    await db.commit()
    return {"detail": "Email verified successfully"}


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, data: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    # Always return success to avoid leaking which emails exist
    result = await db.execute(select(User).where(func.lower(User.email) == data.email.strip().lower()))
    user = result.scalar_one_or_none()
    if user and not user.email_verified:
        token = create_email_verification_token(user.email)
        email_sent = await send_verification_email(user.email, token)
        if not email_sent and not settings.RESEND_API_KEY:
            # Auto-verify only in dev mode (no email provider configured)
            user.email_verified = True
            await db.commit()
    return {"detail": "If that email is registered and unverified, a verification link has been sent."}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(func.lower(User.email) == data.email.strip().lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.auth_provider == "google" and not user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in. Please sign in with Google.",
        )

    if not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Track first login
    is_first_login = not user.has_logged_in
    if is_first_login:
        user.has_logged_in = True

    # Track login time and count
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    await log_activity(db, user, "login")
    await db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, is_first_login=is_first_login)


@router.get("/me")
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import Subscription
    from app.services.payment import is_premium as _is_premium

    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalar_one_or_none()

    impersonated = getattr(user, "_impersonated", False)
    is_admin = user.role in ("admin", "auditor")

    # Admins/auditors always get Pro for their own account.
    # Impersonation shows the user's real plan so admins can diagnose issues.
    if is_admin and not impersonated:
        plan = "pro"
        premium = True
    else:
        plan = sub.plan if sub else "free"
        premium = _is_premium(sub)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "questionnaire_completed": user.questionnaire_completed,
        "current_module": user.current_module,
        "can_regenerate_summary": user.can_regenerate_summary,
        "last_tier_completed_at": user.last_tier_completed_at.isoformat() if user.last_tier_completed_at else None,
        "email_verified": user.email_verified,
        "plan": plan,
        "is_premium": premium,
    }


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Always return success to avoid leaking which emails exist
    result = await db.execute(select(User).where(func.lower(User.email) == data.email.strip().lower()))
    user = result.scalar_one_or_none()
    if user:
        token = create_reset_token(user.email)
        await send_reset_email(user.email, token)
    # Report email_configured (not email_sent) so frontend knows if the service
    # is available at all — without leaking whether the email exists.
    return {
        "detail": "If that email is registered, a reset link has been sent.",
        "email_sent": bool(settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip()),
    }


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    email = decode_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    result = await db.execute(select(User).where(func.lower(User.email) == email.strip().lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Password updated successfully"}


@router.post("/logout")
async def logout():
    # Token-based auth — client discards token. Server-side blocklist can be added later.
    return {"detail": "Logged out"}


# ── Google OAuth ─────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google")
async def google_login():
    """Redirect the browser to Google's consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    state = create_oauth_state_token()
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


class GoogleCallbackRequest(BaseModel):
    code: str
    state: str | None = None
    referral_code: str | None = None


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(data: GoogleCallbackRequest, db: AsyncSession = Depends(get_db)):
    """Exchange the authorization code for user info and return a JWT."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    if not data.state or not verify_oauth_state_token(data.state):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    # 1. Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": data.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback",
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code with Google")

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token from Google")

    # 2. Fetch user profile
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

    google_user = userinfo_resp.json()
    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # 3. Find or create user
    # Try by google_id first, then by email (to link existing accounts)
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(func.lower(User.email) == email.strip().lower()))
        user = result.scalar_one_or_none()

    if user:
        # Link Google ID if not yet set
        if not user.google_id:
            user.google_id = google_id
            if user.auth_provider == "local":
                user.auth_provider = "google"
        user.email_verified = True
    else:
        # Resolve referral code for new OAuth users
        referred_by = None
        if data.referral_code:
            ref_result = await db.execute(
                select(User).where(User.referral_code == data.referral_code.strip().upper())
            )
            referrer = ref_result.scalar_one_or_none()
            if referrer:
                referred_by = referrer.id

        # Create new user
        user = User(
            email=email,
            full_name=name,
            google_id=google_id,
            auth_provider="google",
            email_verified=True,
            hashed_password=None,
            referred_by=referred_by,
        )
        db.add(user)

    # Track login
    is_first_login = not user.has_logged_in
    if is_first_login:
        user.has_logged_in = True
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    await log_activity(db, user, "login", detail="google_oauth")
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, is_first_login=is_first_login)

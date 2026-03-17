from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
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
)
from app.services.email import send_reset_email, send_verification_email
from app.config import settings
from app.api.deps import get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email
    token = create_email_verification_token(user.email)
    email_sent = await send_verification_email(user.email, token)

    if not email_sent:
        # Auto-verify if email delivery isn't available
        user.email_verified = True
        await db.commit()
        await db.refresh(user)

    return user


@router.post("/verify-email")
async def verify_email(data: dict, db: AsyncSession = Depends(get_db)):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    email = decode_email_verification_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    result = await db.execute(select(User).where(User.email == email))
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
async def resend_verification(data: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    # Always return success to avoid leaking which emails exist
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user and not user.email_verified:
        token = create_email_verification_token(user.email)
        email_sent = await send_verification_email(user.email, token)
        if not email_sent:
            # Auto-verify if email delivery isn't available
            user.email_verified = True
            await db.commit()
    return {"detail": "If that email is registered and unverified, a verification link has been sent."}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.auth_provider == "google" and not user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in. Please sign in with Google.",
        )

    if not user.email_verified and user.role == "user":
        if not settings.SMTP_HOST:
            # No email delivery available — auto-verify so users aren't stuck
            user.email_verified = True
            await db.commit()
        else:
            raise HTTPException(status_code=403, detail="Please verify your email before signing in. Check your inbox for a verification link.")

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


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Always return success to avoid leaking which emails exist
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    email_sent = False
    if user:
        token = create_reset_token(user.email)
        email_sent = await send_reset_email(user.email, token)
    return {
        "detail": "If that email is registered, a reset link has been sent.",
        "email_sent": email_sent,
    }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    email = decode_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    result = await db.execute(select(User).where(User.email == email))
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

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


class GoogleCallbackRequest(BaseModel):
    code: str


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(data: GoogleCallbackRequest, db: AsyncSession = Depends(get_db)):
    """Exchange the authorization code for user info and return a JWT."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

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
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user:
        # Link Google ID if not yet set
        if not user.google_id:
            user.google_id = google_id
            if user.auth_provider == "local":
                user.auth_provider = "google"
        user.email_verified = True
    else:
        # Create new user
        user = User(
            email=email,
            full_name=name,
            google_id=google_id,
            auth_provider="google",
            email_verified=True,
            hashed_password=None,
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

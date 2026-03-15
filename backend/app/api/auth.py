from fastapi import APIRouter, Depends, HTTPException, status
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
from app.api.deps import get_current_user

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
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.email_verified and user.role == "user":
        raise HTTPException(status_code=403, detail="Please verify your email before signing in. Check your inbox for a verification link.")

    # Track first login
    is_first_login = not user.has_logged_in
    if is_first_login:
        user.has_logged_in = True
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
    if user:
        token = create_reset_token(user.email)
        await send_reset_email(user.email, token)
    return {"detail": "If that email is registered, a reset link has been sent."}


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

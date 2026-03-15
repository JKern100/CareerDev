"""Email sending service."""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def _send_email(msg: MIMEMultipart) -> bool:
    """Send an email via SMTP. Returns True on success, False on failure."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured — email not sent. To: %s", msg["To"])
        return False

    try:
        # Port 465 uses implicit SSL; port 587 uses STARTTLS
        use_tls = settings.SMTP_PORT == 465
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=use_tls,
            start_tls=not use_tls,
        )
        return True
    except Exception:
        logger.exception("Failed to send email to %s", msg["To"])
        return False


async def send_verification_email(to_email: str, token: str) -> bool:
    """Send an email verification link. Returns True on success."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    html = f"""\
<html>
<body style="font-family: sans-serif; color: #1e293b; max-width: 500px;">
  <h2 style="color: #2563eb;">Welcome to CareerDev</h2>
  <p>Thanks for creating your account! Please verify your email address to get started.</p>
  <a href="{verify_url}"
     style="display: inline-block; background: #2563eb; color: white;
            padding: 12px 24px; border-radius: 8px; text-decoration: none;
            font-weight: 600; margin: 16px 0;">
    Verify my email
  </a>
  <p style="color: #64748b; font-size: 0.85rem;">
    This link expires in 24 hours. If you didn&rsquo;t create this account, you can safely ignore this email.
  </p>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your CareerDev email"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(f"Verify your email: {verify_url}", "plain"))
    msg.attach(MIMEText(html, "html"))

    return await _send_email(msg)


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset link via email. Returns True on success."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html = f"""\
<html>
<body style="font-family: sans-serif; color: #1e293b; max-width: 500px;">
  <h2 style="color: #2563eb;">CareerDev — Password Reset</h2>
  <p>You requested a password reset. Click the button below to set a new password:</p>
  <a href="{reset_url}"
     style="display: inline-block; background: #2563eb; color: white;
            padding: 12px 24px; border-radius: 8px; text-decoration: none;
            font-weight: 600; margin: 16px 0;">
    Reset my password
  </a>
  <p style="color: #64748b; font-size: 0.85rem;">
    This link expires in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.
    If you didn't request this, you can safely ignore this email.
  </p>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your CareerDev password"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(f"Reset your password: {reset_url}", "plain"))
    msg.attach(MIMEText(html, "html"))

    return await _send_email(msg)

"""Email sending service."""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


def _branded_email(body_content: str) -> str:
    """Wrap email body content in a branded template with logo and footer."""
    logo_url = f"{settings.FRONTEND_URL}/logo.svg"
    return f"""\
<html>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header with logo -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 32px 24px;">
              <img src="{logo_url}" alt="CareerDev" width="56" height="56" style="display: block; margin-bottom: 12px;" />
              <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">CareerDev</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px; color: #1e293b; font-size: 15px; line-height: 1.6;">
              {body_content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                &copy; CareerDev &mdash; Your career transition partner<br/>
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


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

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Welcome to CareerDev!</h2>
              <p style="margin: 0 0 12px;">Thanks for creating your account. Please verify your email address to get started on your career transition journey.</p>
              <p style="margin: 0 0 24px;">Click the button below to confirm your email:</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{verify_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      Verify my email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                This link expires in 24 hours. If you didn&rsquo;t create this account, you can safely ignore this email.
              </p>"""

    html = _branded_email(body)

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

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Password Reset</h2>
              <p style="margin: 0 0 12px;">You requested a password reset for your CareerDev account.</p>
              <p style="margin: 0 0 24px;">Click the button below to set a new password:</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{reset_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      Reset my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                This link expires in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.
                If you didn&rsquo;t request this, you can safely ignore this email.
              </p>"""

    html = _branded_email(body)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your CareerDev password"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(f"Reset your password: {reset_url}", "plain"))
    msg.attach(MIMEText(html, "html"))

    return await _send_email(msg)

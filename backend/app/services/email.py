"""Email sending service using Resend."""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


def _branded_email(body_content: str) -> str:
    """Wrap email body content in a branded template with text logo and footer."""
    return f"""\
<html>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 32px 24px;">
              <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Crew<span style="color: #60a5fa;">Transition</span></span>
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
                &copy; CrewTransition &mdash; Your career transition partner<br/>
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


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API. Returns True on success."""
    api_key = settings.RESEND_API_KEY.strip()
    if not api_key:
        logger.warning("RESEND_API_KEY not configured — email not sent. To: %s", to)
        return False

    logger.info("Sending email to %s, subject=%r, from=%s", to, subject, settings.EMAIL_FROM)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_API,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.EMAIL_FROM,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
                timeout=10,
            )
            if resp.status_code >= 400:
                logger.error("Resend API error %s: %s", resp.status_code, resp.text)
                return False
            logger.info("Email sent successfully to %s (status=%s)", to, resp.status_code)
            return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


async def send_verification_email(to_email: str, token: str) -> bool:
    """Send an email verification link. Returns True on success."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Welcome to CrewTransition!</h2>
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
    return await _send_email(to_email, "Verify your CrewTransition email", html)


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset link via email. Returns True on success."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Password Reset</h2>
              <p style="margin: 0 0 12px;">You requested a password reset for your CrewTransition account.</p>
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
    return await _send_email(to_email, "Reset your CrewTransition password", html)

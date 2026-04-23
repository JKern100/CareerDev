"""Email sending service using Resend."""

import logging
import uuid

import httpx
from sqlalchemy import select

from app.config import settings
from app.database import async_session

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


async def _log_email(
    to: str,
    subject: str,
    email_type: str,
    status: str,
    error_detail: str | None = None,
    resend_id: str | None = None,
):
    try:
        from app.models.user import User, EmailLog
        async with async_session() as session:
            result = await session.execute(
                select(User.id).where(User.email == to)
            )
            user_id = result.scalar_one_or_none()
            session.add(EmailLog(
                id=uuid.uuid4(),
                to_email=to,
                user_id=user_id,
                subject=subject,
                email_type=email_type,
                status=status,
                error_detail=error_detail,
                resend_id=resend_id,
            ))
            await session.commit()
    except Exception:
        logger.exception("Failed to log email to %s", to)


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


async def _send_email(to: str, subject: str, html: str, email_type: str = "unknown") -> bool:
    """Send an email via Resend API. Returns True on success."""
    api_key = settings.RESEND_API_KEY.strip()
    if not api_key:
        logger.warning("RESEND_API_KEY not configured — email not sent. To: %s", to)
        await _log_email(to, subject, email_type, "skipped", error_detail="RESEND_API_KEY not configured")
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
                await _log_email(to, subject, email_type, "failed", error_detail=resp.text[:500])
                return False
            resend_id = None
            try:
                resend_id = resp.json().get("id")
            except Exception:
                pass
            logger.info("Email sent successfully to %s (status=%s)", to, resp.status_code)
            await _log_email(to, subject, email_type, "sent", resend_id=resend_id)
            return True
    except Exception as exc:
        logger.exception("Failed to send email to %s", to)
        await _log_email(to, subject, email_type, "error", error_detail=str(exc)[:500])
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
    return await _send_email(to_email, "Verify your CrewTransition email", html, "verification")


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
    return await _send_email(to_email, "Reset your CrewTransition password", html, "password_reset")


async def send_stage1_results_email(
    to_email: str,
    user_name: str | None,
    top_pathway_name: str,
    match_pct: int,
    unsubscribe_token: str | None,
) -> bool:
    """Sent when a user completes Stage 1 of the questionnaire.

    Highlights their top career match and invites them back to see full results.
    """
    name = (user_name or "").split(" ")[0] or "there"
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    unsubscribe_url = (
        f"{settings.FRONTEND_URL}/unsubscribe?token={unsubscribe_token}"
        if unsubscribe_token
        else None
    )

    unsub_html = (
        f"""<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 12px 0 0; text-align: center;">
            Don't want these updates? <a href="{unsubscribe_url}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
          </p>"""
        if unsubscribe_url
        else ""
    )

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Your first career match is in, {name}!</h2>
              <p style="margin: 0 0 16px;">Based on your answers, here&rsquo;s your top career match so far:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border: 1px solid #dbeafe; border-radius: 12px; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="color: #3b82f6; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 6px;">Top Match</p>
                    <p style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 4px;">{top_pathway_name}</p>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">{match_pct}% fit based on your profile</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px;">Your full results include:</p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #334155;">
                <li style="margin-bottom: 6px;">Your top 5 career pathways, ranked</li>
                <li style="margin-bottom: 6px;">Salary benchmarks for each</li>
                <li style="margin-bottom: 6px;">Credentials worth pursuing</li>
                <li style="margin-bottom: 6px;">A step-by-step action plan</li>
              </ul>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{dashboard_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      See my full results
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                Share your results with crew friends who might be exploring too &mdash; your referral code is in the dashboard.
              </p>
              {unsub_html}"""

    html = _branded_email(body)
    return await _send_email(to_email, f"Your top career match: {top_pathway_name}", html, "stage1_results")


async def send_coach_invite_email(
    to_email: str,
    user_name: str | None,
    unsubscribe_token: str | None,
) -> bool:
    """Invite a user to try the AI career coach."""
    name = (user_name or "").split(" ")[0] or "there"
    coach_url = f"{settings.FRONTEND_URL}/coach"
    unsubscribe_url = (
        f"{settings.FRONTEND_URL}/unsubscribe?token={unsubscribe_token}"
        if unsubscribe_token
        else None
    )

    unsub_html = (
        f"""<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 12px 0 0; text-align: center;">
            Don't want these updates? <a href="{unsubscribe_url}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
          </p>"""
        if unsubscribe_url
        else ""
    )

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Hi {name}, your personal career coach is ready</h2>
              <p style="margin: 0 0 16px;">You&rsquo;ve already taken the first step by completing your questionnaire. Now there&rsquo;s someone waiting to help you take the next one.</p>
              <p style="margin: 0 0 12px; font-weight: 600; color: #1e293b;">This isn&rsquo;t generic ChatGPT.</p>
              <p style="margin: 0 0 16px;">Your CrewTransition coach has <em>already read</em> your questionnaire answers. It knows your background, your skills, and your goals &mdash; so every conversation starts from where you are, not from scratch.</p>
              <p style="margin: 0 0 8px; font-weight: 600; color: #1e293b;">What your coach can help with:</p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #334155;">
                <li style="margin-bottom: 6px;"><strong>Interview prep</strong> tailored to your target career</li>
                <li style="margin-bottom: 6px;"><strong>Resume translation</strong> of your aviation skills into civilian language employers understand</li>
                <li style="margin-bottom: 6px;"><strong>Salary negotiation</strong> advice based on your experience level</li>
                <li style="margin-bottom: 6px;"><strong>Step-by-step transition planning</strong> with specialty knowledge about moving from aviation</li>
              </ul>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px;">Plus, it remembers your entire conversation history &mdash; so you can pick up right where you left off, every time.</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{coach_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      Talk to My Coach
                    </a>
                  </td>
                </tr>
              </table>
              {unsub_html}"""

    html = _branded_email(body)
    return await _send_email(to_email, "Your personal career coach is waiting", html, "coach_invite")


async def send_come_back_email(
    to_email: str,
    user_name: str | None,
    days_away: int,
    unsubscribe_token: str | None,
) -> bool:
    """Re-engagement email for users who haven't visited in a while."""
    name = (user_name or "").split(" ")[0] or "there"
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    unsubscribe_url = (
        f"{settings.FRONTEND_URL}/unsubscribe?token={unsubscribe_token}"
        if unsubscribe_token
        else None
    )

    unsub_html = (
        f"""<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 12px 0 0; text-align: center;">
            Don't want these updates? <a href="{unsubscribe_url}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
          </p>"""
        if unsubscribe_url
        else ""
    )

    away_line = (
        f"<p style=\"margin: 0 0 16px;\">It&rsquo;s been {days_away} days since your last visit, and we wanted to check in.</p>"
        if days_away > 7
        else "<p style=\"margin: 0 0 16px;\">It&rsquo;s been a little while since your last visit, and we wanted to check in.</p>"
    )

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Hi {name}, your career plan is still here</h2>
              {away_line}
              <p style="margin: 0 0 16px;">Career transitions take time &mdash; there&rsquo;s no rush. But when you&rsquo;re ready, everything is right where you left it:</p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #334155;">
                <li style="margin-bottom: 6px;">Your personalised career results and pathway matches</li>
                <li style="margin-bottom: 6px;">Your AI career coach, ready to continue the conversation</li>
                <li style="margin-bottom: 6px;">Your step-by-step action plan</li>
              </ul>
              <p style="margin: 0 0 24px;">Even five minutes can move things forward.</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{dashboard_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      Pick up where I left off
                    </a>
                  </td>
                </tr>
              </table>
              {unsub_html}"""

    html = _branded_email(body)
    return await _send_email(to_email, "We miss you — your career plan is waiting", html, "come_back")


async def send_complete_questionnaire_email(
    to_email: str,
    user_name: str | None,
    current_module: str | None,
    unsubscribe_token: str | None,
) -> bool:
    """Nudge a user to finish their questionnaire."""
    name = (user_name or "").split(" ")[0] or "there"
    questionnaire_url = f"{settings.FRONTEND_URL}/questionnaire"
    unsubscribe_url = (
        f"{settings.FRONTEND_URL}/unsubscribe?token={unsubscribe_token}"
        if unsubscribe_token
        else None
    )

    unsub_html = (
        f"""<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 12px 0 0; text-align: center;">
            Don't want these updates? <a href="{unsubscribe_url}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
          </p>"""
        if unsubscribe_url
        else ""
    )

    module_display = current_module or "the first section"

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">You&rsquo;re almost there, {name}!</h2>
              <p style="margin: 0 0 16px;">You&rsquo;ve already started your career profile and you&rsquo;re currently on module <strong>{module_display}</strong> (out of H). Every answer you give helps us build a more accurate picture of your strengths and match you with the right career paths.</p>
              <p style="margin: 0 0 16px;">The more you share, the better your results will be &mdash; more detailed answers mean more precise career matches, better salary estimates, and a sharper action plan.</p>
              <p style="margin: 0 0 24px;">Pick up right where you stopped &mdash; your progress is saved.</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{questionnaire_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      Continue my questionnaire
                    </a>
                  </td>
                </tr>
              </table>
              {unsub_html}"""

    html = _branded_email(body)
    return await _send_email(to_email, "You're almost there — finish your career profile", html, "complete_questionnaire")


async def send_custom_email(
    to_email: str,
    subject: str,
    body_text: str,
    unsubscribe_token: str | None = None,
) -> bool:
    """Send an admin-composed custom email wrapped in the branded template."""
    unsubscribe_url = (
        f"{settings.FRONTEND_URL}/unsubscribe?token={unsubscribe_token}"
        if unsubscribe_token
        else None
    )

    unsub_html = (
        f"""<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 12px 0 0; text-align: center;">
            Don't want these updates? <a href="{unsubscribe_url}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
          </p>"""
        if unsubscribe_url
        else ""
    )

    # Convert plain text paragraphs to HTML
    paragraphs = body_text.strip().split("\n\n")
    paragraphs_html = "".join(
        f'<p style="margin: 0 0 16px;">{p.strip().replace(chr(10), "<br/>")}</p>'
        for p in paragraphs
        if p.strip()
    )

    body = f"""\
              {paragraphs_html}
              {unsub_html}"""

    html = _branded_email(body)
    return await _send_email(to_email, subject, html, "custom")


async def send_pro_welcome_email(to_email: str, user_name: str | None = None) -> bool:
    """Send a welcome email when a user activates Pro."""
    name = user_name or "there"
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

    body = f"""\
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Welcome to Pro, {name}!</h2>
              <p style="margin: 0 0 12px;">Your Pro plan is now active. Here&rsquo;s what you&rsquo;ve unlocked:</p>
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #334155;">
                <li style="margin-bottom: 8px;"><strong>Full Career Analysis</strong> &mdash; AI-powered career pathways with salary data and credentials</li>
                <li style="margin-bottom: 8px;"><strong>AI Career Coach</strong> &mdash; unlimited conversations to guide your transition</li>
                <li style="margin-bottom: 8px;"><strong>Action Plan</strong> &mdash; personalised steps to move forward</li>
                <li style="margin-bottom: 8px;"><strong>Advanced Questionnaire</strong> &mdash; deeper insights for better recommendations</li>
              </ul>
              <p style="margin: 0 0 24px;">Head to your dashboard to get started:</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="background: #2563eb; border-radius: 8px;">
                    <a href="{dashboard_url}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff;
                              text-decoration: none; font-weight: 600; font-size: 15px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                You can manage your subscription anytime from the Pricing page.
                Questions? Reply to this email or contact support@crewtransition.com.
              </p>"""

    html = _branded_email(body)
    return await _send_email(to_email, "You're now a CrewTransition Pro!", html, "pro_welcome")

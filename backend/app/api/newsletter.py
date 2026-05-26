"""Newsletter API: public subscribe/confirm/unsubscribe + issue pages, plus admin CRUD/send."""

import logging
import re
import secrets
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user
from app.config import settings
from app.database import get_db
from app.models.email_event import EmailEvent
from app.models.newsletter import NewsletterIssue, NewsletterSubscriber
from app.models.user import EmailLog, User
from app.services.email import (
    apply_newsletter_macros,
    send_newsletter_confirmation,
    send_newsletter_issue,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/newsletter", tags=["newsletter"])
admin_router = APIRouter(prefix="/admin/newsletter", tags=["admin-newsletter"])


# ── Schemas ──────────────────────────────────────────────────────────────

class SubscribeIn(BaseModel):
    email: EmailStr


class IssuePublicOut(BaseModel):
    slug: str
    subject: str
    teaser_md: str
    body_md: str | None = None
    published_at: datetime | None


class IssueAdminOut(BaseModel):
    id: str
    slug: str
    subject: str
    teaser_md: str
    body_md: str
    status: str
    published_at: datetime | None
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime


class IssueCreate(BaseModel):
    slug: str
    subject: str
    teaser_md: str = ""
    body_md: str = ""


class IssueUpdate(BaseModel):
    slug: str | None = None
    subject: str | None = None
    teaser_md: str | None = None
    body_md: str | None = None


class SubscriberOut(BaseModel):
    email: str
    name: str | None
    source: str  # "user" | "signup" | "user+signup"
    status: str  # active | pending | unsubscribed
    joined_at: datetime
    confirmed_at: datetime | None
    unsubscribed_at: datetime | None
    user_id: str | None
    subscriber_id: str | None


class RecipientOut(BaseModel):
    email: str
    name: str | None
    source: str  # "user" or "subscriber"
    user_id: str | None
    subscriber_id: str | None
    subscriber_status: str | None  # active/pending/unsubscribed/None


class SendIssueIn(BaseModel):
    # Optional explicit recipient list (emails). If omitted, send to all eligible recipients.
    emails: list[str] | None = None
    force: bool = False


# ── Helpers ──────────────────────────────────────────────────────────────

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$")


def _validate_slug(slug: str) -> str:
    slug = slug.strip().lower()
    if not _SLUG_RE.match(slug):
        raise HTTPException(
            status_code=400,
            detail="Slug must be lowercase, 2–80 chars, [a-z0-9-], e.g. '2026-05-25'",
        )
    return slug


def _issue_admin(i: NewsletterIssue) -> IssueAdminOut:
    return IssueAdminOut(
        id=str(i.id),
        slug=i.slug,
        subject=i.subject,
        teaser_md=i.teaser_md,
        body_md=i.body_md,
        status=i.status,
        published_at=i.published_at,
        sent_at=i.sent_at,
        created_at=i.created_at,
        updated_at=i.updated_at,
    )


# ── Public endpoints ─────────────────────────────────────────────────────


@router.post("/subscribe")
async def subscribe(data: SubscribeIn, db: AsyncSession = Depends(get_db)):
    """Create a pending subscription, send confirmation email.

    Idempotent: re-submitting an email that's pending resends the confirmation;
    re-submitting an active email is a no-op; re-submitting an unsubscribed
    email re-opens the confirmation flow.
    """
    email = data.email.lower().strip()
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )
    sub = result.scalar_one_or_none()

    if sub and sub.status == "active":
        # Already subscribed — return success without re-sending (don't reveal status to scrapers either)
        return {"detail": "Check your inbox to confirm."}

    token = secrets.token_urlsafe(32)[:64]
    expires = datetime.utcnow() + timedelta(days=7)

    if sub is None:
        sub = NewsletterSubscriber(
            email=email,
            status="pending",
            confirm_token=token,
            confirm_token_expires_at=expires,
            source="web_form",
        )
        db.add(sub)
    else:
        sub.status = "pending"
        sub.confirm_token = token
        sub.confirm_token_expires_at = expires
        sub.unsubscribed_at = None

    await db.commit()

    await send_newsletter_confirmation(email, token)
    return {"detail": "Check your inbox to confirm."}


@router.get("/confirm")
async def confirm(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Activate a pending subscriber."""
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.confirm_token == token)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Invalid or expired confirmation link")
    if sub.confirm_token_expires_at and sub.confirm_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Confirmation link has expired. Please subscribe again.")

    sub.status = "active"
    sub.confirmed_at = datetime.utcnow()
    sub.confirm_token = None
    sub.confirm_token_expires_at = None
    await db.commit()
    return {"detail": "Subscription confirmed.", "email": sub.email}


@router.get("/unsubscribe")
async def unsubscribe_get(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    """One-click unsubscribe (GET for List-Unsubscribe header compatibility)."""
    return await _do_unsubscribe(token, db)


@router.post("/unsubscribe")
async def unsubscribe_post(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    """One-click unsubscribe POST per RFC 8058."""
    return await _do_unsubscribe(token, db)


async def _do_unsubscribe(token: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.unsub_token == token)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Invalid unsubscribe link")
    if sub.status != "unsubscribed":
        sub.status = "unsubscribed"
        sub.unsubscribed_at = datetime.utcnow()
        await db.commit()
    return {"detail": "Unsubscribed successfully.", "email": sub.email}


@router.get("/issues", response_model=list[IssuePublicOut])
async def list_published_issues(db: AsyncSession = Depends(get_db)):
    """List published or sent issues (archive)."""
    result = await db.execute(
        select(NewsletterIssue)
        .where(NewsletterIssue.status.in_(["published", "sent"]))
        .order_by(NewsletterIssue.published_at.desc().nullslast(), NewsletterIssue.created_at.desc())
    )
    issues = result.scalars().all()
    # Archive list: no body to keep payload small
    return [
        IssuePublicOut(
            slug=i.slug,
            subject=i.subject,
            teaser_md=i.teaser_md,
            body_md=None,
            published_at=i.published_at,
        )
        for i in issues
    ]


@router.get("/issues/{slug}", response_model=IssuePublicOut)
async def get_published_issue(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NewsletterIssue).where(
            NewsletterIssue.slug == slug,
            NewsletterIssue.status.in_(["published", "sent"]),
        )
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return IssuePublicOut(
        slug=issue.slug,
        subject=issue.subject,
        teaser_md=issue.teaser_md,
        body_md=issue.body_md,
        published_at=issue.published_at,
    )


# ── Admin endpoints ──────────────────────────────────────────────────────


@admin_router.get("/issues", response_model=list[IssueAdminOut])
async def admin_list_issues(_=Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NewsletterIssue).order_by(NewsletterIssue.created_at.desc())
    )
    return [_issue_admin(i) for i in result.scalars().all()]


@admin_router.post("/issues", response_model=IssueAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_issue(
    data: IssueCreate,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    slug = _validate_slug(data.slug)
    existing = await db.execute(select(NewsletterIssue).where(NewsletterIssue.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Issue with slug '{slug}' already exists")

    issue = NewsletterIssue(
        slug=slug,
        subject=data.subject,
        teaser_md=data.teaser_md,
        body_md=data.body_md,
        status="draft",
    )
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    return _issue_admin(issue)


@admin_router.get("/issues/{issue_id}", response_model=IssueAdminOut)
async def admin_get_issue(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _issue_admin(issue)


@admin_router.put("/issues/{issue_id}", response_model=IssueAdminOut)
async def admin_update_issue(
    issue_id: UUID,
    data: IssueUpdate,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if data.slug is not None:
        new_slug = _validate_slug(data.slug)
        if new_slug != issue.slug:
            collision = await db.execute(
                select(NewsletterIssue).where(NewsletterIssue.slug == new_slug)
            )
            if collision.scalar_one_or_none():
                raise HTTPException(status_code=409, detail=f"Slug '{new_slug}' already in use")
            issue.slug = new_slug
    if data.subject is not None:
        issue.subject = data.subject
    if data.teaser_md is not None:
        issue.teaser_md = data.teaser_md
    if data.body_md is not None:
        issue.body_md = data.body_md

    await db.commit()
    await db.refresh(issue)
    return _issue_admin(issue)


@admin_router.post("/issues/{issue_id}/archive", response_model=IssueAdminOut)
async def admin_archive_issue(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Hide an issue from the public site without deleting it.

    Archived issues don't appear in /newsletter or /newsletter/{slug},
    but stay visible in admin (and tracking stats remain queryable).
    """
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.status = "archived"
    await db.commit()
    await db.refresh(issue)
    return _issue_admin(issue)


@admin_router.post("/issues/{issue_id}/unarchive", response_model=IssueAdminOut)
async def admin_unarchive_issue(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Restore an archived issue to its most recent prior state."""
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if issue.status != "archived":
        return _issue_admin(issue)
    if issue.sent_at:
        issue.status = "sent"
    elif issue.published_at:
        issue.status = "published"
    else:
        issue.status = "draft"
    await db.commit()
    await db.refresh(issue)
    return _issue_admin(issue)


@admin_router.delete("/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_issue(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete an issue.

    EmailLog rows are kept as an audit trail. If you recreate an issue with
    the same slug, the dedup check will still skip recipients who got the
    deleted version — pick a new slug if you want a fresh send to them.
    """
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    await db.delete(issue)
    await db.commit()
    return None


@admin_router.post("/issues/{issue_id}/publish", response_model=IssueAdminOut)
async def admin_publish_issue(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if issue.status == "sent":
        return _issue_admin(issue)
    issue.status = "published"
    if issue.published_at is None:
        issue.published_at = datetime.utcnow()
    await db.commit()
    await db.refresh(issue)
    return _issue_admin(issue)


async def _merged_subscribers(db: AsyncSession) -> list[SubscriberOut]:
    """Unified subscriber view: every user (with their effective newsletter status)
    plus standalone signups.

    Newsletter is treated as a separate channel from product nudges. The global
    User.email_nudges_enabled flag governs product nudges (come_back, coach_invite,
    etc.) and is NOT used here — newsletter opt-out is per-channel via a
    newsletter_subscribers row with status='unsubscribed'.

    A user's status is:
    - 'unsubscribed' only if they have an explicit unsubscribed newsletter row
    - 'pending' only if a standalone signup exists in pending state (rare for a user)
    - 'active' otherwise — including users with product nudges globally off
    """
    sub_result = await db.execute(select(NewsletterSubscriber))
    subs_by_email: dict[str, NewsletterSubscriber] = {
        s.email.lower(): s for s in sub_result.scalars().all()
    }

    user_result = await db.execute(select(User))
    users = user_result.scalars().all()

    out: list[SubscriberOut] = []
    seen: set[str] = set()

    for u in users:
        email_lower = u.email.lower()
        sub = subs_by_email.get(email_lower)

        if sub and sub.status == "unsubscribed":
            status = "unsubscribed"
        elif sub and sub.status == "pending":
            status = "pending"
        else:
            status = "active"

        out.append(SubscriberOut(
            email=u.email,
            name=u.full_name,
            source="user+signup" if sub else "user",
            status=status,
            joined_at=u.created_at,
            confirmed_at=(sub.confirmed_at if sub and sub.confirmed_at else (u.created_at if status == "active" else None)),
            unsubscribed_at=sub.unsubscribed_at if sub else None,
            user_id=str(u.id),
            subscriber_id=str(sub.id) if sub else None,
        ))
        seen.add(email_lower)

    for email_lower, sub in subs_by_email.items():
        if email_lower in seen:
            continue
        out.append(SubscriberOut(
            email=sub.email,
            name=None,
            source="signup",
            status=sub.status,
            joined_at=sub.created_at,
            confirmed_at=sub.confirmed_at,
            unsubscribed_at=sub.unsubscribed_at,
            user_id=None,
            subscriber_id=str(sub.id),
        ))

    out.sort(key=lambda s: s.joined_at, reverse=True)
    return out


async def _eligible_recipients(db: AsyncSession) -> list[RecipientOut]:
    """Compute the eligible recipient pool.

    Every app user is implicitly eligible for the newsletter — the newsletter is
    a separate channel from product nudges, so User.email_nudges_enabled is NOT
    consulted here. The only way to be excluded is an explicit per-channel
    opt-out (newsletter_subscribers row with status='unsubscribed') or a
    standalone signup that's still pending confirmation.

    Deduped by email, preferring the user record when both exist.
    """
    sub_result = await db.execute(select(NewsletterSubscriber))
    subs_by_email: dict[str, NewsletterSubscriber] = {
        s.email.lower(): s for s in sub_result.scalars().all()
    }

    user_result = await db.execute(select(User))
    users = user_result.scalars().all()

    recipients: list[RecipientOut] = []
    seen: set[str] = set()

    for u in users:
        email_lower = u.email.lower()
        sub = subs_by_email.get(email_lower)
        if sub and sub.status == "unsubscribed":
            continue  # explicit per-channel opt-out wins
        recipients.append(RecipientOut(
            email=u.email,
            name=u.full_name,
            source="user",
            user_id=str(u.id),
            subscriber_id=str(sub.id) if sub else None,
            subscriber_status=sub.status if sub else None,
        ))
        seen.add(email_lower)

    for email_lower, sub in subs_by_email.items():
        if email_lower in seen:
            continue
        if sub.status != "active":
            continue  # pending or unsubscribed standalone signups are not eligible
        recipients.append(RecipientOut(
            email=sub.email,
            name=None,
            source="subscriber",
            user_id=None,
            subscriber_id=str(sub.id),
            subscriber_status=sub.status,
        ))

    recipients.sort(key=lambda r: (r.source != "user", r.email.lower()))
    return recipients


async def _ensure_subscriber(db: AsyncSession, email: str, source: str = "user_auto") -> NewsletterSubscriber:
    """Get-or-create the newsletter_subscribers row for an email.

    Used at send time so every recipient has a per-channel unsub token.
    Returns the row; caller is responsible for the commit cadence.
    """
    email = email.strip()
    email_lower = email.lower()
    result = await db.execute(
        select(NewsletterSubscriber).where(func.lower(NewsletterSubscriber.email) == email_lower)
    )
    sub = result.scalar_one_or_none()
    if sub:
        return sub
    sub = NewsletterSubscriber(
        email=email,
        status="active",
        source=source,
        confirmed_at=datetime.utcnow(),
    )
    db.add(sub)
    try:
        await db.flush()
    except Exception:
        # Race condition: another concurrent send created the row first. Re-select.
        await db.rollback()
        result = await db.execute(
            select(NewsletterSubscriber).where(func.lower(NewsletterSubscriber.email) == email_lower)
        )
        sub = result.scalar_one()
    return sub


@admin_router.get("/recipients", response_model=list[RecipientOut])
async def admin_list_recipients(_=Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """Merged list of all eligible newsletter recipients (users + standalone subscribers)."""
    return await _eligible_recipients(db)


@admin_router.post("/issues/{issue_id}/send")
async def admin_send_issue(
    issue_id: UUID,
    payload: SendIssueIn | None = None,
    force: bool = Query(False, description="Legacy: re-send to recipients already logged for this issue"),
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Send the issue.

    - With no payload: sends to all eligible recipients (every user with nudges on,
      plus standalone active subscribers).
    - With payload.emails: sends only to that explicit list.
    - Idempotent: skips recipients already sent this issue unless force=True.
    """
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if issue.status == "draft":
        raise HTTPException(status_code=400, detail="Publish the issue before sending")

    force_send = (payload.force if payload else False) or force
    explicit_emails: set[str] | None = None
    if payload and payload.emails is not None:
        explicit_emails = {e.strip().lower() for e in payload.emails if e and e.strip()}
        if not explicit_emails:
            raise HTTPException(status_code=400, detail="Empty recipient list")

    # Build the public issue URL
    issue_url = f"{settings.FRONTEND_URL}/newsletter/{issue.slug}"

    eligible = await _eligible_recipients(db)
    if explicit_emails is not None:
        eligible = [r for r in eligible if r.email.lower() in explicit_emails]

    # Slug-tagged email_type so dedup stays stable even when subject is personalized per-recipient.
    issue_email_type = f"newsletter_issue:{issue.slug}"

    sent = 0
    failed = 0
    skipped = 0

    for r in eligible:
        if not force_send:
            already = await db.execute(
                select(func.count())
                .select_from(EmailLog)
                .where(
                    EmailLog.to_email == r.email,
                    EmailLog.email_type == issue_email_type,
                    EmailLog.status == "sent",
                )
            )
            if (already.scalar() or 0) > 0:
                skipped += 1
                continue

        # Ensure a newsletter_subscribers row exists so the recipient has a per-channel unsub token
        sub = await _ensure_subscriber(db, r.email, source="user_auto" if r.source == "user" else "web_form")
        await db.commit()

        # Personalize subject + teaser with the recipient's name; body_md stays static
        # since the hosted page at /newsletter/<slug> is public.
        personalized_subject = apply_newsletter_macros(issue.subject, r.name)
        personalized_teaser = apply_newsletter_macros(issue.teaser_md, r.name)

        ok = await send_newsletter_issue(
            to_email=r.email,
            subject=personalized_subject,
            teaser_md=personalized_teaser,
            issue_url=issue_url,
            unsub_token=sub.unsub_token,
            email_type=issue_email_type,
        )
        if ok:
            sent += 1
        else:
            failed += 1

    if sent > 0 and issue.status != "sent":
        issue.status = "sent"
        if issue.sent_at is None:
            issue.sent_at = datetime.utcnow()
        await db.commit()

    return {
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "total_eligible": len(eligible),
        "tag": f"newsletter:{issue.slug}",
    }


@admin_router.get("/subscribers", response_model=list[SubscriberOut])
async def admin_list_subscribers(
    status_filter: str | None = Query(None, alias="status"),
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Merged view: every app user (with their effective newsletter status) + standalone signups."""
    merged = await _merged_subscribers(db)
    if status_filter:
        merged = [s for s in merged if s.status == status_filter]
    return merged


@admin_router.get("/stats")
async def admin_stats(_=Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    merged = await _merged_subscribers(db)
    return {
        "total": len(merged),
        "active": sum(1 for s in merged if s.status == "active"),
        "pending": sum(1 for s in merged if s.status == "pending"),
        "unsubscribed": sum(1 for s in merged if s.status == "unsubscribed"),
    }


@admin_router.get("/tracking-diagnostic")
async def admin_tracking_diagnostic(_=Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """Quick check of the webhook + tracking plumbing.

    Helpful when stats show 0 across the board and you want to know whether
    the problem is config (secret missing), Resend setup (no events arriving),
    or just an issue sent before the webhook was configured.
    """
    secret_set = bool(settings.RESEND_WEBHOOK_SECRET.strip())

    # Any events ever received?
    any_event = await db.execute(select(func.count()).select_from(EmailEvent))
    total_events = any_event.scalar() or 0

    # Latest event
    latest = await db.execute(
        select(EmailEvent.event_type, EmailEvent.event_at)
        .order_by(EmailEvent.created_at.desc())
        .limit(1)
    )
    latest_row = latest.first()

    # How many newsletter sends total (those with a resend_id) vs how many got a delivered event
    sent_q = await db.execute(
        select(func.count(EmailLog.id))
        .where(EmailLog.email_type.like("newsletter_issue:%"))
        .where(EmailLog.status == "sent")
        .where(EmailLog.resend_id.isnot(None))
    )
    newsletter_sends = sent_q.scalar() or 0

    delivered_q = await db.execute(
        select(func.count(func.distinct(EmailEvent.resend_id)))
        .where(EmailEvent.event_type == "email.delivered")
    )
    distinct_delivered = delivered_q.scalar() or 0

    diagnosis = []
    if not secret_set:
        diagnosis.append("RESEND_WEBHOOK_SECRET is not set on the server. Set it in Railway env vars (value comes from Resend dashboard > Webhooks > your endpoint > Signing secret).")
    elif total_events == 0:
        diagnosis.append(
            "Webhook secret is set but no events have ever been received. Likely causes: (a) the webhook endpoint isn't added in Resend dashboard, (b) it's added but points to the wrong URL, or (c) the email was sent BEFORE the webhook was configured (no backfill). Expected URL: https://careerdev-api-production.up.railway.app/webhooks/resend"
        )
    elif newsletter_sends > 0 and distinct_delivered == 0:
        diagnosis.append("Events are arriving for some emails but no newsletter sends have delivered events yet. The webhook might be subscribed only to certain event types in Resend — make sure all email.* events are checked.")
    else:
        diagnosis.append("Tracking looks healthy. Recent events are flowing in.")

    return {
        "webhook_secret_set": secret_set,
        "expected_webhook_url": "https://careerdev-api-production.up.railway.app/webhooks/resend",
        "total_events_received": total_events,
        "latest_event_type": latest_row[0] if latest_row else None,
        "latest_event_at": latest_row[1].isoformat() if latest_row else None,
        "newsletter_sends_with_resend_id": newsletter_sends,
        "newsletter_sends_with_delivered_event": distinct_delivered,
        "diagnosis": diagnosis,
    }


# ── Per-issue tracking ──────────────────────────────────────────────────


async def _issue_resend_ids(db: AsyncSession, issue: NewsletterIssue) -> list[tuple[str, str]]:
    """Return [(resend_id, to_email)] for all successful sends of this issue."""
    issue_email_type = f"newsletter_issue:{issue.slug}"
    result = await db.execute(
        select(EmailLog.resend_id, EmailLog.to_email).where(
            EmailLog.email_type == issue_email_type,
            EmailLog.status == "sent",
            EmailLog.resend_id.isnot(None),
        )
    )
    return [(rid, email) for rid, email in result.all() if rid]


@admin_router.get("/issues/{issue_id}/stats")
async def admin_issue_stats(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate tracking stats for one issue.

    Counts are based on Resend webhook events joined to EmailLog.resend_id.
    Each metric counts unique recipients (not raw events), so multiple opens
    by the same person count as one.
    """
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    sends = await _issue_resend_ids(db, issue)
    resend_ids = [rid for rid, _ in sends]
    total_sent = len(resend_ids)

    if not resend_ids:
        return {
            "sent": 0, "delivered": 0, "opened": 0, "clicked": 0,
            "bounced": 0, "complained": 0,
            "open_rate": 0.0, "click_rate": 0.0,
            "tracking_configured": bool(settings.RESEND_WEBHOOK_SECRET.strip()),
        }

    # One query: load every event for this issue's send ids
    ev_result = await db.execute(
        select(EmailEvent.resend_id, EmailEvent.event_type)
        .where(EmailEvent.resend_id.in_(resend_ids))
    )
    by_type: dict[str, set[str]] = {}
    for rid, etype in ev_result.all():
        by_type.setdefault(etype, set()).add(rid)

    delivered = len(by_type.get("email.delivered", set()))
    opened = len(by_type.get("email.opened", set()))
    clicked = len(by_type.get("email.clicked", set()))
    bounced = len(by_type.get("email.bounced", set()))
    complained = len(by_type.get("email.complained", set()))

    denom = delivered or total_sent
    return {
        "sent": total_sent,
        "delivered": delivered,
        "opened": opened,
        "clicked": clicked,
        "bounced": bounced,
        "complained": complained,
        "open_rate": round(opened / denom, 4) if denom else 0.0,
        "click_rate": round(clicked / denom, 4) if denom else 0.0,
        "tracking_configured": bool(settings.RESEND_WEBHOOK_SECRET.strip()),
    }


@admin_router.get("/issues/{issue_id}/recipient-events")
async def admin_issue_recipient_events(
    issue_id: UUID,
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Per-recipient tracking timeline for one issue."""
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    sends = await _issue_resend_ids(db, issue)
    if not sends:
        return []

    resend_ids = [rid for rid, _ in sends]
    email_by_rid = {rid: email for rid, email in sends}

    ev_result = await db.execute(
        select(EmailEvent.resend_id, EmailEvent.event_type, EmailEvent.event_at, EmailEvent.url)
        .where(EmailEvent.resend_id.in_(resend_ids))
        .order_by(EmailEvent.event_at.asc())
    )
    events_by_email: dict[str, dict] = {
        email: {
            "email": email,
            "delivered_at": None,
            "first_opened_at": None,
            "open_count": 0,
            "first_clicked_at": None,
            "click_count": 0,
            "clicked_urls": [],
            "bounced_at": None,
            "complained_at": None,
        }
        for _, email in sends
    }

    for rid, etype, event_at, url in ev_result.all():
        email = email_by_rid.get(rid)
        if not email:
            continue
        row = events_by_email.setdefault(email, {
            "email": email, "delivered_at": None, "first_opened_at": None,
            "open_count": 0, "first_clicked_at": None, "click_count": 0,
            "clicked_urls": [], "bounced_at": None, "complained_at": None,
        })
        if etype == "email.delivered" and not row["delivered_at"]:
            row["delivered_at"] = event_at
        elif etype == "email.opened":
            row["open_count"] += 1
            if not row["first_opened_at"]:
                row["first_opened_at"] = event_at
        elif etype == "email.clicked":
            row["click_count"] += 1
            if not row["first_clicked_at"]:
                row["first_clicked_at"] = event_at
            if url and url not in row["clicked_urls"]:
                row["clicked_urls"].append(url)
        elif etype == "email.bounced" and not row["bounced_at"]:
            row["bounced_at"] = event_at
        elif etype == "email.complained" and not row["complained_at"]:
            row["complained_at"] = event_at

    # Sort: clicked first, then opened, then everyone else
    def sort_key(r: dict):
        return (
            0 if r["first_clicked_at"] else (1 if r["first_opened_at"] else 2),
            r["email"].lower(),
        )

    return sorted(events_by_email.values(), key=sort_key)

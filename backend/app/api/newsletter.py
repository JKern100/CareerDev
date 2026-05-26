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
from app.models.newsletter import NewsletterIssue, NewsletterSubscriber
from app.models.user import EmailLog
from app.services.email import (
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
    id: str
    email: str
    status: str
    source: str | None
    created_at: datetime
    confirmed_at: datetime | None
    unsubscribed_at: datetime | None


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


@admin_router.post("/issues/{issue_id}/send")
async def admin_send_issue(
    issue_id: UUID,
    force: bool = Query(False, description="Re-send to subscribers who already received this issue"),
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Send the issue to all active subscribers. Idempotent: skips recipients already logged."""
    issue = await db.get(NewsletterIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if issue.status == "draft":
        raise HTTPException(status_code=400, detail="Publish the issue before sending")

    # Build the public issue URL
    issue_url = f"{settings.FRONTEND_URL}/newsletter/{issue.slug}"

    # Find active subscribers
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.status == "active")
    )
    subscribers = result.scalars().all()

    sent = 0
    failed = 0
    skipped = 0
    issue_type_tag = f"newsletter:{issue.slug}"

    for sub in subscribers:
        if not force:
            # Skip recipients already sent this specific issue (subject is per-issue, so use subject as marker)
            already = await db.execute(
                select(func.count())
                .select_from(EmailLog)
                .where(
                    EmailLog.to_email == sub.email,
                    EmailLog.email_type == "newsletter_issue",
                    EmailLog.subject == issue.subject,
                    EmailLog.status == "sent",
                )
            )
            if (already.scalar() or 0) > 0:
                skipped += 1
                continue

        ok = await send_newsletter_issue(
            to_email=sub.email,
            subject=issue.subject,
            teaser_md=issue.teaser_md,
            issue_url=issue_url,
            unsub_token=sub.unsub_token,
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
        "total_subscribers": len(subscribers),
        "tag": issue_type_tag,
    }


@admin_router.get("/subscribers", response_model=list[SubscriberOut])
async def admin_list_subscribers(
    status_filter: str | None = Query(None, alias="status"),
    _=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(NewsletterSubscriber).order_by(NewsletterSubscriber.created_at.desc())
    if status_filter:
        q = q.where(NewsletterSubscriber.status == status_filter)
    result = await db.execute(q)
    return [
        SubscriberOut(
            id=str(s.id),
            email=s.email,
            status=s.status,
            source=s.source,
            created_at=s.created_at,
            confirmed_at=s.confirmed_at,
            unsubscribed_at=s.unsubscribed_at,
        )
        for s in result.scalars().all()
    ]


@admin_router.get("/stats")
async def admin_stats(_=Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(NewsletterSubscriber))).scalar() or 0
    active = (
        await db.execute(
            select(func.count())
            .select_from(NewsletterSubscriber)
            .where(NewsletterSubscriber.status == "active")
        )
    ).scalar() or 0
    pending = (
        await db.execute(
            select(func.count())
            .select_from(NewsletterSubscriber)
            .where(NewsletterSubscriber.status == "pending")
        )
    ).scalar() or 0
    unsubbed = (
        await db.execute(
            select(func.count())
            .select_from(NewsletterSubscriber)
            .where(NewsletterSubscriber.status == "unsubscribed")
        )
    ).scalar() or 0
    return {"total": total, "active": active, "pending": pending, "unsubscribed": unsubbed}

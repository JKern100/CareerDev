"""Webhook endpoints. Unauthenticated — verified by signature only."""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.email_event import EmailEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# In-memory counters for debugging webhook plumbing. Reset on process restart.
# Distinguish "Resend never hits us" from "Resend hits us but signature fails".
_HITS = {
    "total": 0,
    "signature_ok": 0,
    "signature_failed": 0,
    "no_secret": 0,
    "malformed": 0,
    "last_hit_at": None,
    "last_failure_at": None,
    "last_failure_reason": None,
}


def get_webhook_hits() -> dict:
    """Expose counters to the admin diagnostic endpoint."""
    return dict(_HITS)


@router.post("/resend")
async def resend_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Resend webhook receiver.

    Verifies the Svix signature against RESEND_WEBHOOK_SECRET, then records
    the event in email_events. Idempotent — duplicate deliveries are dropped
    by the unique constraint.
    """
    _HITS["total"] += 1
    _HITS["last_hit_at"] = datetime.utcnow().isoformat()
    logger.info("Resend webhook hit #%d", _HITS["total"])

    secret = settings.RESEND_WEBHOOK_SECRET.strip()
    if not secret:
        _HITS["no_secret"] += 1
        _HITS["last_failure_at"] = _HITS["last_hit_at"]
        _HITS["last_failure_reason"] = "RESEND_WEBHOOK_SECRET not set"
        logger.warning("RESEND_WEBHOOK_SECRET not configured — webhook rejected")
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    raw_body = await request.body()
    headers = dict(request.headers)

    try:
        from svix.webhooks import Webhook, WebhookVerificationError
        wh = Webhook(secret)
        payload = wh.verify(raw_body, headers)
    except WebhookVerificationError as exc:
        _HITS["signature_failed"] += 1
        _HITS["last_failure_at"] = datetime.utcnow().isoformat()
        _HITS["last_failure_reason"] = f"Signature verification failed: {exc}"
        logger.warning("Invalid Resend webhook signature: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid signature")
    except Exception as exc:
        _HITS["last_failure_at"] = datetime.utcnow().isoformat()
        _HITS["last_failure_reason"] = f"Verification error: {exc}"
        logger.exception("Webhook verification error")
        raise HTTPException(status_code=500, detail=f"Verification failed: {exc}")

    _HITS["signature_ok"] += 1

    event_type = payload.get("type") or "unknown"
    data = payload.get("data") or {}
    resend_id = data.get("email_id") or ""
    to_list = data.get("to") or []
    to_email = (to_list[0] if to_list else "").strip()
    created_at_str = payload.get("created_at") or data.get("created_at") or ""

    try:
        event_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except (ValueError, AttributeError):
        event_at = datetime.utcnow()

    url = None
    if event_type == "email.clicked":
        click = data.get("click") or {}
        url = click.get("link") or click.get("url")

    if not resend_id or not to_email:
        _HITS["malformed"] += 1
        logger.warning("Webhook event missing email_id or to: type=%s", event_type)
        return {"detail": "ignored", "reason": "missing fields"}

    event = EmailEvent(
        resend_id=resend_id,
        to_email=to_email,
        event_type=event_type,
        url=url,
        event_at=event_at,
        raw_json=json.dumps(payload)[:8000],
    )
    db.add(event)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        logger.info("Duplicate webhook event dropped: %s / %s", resend_id, event_type)
        return {"detail": "duplicate"}

    return {"detail": "ok"}

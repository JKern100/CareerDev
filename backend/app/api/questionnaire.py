import asyncio
import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer, Question
from app.services.activity import log_activity
from app.services.email import send_stage1_results_email
from app.services.scoring import score_pathways

logger = logging.getLogger(__name__)
from app.schemas.questionnaire import (
    QuestionOut,
    QuestionSetOut,
    ExistingAnswerOut,
    AnswerIn,
    AnswerBatchIn,
    AnswerOut,
    SubmitAnswersOut,
    ModuleStatusOut,
    QuestionnaireProgressOut,
    CoreScreenOut,
)
from app.services.routing import (
    get_question_bank,
    get_questions_for_module,
    get_next_module,
    get_unanswered_questions,
    is_module_complete,
    check_consent_block,
    MODULE_LABELS,
    CORE_MODULES,
    ALL_PROGRESSIVE_SCREENS,
    TIER1_SCREENS,
    TIER2_SCREENS,
    TIER3_SCREENS,
    get_next_progressive_screen,
    is_tier1_complete,
    is_tier2_complete,
    is_tier3_complete,
    is_all_progressive_complete,
    get_screen_questions,
    get_screen_by_id,
    get_tier_screens,
)
from app.api.deps import get_current_user
from app.models.payment import Subscription
from app.services.payment import is_premium

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])


async def _get_answered_ids(user_id, db: AsyncSession) -> set[str]:
    result = await db.execute(
        select(Answer.question_id).where(Answer.user_id == user_id)
    )
    return {row[0] for row in result.all()}


async def _get_answers_dict(user_id, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Answer).where(Answer.user_id == user_id)
    )
    answers = result.scalars().all()
    return {
        a.question_id: {
            "value": a.value_json.get("value") if a.value_json else None,
            "confidence": a.confidence,
            "evidence_refs": a.evidence_refs,
        }
        for a in answers
    }


async def _get_existing_answers_for_module(user_id, module: str, db: AsyncSession) -> list[ExistingAnswerOut]:
    """Get existing answers for questions in the given module."""
    module_question_ids = {q.question_id for q in get_questions_for_module(module)}
    result = await db.execute(
        select(Answer).where(
            Answer.user_id == user_id,
            Answer.question_id.in_(module_question_ids),
        )
    )
    answers = result.scalars().all()
    return [
        ExistingAnswerOut(
            question_id=a.question_id,
            value=a.value_json.get("value") if a.value_json else None,
            confidence=a.confidence,
        )
        for a in answers
    ]


def _build_question_out(q) -> QuestionOut:
    return QuestionOut(
        question_id=q.question_id,
        module=q.module,
        prompt=q.prompt,
        question_type=q.question_type,
        required=q.required,
        options=q.options_json,
        min_val=q.min_val,
        max_val=q.max_val,
        tags=q.tags_json,
        help_text=q.help_text,
        option_hints=q.option_hints,
    )


@router.get("/core/next", response_model=CoreScreenOut)
async def get_next_core(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the next progressive screen (Tier 1 or Tier 2)."""
    answered_ids = await _get_answered_ids(user.id, db)
    t1 = is_tier1_complete(answered_ids)
    t2 = is_tier2_complete(answered_ids)
    t3 = is_tier3_complete(answered_ids)
    total = len(ALL_PROGRESSIVE_SCREENS)

    if is_all_progressive_complete(answered_ids):
        return CoreScreenOut(
            screen_id="done",
            screen_label="Complete",
            screen_number=total,
            total_screens=total,
            tier=3,
            tier1_complete=True,
            tier2_complete=True,
            tier3_complete=True,
            questions=[],
            existing_answers=[],
        )

    screen = get_next_progressive_screen(answered_ids)
    if screen is None:
        return CoreScreenOut(
            screen_id="done",
            screen_label="Complete",
            screen_number=total,
            total_screens=total,
            tier=3,
            tier1_complete=t1,
            tier2_complete=t2,
            tier3_complete=t3,
            questions=[],
            existing_answers=[],
        )

    # Gate Tier 2 and 3 behind paid subscription
    screen_tier = screen.get("tier", 1)
    if screen_tier >= 2:
        sub_result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        sub = sub_result.scalars().first()
        if not is_premium(sub) and not getattr(user, "_impersonated", False):
            return CoreScreenOut(
                screen_id="upgrade_required",
                screen_label="Upgrade to Pro",
                screen_number=ALL_PROGRESSIVE_SCREENS.index(screen) + 1,
                total_screens=total,
                tier=screen_tier,
                tier1_complete=t1,
                tier2_complete=t2,
                tier3_complete=t3,
                questions=[],
                existing_answers=[],
            )

    screen_number = ALL_PROGRESSIVE_SCREENS.index(screen) + 1
    questions = get_screen_questions(screen)

    qids = {q.question_id for q in questions}
    result = await db.execute(
        select(Answer).where(
            Answer.user_id == user.id,
            Answer.question_id.in_(qids),
        )
    )
    existing = [
        ExistingAnswerOut(
            question_id=a.question_id,
            value=a.value_json.get("value") if a.value_json else None,
            confidence=a.confidence,
        )
        for a in result.scalars().all()
    ]

    return CoreScreenOut(
        screen_id=screen["id"],
        screen_label=screen["label"],
        screen_number=screen_number,
        total_screens=total,
        tier=screen.get("tier", 1),
        tier1_complete=t1,
        tier2_complete=t2,
        tier3_complete=t3,
        questions=[_build_question_out(q) for q in questions],
        existing_answers=existing,
    )


@router.get("/core/screen/{screen_id}", response_model=CoreScreenOut)
async def get_core_screen_by_id(
    screen_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific screen by ID (for reviewing completed answers)."""
    screen = get_screen_by_id(screen_id)
    if screen is None:
        raise HTTPException(status_code=404, detail=f"Screen not found: {screen_id}")

    answered_ids = await _get_answered_ids(user.id, db)
    t1 = is_tier1_complete(answered_ids)
    t2 = is_tier2_complete(answered_ids)
    t3 = is_tier3_complete(answered_ids)
    total = len(ALL_PROGRESSIVE_SCREENS)

    screen_number = ALL_PROGRESSIVE_SCREENS.index(screen) + 1
    questions = get_screen_questions(screen)

    qids = {q.question_id for q in questions}
    result = await db.execute(
        select(Answer).where(
            Answer.user_id == user.id,
            Answer.question_id.in_(qids),
        )
    )
    existing = [
        ExistingAnswerOut(
            question_id=a.question_id,
            value=a.value_json.get("value") if a.value_json else None,
            confidence=a.confidence,
        )
        for a in result.scalars().all()
    ]

    return CoreScreenOut(
        screen_id=screen["id"],
        screen_label=screen["label"],
        screen_number=screen_number,
        total_screens=total,
        tier=screen.get("tier", 1),
        tier1_complete=t1,
        tier2_complete=t2,
        tier3_complete=t3,
        questions=[_build_question_out(q) for q in questions],
        existing_answers=existing,
    )


@router.get("/next", response_model=QuestionSetOut)
async def get_next_questions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the next set of questions for the user based on adaptive routing."""
    answered_ids = await _get_answered_ids(user.id, db)
    answers_dict = await _get_answers_dict(user.id, db)

    if check_consent_block(answers_dict):
        raise HTTPException(status_code=403, detail="Consent declined. Cannot proceed with questionnaire.")

    module = get_next_module(user.current_module, answered_ids)
    if module is None:
        raise HTTPException(status_code=400, detail="Questionnaire complete")

    unanswered = get_unanswered_questions(module, answered_ids)
    existing = await _get_existing_answers_for_module(user.id, module, db)
    total_questions = len(get_question_bank())
    answered_count = len(answered_ids)
    progress = answered_count / total_questions if total_questions > 0 else 0

    return QuestionSetOut(
        module=module,
        module_label=MODULE_LABELS.get(module, module),
        questions=[_build_question_out(q) for q in unanswered],
        existing_answers=existing,
        progress=round(progress, 3),
        total_questions=total_questions,
        answered_questions=answered_count,
    )


@router.get("/module/{module}", response_model=QuestionSetOut)
async def get_module_questions(
    module: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all questions for a specific module (for tab-based navigation)."""
    if module not in CORE_MODULES:
        raise HTTPException(status_code=400, detail=f"Invalid module: {module}")

    answered_ids = await _get_answered_ids(user.id, db)
    module_questions = get_questions_for_module(module)
    existing = await _get_existing_answers_for_module(user.id, module, db)
    total_questions = len(get_question_bank())
    answered_count = len(answered_ids)
    progress = answered_count / total_questions if total_questions > 0 else 0

    return QuestionSetOut(
        module=module,
        module_label=MODULE_LABELS.get(module, module),
        questions=[_build_question_out(q) for q in module_questions],
        existing_answers=existing,
        progress=round(progress, 3),
        total_questions=total_questions,
        answered_questions=answered_count,
    )


@router.post("/answer", response_model=SubmitAnswersOut)
async def submit_answers(
    data: AnswerBatchIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit one or more answers. Returns next module info."""
    valid_ids = {q.question_id for q in get_question_bank()}
    qbank_map = {q.question_id: q for q in get_question_bank()}
    results = []

    # Ensure all submitted question_ids exist in the DB (not just the CSV).
    # This handles the case where new questions were added to the CSV but the
    # server hasn't restarted to run _seed_questions() yet.
    submitted_qids = {ans.question_id for ans in data.answers}
    db_result = await db.execute(
        select(Question.id).where(Question.id.in_(submitted_qids))
    )
    existing_db_qids = {row[0] for row in db_result.all()}
    for qid in submitted_qids - existing_db_qids:
        q = qbank_map.get(qid)
        if q:
            db.add(Question(
                id=q.question_id, module=q.module, prompt=q.prompt,
                question_type=q.question_type, required=q.required,
                options_json=q.options_json, min_val=q.min_val,
                max_val=q.max_val, route_if_json=q.route_if_json,
                tags_json=q.tags_json,
            ))
    await db.flush()

    for ans in data.answers:
        if ans.question_id not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Invalid question_id: {ans.question_id}")

        # Upsert answer
        existing = await db.execute(
            select(Answer).where(
                Answer.user_id == user.id,
                Answer.question_id == ans.question_id,
            )
        )
        answer = existing.scalar_one_or_none()

        if answer:
            answer.value_json = {"value": ans.value}
            answer.confidence = ans.confidence
        else:
            answer = Answer(
                user_id=user.id,
                question_id=ans.question_id,
                value_json={"value": ans.value},
                confidence=ans.confidence,
            )
            db.add(answer)

        results.append(answer)

    # Flush so the DB query below sees the new answers
    await db.flush()

    # Recompute answered_ids from DB (now includes flushed answers)
    answered_ids = await _get_answered_ids(user.id, db)

    # Auto-enable report regeneration when a new tier milestone is reached
    t1_now = is_tier1_complete(answered_ids)
    t2_now = is_tier2_complete(answered_ids)
    t3_now = is_tier3_complete(answered_ids)
    # Check what was already complete before this submission
    # (pre-flush IDs minus the just-submitted ones)
    pre_ids = answered_ids - {a.question_id for a in data.answers}
    t1_was = is_tier1_complete(pre_ids)
    t2_was = is_tier2_complete(pre_ids)
    t3_was = is_tier3_complete(pre_ids)

    newly_completed_tier = (
        (t1_now and not t1_was)
        or (t2_now and not t2_was)
        or (t3_now and not t3_was)
    )
    if newly_completed_tier:
        user.can_regenerate_summary = True
        user.can_regenerate = True
        user.last_tier_completed_at = datetime.utcnow()

    # On first-time Stage 1 completion, email the user their top match
    if (
        t1_now
        and not t1_was
        and user.stage1_email_sent_at is None
        and user.email_nudges_enabled
    ):
        try:
            ans_result = await db.execute(select(Answer).where(Answer.user_id == user.id))
            answers_dict = {
                a.question_id: {
                    "value": a.value_json.get("value") if a.value_json else None,
                    "value_json": a.value_json,
                    "confidence": a.confidence,
                    "evidence_refs": a.evidence_refs,
                }
                for a in ans_result.scalars().all()
            }
            scored = score_pathways(answers_dict)
            if scored:
                top = scored[0]
                match_pct = max(0, min(100, int(round(top.adjusted_score * 100))))
                if not user.unsubscribe_token:
                    user.unsubscribe_token = secrets.token_urlsafe(32)
                user.stage1_email_sent_at = datetime.utcnow()
                asyncio.create_task(
                    send_stage1_results_email(
                        to_email=user.email,
                        user_name=user.full_name,
                        top_pathway_name=top.pathway_name,
                        match_pct=match_pct,
                        unsubscribe_token=user.unsubscribe_token,
                    )
                )
        except Exception:
            logger.exception("Failed to queue stage 1 results email for user %s", user.id)

    # Determine the current module from the submitted answers
    qid_to_module = {q.question_id: q.module for q in get_question_bank()}
    submitted_modules = set()
    for ans in data.answers:
        module = qid_to_module.get(ans.question_id)
        if module:
            submitted_modules.add(module)

    # Check if the submitted module(s) are now complete
    current_submitted_module = sorted(submitted_modules)[0] if submitted_modules else user.current_module
    module_complete = False
    if current_submitted_module:
        module_complete = is_module_complete(current_submitted_module, answered_ids)

    # Find next module
    next_module = get_next_module(current_submitted_module, answered_ids)
    questionnaire_complete = next_module is None

    # Update user state
    user.current_module = next_module
    if questionnaire_complete:
        user.questionnaire_completed = True

    await db.commit()
    for r in results:
        await db.refresh(r)

    total_questions = len(get_question_bank())
    progress = len(answered_ids) / total_questions if total_questions > 0 else 0

    return SubmitAnswersOut(
        answers=[
            AnswerOut(
                id=r.id,
                question_id=r.question_id,
                value_json=r.value_json,
                confidence=r.confidence,
                evidence_refs=r.evidence_refs,
            )
            for r in results
        ],
        next_module=next_module,
        next_module_label=MODULE_LABELS.get(next_module, None) if next_module else None,
        module_complete=module_complete,
        questionnaire_complete=questionnaire_complete,
        progress=round(progress, 3),
    )


@router.post("/complete")
async def mark_complete(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark questionnaire as completed. Requires at least Tier 2 questions answered."""
    answered_ids = await _get_answered_ids(user.id, db)
    if not is_tier2_complete(answered_ids):
        raise HTTPException(
            status_code=400,
            detail="Please complete at least the first two stages of the questionnaire before marking as complete.",
        )
    user.questionnaire_completed = True
    await log_activity(db, user, "questionnaire_completed")
    await db.commit()
    return {"detail": "Questionnaire marked as complete"}


@router.get("/progress", response_model=QuestionnaireProgressOut)
async def get_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current questionnaire progress with per-module breakdown."""
    answered_ids = await _get_answered_ids(user.id, db)
    total_questions = len(get_question_bank())

    modules_status = []
    completed_modules = 0
    for module in CORE_MODULES:
        module_qs = get_questions_for_module(module)
        required_qs = [q for q in module_qs if q.required]
        module_answered = {q.question_id for q in module_qs if q.question_id in answered_ids}
        required_answered = {q.question_id for q in required_qs if q.question_id in answered_ids}
        complete = len(required_answered) == len(required_qs)
        if complete:
            completed_modules += 1

        modules_status.append(ModuleStatusOut(
            module=module,
            module_label=MODULE_LABELS.get(module, module),
            total_questions=len(module_qs),
            answered_questions=len(module_answered),
            required_questions=len(required_qs),
            required_answered=len(required_answered),
            is_complete=complete,
        ))

    def _count_screens_done(screens: list[dict], aids: set[str]) -> int:
        return sum(1 for s in screens if all(qid in aids for qid in s["questions"]))

    return QuestionnaireProgressOut(
        total_modules=len(CORE_MODULES),
        completed_modules=completed_modules,
        total_questions=total_questions,
        answered_questions=len(answered_ids),
        current_module=user.current_module,
        current_question_id=user.current_question_id,
        progress_pct=round(len(answered_ids) / total_questions * 100, 1) if total_questions > 0 else 0,
        modules=modules_status,
        # If questionnaire was already marked complete (legacy user), honour that
        # even if new questions were added to tiers after their completion.
        tier1_complete=is_tier1_complete(answered_ids) or user.questionnaire_completed,
        tier2_complete=is_tier2_complete(answered_ids) or user.questionnaire_completed,
        tier3_complete=is_tier3_complete(answered_ids) or user.questionnaire_completed,
        tier1_screens_done=len(TIER1_SCREENS) if user.questionnaire_completed else _count_screens_done(TIER1_SCREENS, answered_ids),
        tier2_screens_done=len(TIER2_SCREENS) if user.questionnaire_completed else _count_screens_done(TIER2_SCREENS, answered_ids),
        tier3_screens_done=len(TIER3_SCREENS) if user.questionnaire_completed else _count_screens_done(TIER3_SCREENS, answered_ids),
    )

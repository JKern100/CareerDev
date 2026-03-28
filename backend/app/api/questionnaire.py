from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer
from app.services.activity import log_activity
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
    get_next_progressive_screen,
    is_tier1_complete,
    is_tier2_complete,
    is_all_progressive_complete,
    get_screen_questions,
)
from app.api.deps import get_current_user

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
    total = len(ALL_PROGRESSIVE_SCREENS)

    if is_all_progressive_complete(answered_ids):
        return CoreScreenOut(
            screen_id="done",
            screen_label="Complete",
            screen_number=total,
            total_screens=total,
            tier=2,
            tier1_complete=True,
            tier2_complete=True,
            questions=[],
            existing_answers=[],
            core_complete=True,
        )

    screen = get_next_progressive_screen(answered_ids)
    if screen is None:
        return CoreScreenOut(
            screen_id="done",
            screen_label="Complete",
            screen_number=total,
            total_screens=total,
            tier=2,
            tier1_complete=t1,
            tier2_complete=t2,
            questions=[],
            existing_answers=[],
            core_complete=t1,
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
        questions=[_build_question_out(q) for q in questions],
        existing_answers=existing,
        core_complete=t1,
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
    results = []

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

    # Determine the current module from the submitted answers
    submitted_modules = set()
    for ans in data.answers:
        for q in get_question_bank():
            if q.question_id == ans.question_id:
                submitted_modules.add(q.module)
                break

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

    return QuestionnaireProgressOut(
        total_modules=len(CORE_MODULES),
        completed_modules=completed_modules,
        total_questions=total_questions,
        answered_questions=len(answered_ids),
        current_module=user.current_module,
        current_question_id=user.current_question_id,
        progress_pct=round(len(answered_ids) / total_questions * 100, 1) if total_questions > 0 else 0,
        modules=modules_status,
        core_complete=is_tier1_complete(answered_ids),
        tier2_complete=is_tier2_complete(answered_ids),
    )

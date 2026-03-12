from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.questionnaire import Answer
from app.schemas.questionnaire import (
    QuestionOut,
    QuestionSetOut,
    AnswerIn,
    AnswerBatchIn,
    AnswerOut,
    QuestionnaireProgressOut,
)
from app.services.routing import (
    get_question_bank,
    get_questions_for_module,
    get_next_module,
    get_unanswered_questions,
    check_consent_block,
    MODULE_LABELS,
    CORE_MODULES,
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


@router.get("/next", response_model=QuestionSetOut)
async def get_next_questions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the next set of questions for the user based on adaptive routing."""
    answered_ids = await _get_answered_ids(user.id, db)
    answers_dict = await _get_answers_dict(user.id, db)

    # Check consent block
    if check_consent_block(answers_dict):
        raise HTTPException(status_code=403, detail="Consent declined. Cannot proceed with questionnaire.")

    module = get_next_module(user.current_module, answered_ids)
    if module is None:
        raise HTTPException(status_code=200, detail="Questionnaire complete")

    unanswered = get_unanswered_questions(module, answered_ids)

    total_questions = len(get_question_bank())
    answered_count = len(answered_ids)
    progress = answered_count / total_questions if total_questions > 0 else 0

    questions_out = [
        QuestionOut(
            question_id=q.question_id,
            module=q.module,
            prompt=q.prompt,
            question_type=q.question_type,
            required=q.required,
            options=q.options_json,
            min_val=q.min_val,
            max_val=q.max_val,
            tags=q.tags_json,
        )
        for q in unanswered
    ]

    return QuestionSetOut(
        module=module,
        module_label=MODULE_LABELS.get(module, module),
        questions=questions_out,
        progress=round(progress, 3),
        total_questions=total_questions,
        answered_questions=answered_count,
    )


@router.post("/answer", response_model=list[AnswerOut])
async def submit_answers(
    data: AnswerBatchIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit one or more answers."""
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

    # Update user's current position
    answered_ids = await _get_answered_ids(user.id, db)
    for ans in data.answers:
        answered_ids.add(ans.question_id)

    next_module = get_next_module(user.current_module, answered_ids)
    user.current_module = next_module
    if next_module is None:
        user.questionnaire_completed = True

    await db.commit()
    for r in results:
        await db.refresh(r)

    return results


@router.post("/complete")
async def mark_complete(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark questionnaire as completed."""
    user.questionnaire_completed = True
    await db.commit()
    return {"detail": "Questionnaire marked as complete"}


@router.get("/progress", response_model=QuestionnaireProgressOut)
async def get_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current questionnaire progress."""
    answered_ids = await _get_answered_ids(user.id, db)
    total_questions = len(get_question_bank())

    # Count completed modules
    completed_modules = 0
    for module in CORE_MODULES:
        module_qs = get_questions_for_module(module)
        required_ids = {q.question_id for q in module_qs if q.required}
        if required_ids.issubset(answered_ids):
            completed_modules += 1

    return QuestionnaireProgressOut(
        total_modules=len(CORE_MODULES),
        completed_modules=completed_modules,
        total_questions=total_questions,
        answered_questions=len(answered_ids),
        current_module=user.current_module,
        current_question_id=user.current_question_id,
        progress_pct=round(len(answered_ids) / total_questions * 100, 1) if total_questions > 0 else 0,
    )

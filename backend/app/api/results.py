"""GET /results endpoint — serves the stored Markdown analysis report."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.report import AnalysisReport
from app.schemas.analysis import CareerAnalysisOut
from app.api.deps import get_current_user

router = APIRouter(tags=["results"])


@router.get("/results", response_model=CareerAnalysisOut)
async def get_results(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's most recent AI-generated career analysis report.

    If no report exists, returns a message telling them to complete the
    questionnaire and generate their results.
    """
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.user_id == user.id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=404,
            detail=(
                "No analysis report found. Please complete the questionnaire "
                "and click 'Generate my results' to create your personalised "
                "career transition report."
            ),
        )

    return CareerAnalysisOut(
        markdown_report=report.markdown_report,
        model_name=report.model_name,
        created_at=report.created_at,
    )

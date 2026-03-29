"""Action plan service.

Parses the career analysis markdown report to extract concrete action steps,
combines with credential data from pathways, and creates a structured action plan.
"""

import logging
import re
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_plan import ActionStep
from app.models.report import AnalysisReport
from app.models.pathway import PathwayScore, Pathway

logger = logging.getLogger(__name__)


def _parse_first_steps(markdown: str) -> list[dict]:
    """Extract 'First steps — next 30–90 days' from each pathway section.

    Returns list of {pathway_name, steps: [str, ...]}
    """
    results = []

    # Split by pathway headers: ### 1. Pathway Name, ### 2. Pathway Name, etc.
    pathway_pattern = re.compile(
        r"###\s*\d+\.\s*(.+?)(?:\n|$)"
    )
    # Find first steps sections
    steps_pattern = re.compile(
        r"\*\*First steps\s*(?:—|–|-)\s*next\s+30.?90\s+days:?\*\*\s*\n((?:\d+\..+\n?)+)",
        re.IGNORECASE,
    )

    # Find all pathway headers and their positions
    headers = list(pathway_pattern.finditer(markdown))

    for i, header in enumerate(headers):
        pathway_name = header.group(1).strip()
        # Get the text block for this pathway (up to the next ### header)
        start = header.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(markdown)
        block = markdown[start:end]

        match = steps_pattern.search(block)
        if match:
            raw = match.group(1)
            steps = []
            for line in raw.strip().split("\n"):
                line = line.strip()
                # Remove numbering (1. 2. 3. etc.)
                cleaned = re.sub(r"^\d+\.\s*", "", line).strip()
                if cleaned:
                    steps.append(cleaned)
            if steps:
                results.append({"pathway_name": pathway_name, "steps": steps})

    return results


def _parse_this_week(markdown: str) -> list[str]:
    """Extract 'What to Do This Week' actions."""
    pattern = re.compile(
        r"##\s*What to Do This Week\s*\n((?:.+\n?)+?)(?:\n---|\n##|\n\*|\Z)",
        re.IGNORECASE,
    )
    match = pattern.search(markdown)
    if not match:
        return []

    raw = match.group(1)
    steps = []
    for line in raw.strip().split("\n"):
        line = line.strip()
        cleaned = re.sub(r"^\d+\.\s*", "", line).strip()
        cleaned = re.sub(r"^\*\*\d+\.\*\*\s*", "", cleaned).strip()
        cleaned = re.sub(r"^[-*]\s*", "", cleaned).strip()
        if cleaned and len(cleaned) > 5:
            steps.append(cleaned)
    return steps


async def generate_action_plan(user_id: UUID, db: AsyncSession) -> list[ActionStep]:
    """Generate a structured action plan from the user's career analysis.

    Parses the markdown report for first steps and combines with
    credential data from pathways. Replaces any existing plan.
    """
    # Load latest analysis report
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.user_id == user_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    if not report:
        return []

    # Load top pathway scores with pathway metadata
    result = await db.execute(
        select(PathwayScore, Pathway)
        .join(Pathway, PathwayScore.pathway_id == Pathway.id)
        .where(PathwayScore.user_id == user_id)
        .order_by(PathwayScore.adjusted_score.desc())
        .limit(5)
    )
    scored_pathways = result.all()

    # Build pathway lookup
    pathway_map: dict[str, tuple] = {}
    for score, pathway in scored_pathways:
        # Normalize pathway name for matching
        pathway_map[pathway.name.lower().strip()] = (score, pathway)
        # Also store by first significant words for fuzzy matching
        short = pathway.name.split("—")[0].strip().lower() if "—" in pathway.name else pathway.name.lower().strip()
        pathway_map[short] = (score, pathway)

    # Delete existing action steps for this user
    await db.execute(delete(ActionStep).where(ActionStep.user_id == user_id))

    steps: list[ActionStep] = []
    order = 0

    # 1. Parse "This Week" universal actions
    this_week = _parse_this_week(report.markdown_report)
    for text in this_week:
        order += 1
        steps.append(ActionStep(
            user_id=user_id,
            pathway_id=None,
            pathway_name=None,
            category="this_week",
            title=text,
            sort_order=order,
        ))

    # 2. Parse first steps per pathway from the markdown
    parsed_pathways = _parse_first_steps(report.markdown_report)

    for parsed in parsed_pathways:
        pname = parsed["pathway_name"]

        # Try to match to a scored pathway
        matched_pathway = None
        matched_score = None
        pname_lower = pname.lower().strip()

        for key, (score, pathway) in pathway_map.items():
            if key in pname_lower or pname_lower in key:
                matched_pathway = pathway
                matched_score = score
                break

        pid = matched_pathway.id if matched_pathway else None
        display_name = matched_pathway.name if matched_pathway else pname

        for text in parsed["steps"]:
            order += 1
            steps.append(ActionStep(
                user_id=user_id,
                pathway_id=pid,
                pathway_name=display_name,
                category="first_step",
                title=text,
                sort_order=order,
            ))

    # 3. Add credentials from top pathways
    seen_urls = set()
    for score, pathway in scored_pathways:
        for cred in pathway.recommended_credentials or []:
            url = cred.get("source_url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                order += 1
                steps.append(ActionStep(
                    user_id=user_id,
                    pathway_id=pathway.id,
                    pathway_name=pathway.name,
                    category="credential",
                    title=cred["name"],
                    description=f"Recommended for {pathway.name}",
                    url=url,
                    duration=cred.get("duration", ""),
                    sort_order=order,
                ))

    # Save
    for step in steps:
        db.add(step)
    await db.commit()

    return steps

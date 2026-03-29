"""AI Career Coach service.

Builds a context-rich system prompt from the user's questionnaire data,
career analysis, and conversation history, then calls the Gemini API
for an ongoing coaching conversation.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.questionnaire import Answer, Question
from app.models.report import Report, AnalysisReport
from app.models.coach import CoachMessage, CoachGoal
from app.models.pathway import PathwayScore, Pathway
from app.services.routing import get_question_bank

logger = logging.getLogger(__name__)


def _build_career_context(
    user_name: str | None,
    answers: dict[str, dict],
    summary_text: str | None,
    analysis_markdown: str | None,
    top_pathways: list[dict],
    goals: list[dict],
) -> str:
    """Build the career-context block injected into the system prompt."""
    qbank = {q.question_id: q for q in get_question_bank()}

    parts = []

    # User identity
    name = user_name or "the user"
    parts.append(f"USER NAME: {name}")

    # Key profile answers
    key_questions = {
        "Q001": "Country of residence",
        "Q004": "Career goals",
        "Q008": "Communication style preference",
        "Q009": "Urgency for change (1-10)",
        "Q011": "Years in aviation",
        "Q012": "Employer type",
        "Q014": "Roles held",
        "Q024": "Peak professional moment",
        "Q025": "Most difficult professional moment",
        "Q026": "Burnout level (1-10)",
        "Q057": "Non-negotiables",
        "Q061": "Visa/work authorization",
        "Q065": "Savings runway (months)",
        "Q066": "Minimum monthly salary needed",
        "Q089": "Target salary",
        "Q097": "Highest education level",
        "Q100": "Study hours available per week",
        "Q106": "Career families of interest",
        "Q107": "Dream role (if couldn't fail)",
        "Q108": "Biggest concern about transition",
    }

    parts.append("\nKEY PROFILE DATA:")
    for qid, label in key_questions.items():
        ans = answers.get(qid)
        if ans and ans.get("value") is not None:
            val = ans["value"]
            if isinstance(val, list):
                val = ", ".join(str(v) for v in val)
            parts.append(f"- {label}: {val}")

    # Top pathway matches
    if top_pathways:
        parts.append("\nTOP CAREER PATHWAY MATCHES:")
        for pw in top_pathways[:5]:
            parts.append(f"- {pw['name']} (score: {pw['score']}/10)")
            if pw.get("typical_roles"):
                parts.append(f"  Typical roles: {', '.join(pw['typical_roles'][:4])}")

    # Summary excerpt (first 500 chars)
    if summary_text:
        parts.append(f"\nPROFILE SUMMARY EXCERPT:\n{summary_text[:800]}")

    # Analysis excerpt (first 1000 chars)
    if analysis_markdown:
        parts.append(f"\nCAREER ANALYSIS EXCERPT:\n{analysis_markdown[:1500]}")

    # Active goals
    if goals:
        parts.append("\nACTIVE GOALS:")
        for g in goals:
            status = "completed" if g["completed"] else "in progress"
            target = f" (target: {g['target_date']})" if g.get("target_date") else ""
            parts.append(f"- {g['title']}{target} [{status}]")

    return "\n".join(parts)


COACH_SYSTEM_PROMPT = """You are CareerDev's AI Career Coach — a warm, knowledgeable, and direct career advisor specializing in helping aviation professionals (primarily cabin crew) transition to new careers.

You have deep knowledge of:
- Transferable skills from aviation to other industries
- UAE/GCC and global job markets
- Career transition strategies, timelines, and realistic expectations
- Resume/CV optimization, interview preparation, and networking
- Salary negotiation and market benchmarks
- Credential and certification pathways
- Visa and work authorization implications for career changes

PERSONALITY & TONE:
- Be warm but direct — don't waste their time with filler
- Be honest about challenges — don't sugarcoat, but always pair honesty with a path forward
- Reference their specific data when relevant (use their answers, scores, goals)
- Remember context from the conversation — don't repeat advice they've already received
- If they seem discouraged, acknowledge it and re-ground them in their strengths
- Celebrate wins, even small ones

GUIDELINES:
- Keep responses focused and actionable — aim for 150-400 words unless they ask for something detailed
- When giving career advice, always ground it in THEIR specific profile data
- If asked about something outside their profile data, be helpful but note when you're giving general advice vs personalized advice
- Suggest setting goals when appropriate — use the goal-tracking feature
- For interview prep, tailor questions to their target roles and background
- For resume help, reference their specific skills and experience
- Never invent data about the user — only reference what's in their profile
- If they haven't completed the questionnaire yet, encourage them to do so for better advice

{career_context}
"""


async def load_user_career_context(user_id, db: AsyncSession) -> str:
    """Load all relevant career data for a user and build the context string."""
    from app.models.user import User

    # Load user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return ""

    # Load answers
    result = await db.execute(
        select(Answer, Question)
        .join(Question, Answer.question_id == Question.id)
        .where(Answer.user_id == user_id)
    )
    rows = result.all()
    answers = {}
    for answer, question in rows:
        answers[answer.question_id] = {
            "value": answer.value_json,
            "confidence": answer.confidence,
        }

    # Load latest summary
    result = await db.execute(
        select(Report)
        .where(Report.user_id == user_id)
        .order_by(Report.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    summary_text = None
    if report and report.report_json:
        summary_text = report.report_json.get("text", "")

    # Load latest analysis
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.user_id == user_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    analysis_markdown = analysis.markdown_report if analysis else None

    # Load top pathway scores
    result = await db.execute(
        select(PathwayScore, Pathway)
        .join(Pathway, PathwayScore.pathway_id == Pathway.id)
        .where(PathwayScore.user_id == user_id)
        .order_by(PathwayScore.adjusted_score.desc())
        .limit(5)
    )
    top_pathways = []
    for score, pathway in result.all():
        top_pathways.append({
            "name": pathway.name,
            "score": round(score.adjusted_score, 1),
            "typical_roles": pathway.typical_roles or [],
        })

    # Load active goals
    result = await db.execute(
        select(CoachGoal)
        .where(CoachGoal.user_id == user_id)
        .order_by(CoachGoal.created_at.desc())
    )
    goals = [
        {
            "title": g.title,
            "target_date": g.target_date,
            "completed": g.completed,
        }
        for g in result.scalars().all()
    ]

    return _build_career_context(
        user_name=user.full_name,
        answers=answers,
        summary_text=summary_text,
        analysis_markdown=analysis_markdown,
        top_pathways=top_pathways,
        goals=goals,
    )


async def load_conversation_history(user_id, db: AsyncSession, limit: int = 50) -> list[dict]:
    """Load recent conversation messages for context."""
    result = await db.execute(
        select(CoachMessage)
        .where(CoachMessage.user_id == user_id)
        .order_by(CoachMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    # Reverse to chronological order
    messages = list(reversed(messages))
    return [{"role": m.role, "content": m.content} for m in messages]


async def chat_with_coach(
    user_id,
    user_message: str,
    db: AsyncSession,
) -> str:
    """Send a message to the AI coach and get a response.

    Builds full context, calls Gemini, stores both messages, returns the reply.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError(
            "The 'google-generativeai' package is required for the AI coach. "
            "Install it with: pip install google-generativeai"
        )

    api_key = settings.LLM_API_KEY
    if not api_key:
        raise RuntimeError(
            "LLM_API_KEY is not configured. Set the LLM_API_KEY environment variable "
            "to your Gemini API key."
        )

    # Build context
    career_context = await load_user_career_context(user_id, db)
    system_prompt = COACH_SYSTEM_PROMPT.format(career_context=career_context)

    # Load conversation history
    history = await load_conversation_history(user_id, db)

    # Build Gemini conversation
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=settings.LLM_MODEL,
        system_instruction=system_prompt,
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=4000,
            temperature=0.7,
        ),
    )

    # Convert history to Gemini format
    gemini_history = []
    for msg in history:
        gemini_history.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [msg["content"]],
        })

    chat = model.start_chat(history=gemini_history)
    response = chat.send_message(user_message)
    assistant_reply = response.text

    # Store both messages
    db.add(CoachMessage(user_id=user_id, role="user", content=user_message))
    db.add(CoachMessage(user_id=user_id, role="assistant", content=assistant_reply))
    await db.commit()

    return assistant_reply

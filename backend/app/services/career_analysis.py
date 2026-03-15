"""Career analysis service.

Builds the AI system prompt from resource files, formats user answers,
calls the Gemini API, and returns a Markdown career transition report.
"""

import json
import logging
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.services.routing import get_question_bank, MODULE_LABELS, CORE_MODULES

logger = logging.getLogger(__name__)

RESOURCES_DIR = Path(__file__).parent.parent / "data" / "resources"
PATHWAYS_PATH = Path(__file__).parent.parent / "data" / "pathways.json"

# Resource files in injection order per resource_14_master_system_prompt.md
RESOURCE_FILES = [
    ("resource_1_aviation_skills_translation.md", "REFERENCE DOCUMENT 1: Aviation Skills Translation"),
    ("resource_2_global_labour_market_context.md", "REFERENCE DOCUMENT 2: Global Labour Market Context"),
    ("resource_3_scoring_matching_framework.md", "REFERENCE DOCUMENT 3: Scoring & Matching Framework"),
    ("resource_4_urgency_constraint_signals.md", "REFERENCE DOCUMENT 4: Urgency & Constraint Signals"),
    ("resource_5_pathway_profiles.md", "REFERENCE DOCUMENT 5: Pathway Profiles"),
    ("resource_6_question_interpretation_guide.md", "REFERENCE DOCUMENT 6: Question Interpretation Guide"),
    ("resource_7_example_outputs.md", "REFERENCE DOCUMENT 7: Example Outputs"),
    ("resources_8_to_11.md", "REFERENCE DOCUMENTS 8-11: Archetypes, Credentials, Contradictions, Sensitive Situations"),
    ("resource_12_answer_formatting_guide.md", "REFERENCE DOCUMENT 12: Answer Formatting Guide"),
    ("resource_13_partial_completion_rules.md", "REFERENCE DOCUMENT 13: Partial Completion Rules"),
]

# Cached system prompt — built once at first use
_cached_system_prompt: str | None = None


def _load_resource(filename: str) -> str:
    """Load a single resource file."""
    path = RESOURCES_DIR / filename
    return path.read_text(encoding="utf-8")


def _load_pathways_json() -> str:
    """Load pathways.json as a string for injection."""
    return PATHWAYS_PATH.read_text(encoding="utf-8")


def build_system_prompt() -> str:
    """Build the full system prompt by assembling all resources.

    This is static per deployment and should be cached.
    """
    global _cached_system_prompt
    if _cached_system_prompt is not None:
        return _cached_system_prompt

    parts = []

    # Opening instruction (from resource_14)
    parts.append(
        "You are CareerDev's career transition analyst. Your role is to analyse "
        "questionnaire responses from aviation professionals — primarily cabin crew — "
        "and generate a personalised career pathway analysis report.\n\n"
        "You must follow the frameworks, scoring rules, and guidelines in the reference "
        "documents below exactly. Do not invent scoring criteria, override feasibility "
        "hard blocks, generate pathways not in the approved list, or produce "
        "recommendations that ignore the user's stated constraints.\n\n"
        "Your output must be written in Markdown format, clean and readable. It will be "
        "displayed directly to the user in the CareerDev platform.\n\n"
        "---\n\n"
        "LANGUAGE INSTRUCTION:\n"
        "Conduct all reasoning and scoring in English. Write the final output report in "
        "the user's preferred language, which is specified in their Q007 answer. If Q007 "
        'is null or "English", write in English. For non-English outputs, retain all '
        "credential names, pathway names, and company names in English with a translation "
        "or explanation alongside."
    )

    # Inject each resource file
    for filename, header in RESOURCE_FILES:
        try:
            content = _load_resource(filename)
            parts.append(f"---\n\n{header}\n\n{content}")
        except FileNotFoundError:
            logger.warning("Resource file not found: %s", filename)

    # Inject pathways.json
    try:
        pathways_content = _load_pathways_json()
        parts.append(
            "---\n\n"
            "AVAILABLE CAREER PATHWAYS:\n\n"
            f"{pathways_content}"
        )
    except FileNotFoundError:
        logger.warning("pathways.json not found")

    # Analysis instructions (from resource_14)
    parts.append(
        "---\n\n"
        "ANALYSIS INSTRUCTIONS:\n\n"
        "Follow this sequence exactly:\n\n"
        "STEP 1 — CONFIRM DATA INTEGRITY\n"
        "All required questions have been answered before this API call was made — the "
        "application enforces this gate at the UI level. You can assume required question "
        "data is present. If a required question value appears missing, treat it as a "
        "pipeline data error, note it in the report, and score that dimension at 5/10 "
        "(neutral). For missing optional questions, apply the fallback rules in Resource "
        "13 Section B silently.\n\n"
        "STEP 2 — IDENTIFY ARCHETYPE(S)\n"
        "Apply Resource 8 to identify the user's primary archetype (and secondary if "
        "applicable). This sets your tone and framing for the entire report.\n\n"
        "STEP 3 — APPLY URGENCY & CONSTRAINTS\n"
        "Apply Resource 4 to identify urgency tier, hard filters, and constraint stack. "
        "Run hard filters before scoring — remove any pathway with a Feasibility score "
        "of 0 from the scored set.\n\n"
        "STEP 4 — INTERPRET ANSWERS\n"
        "Apply Resources 6 and 12 to interpret the user's answers correctly. Apply "
        "Resource 1 undervaluation corrections to Module C skill ratings where appropriate. "
        "Flag any contradiction patterns from Resource 10.\n\n"
        "STEP 5 — DETECT SENSITIVE SIGNALS\n"
        "Apply Resource 11. If any sensitive situation signals are detected, note the "
        "required tone adjustment before generating recommendations.\n\n"
        "STEP 6 — SCORE ALL VIABLE PATHWAYS\n"
        "Apply Resource 3 scoring framework to each pathway not excluded by hard filters. "
        "Use pathway-specific scoring weights from pathways.json. Cross-reference against "
        "Resource 2 for the user's target market(s). Cross-reference against Resource 5 "
        "for pathway-specific interpretation guidance.\n\n"
        "STEP 7 — RANK AND SELECT\n"
        'Select the top 3–5 pathways by weighted score. Ensure at least one "quick win" '
        '(accessible within 3 months) and at least one "growth" pathway (strong 3–5 year '
        "trajectory) are included if available.\n\n"
        "STEP 8 — GENERATE REPORT\n"
        "Follow the output structure below exactly. Use Resource 7 as your quality "
        "benchmark — your output should resemble the good example, not the poor one.\n\n"
        "---\n\n"
        "OUTPUT STRUCTURE (Markdown):\n\n"
        "# Your Career Transition Analysis\n"
        "*[One sentence: personalised to the user's situation and target]*\n\n"
        "---\n\n"
        "## Your Situation at a Glance\n"
        "[2–3 sentences acknowledging what the data says about where they are — urgency, "
        "constraints, archetype signal. If sensitive signals detected, apply Resource 11 "
        "tone here. This section must never be generic.]\n\n"
        "**Analysis completeness:** [High / Medium / Low] — [one sentence on what this "
        "means for confidence]\n\n"
        "---\n\n"
        "## Your Recommended Pathways\n\n"
        "[Repeat the following block for each recommended pathway, ranked 1 to 5:]\n\n"
        "---\n\n"
        "### [Rank]. [Pathway Name]\n"
        "**Match score:** [X.X / 10] — [Label: Strong Match / Good Match / Possible Match]\n\n"
        "**Why this fits you:**\n"
        "[2–3 sentences connecting the user's specific answers to this pathway.]\n\n"
        "**Your transferable strengths:**\n"
        "- [Specific strength from their profile]\n"
        "- [Specific strength]\n"
        "- [Specific strength]\n"
        "[3–5 bullets maximum]\n\n"
        "**Gaps to address:**\n"
        "[1–3 honest gaps with resolution path: credential + duration + cost + format.]\n\n"
        "**Feasibility note:**\n"
        "[1–2 sentences on visa, financial, or logistical considerations.]\n\n"
        "**Salary reality check:**\n"
        "[Entry range in user's target market currency. Compare to stated target.]\n\n"
        "**First steps — next 30–90 days:**\n"
        "1. [Concrete action]\n"
        "2. [Concrete action]\n"
        "3. [Concrete action]\n"
        "[3–5 steps.]\n\n"
        "---\n\n"
        "[End of pathway block]\n\n"
        "---\n\n"
        "## Pathways Not Recommended Right Now\n"
        "[List excluded pathways with one-line reason. Omit if none.]\n\n"
        "---\n\n"
        "## A Note on Your Dream Role\n"
        "[Required if Q107 was answered. Omit otherwise.]\n\n"
        "---\n\n"
        "## Your Biggest Concern\n"
        "[Required if Q108 was answered. Omit otherwise.]\n\n"
        "---\n\n"
        "## What to Do This Week\n"
        "[3 universally applicable actions for the next 7 days.]\n\n"
        "---\n\n"
        "*This analysis was generated based on your questionnaire responses.*\n\n"
        "*Salary data sourced from Cooper Fitch UAE Salary Guide 2024 and regional market "
        "references. Figures are indicative and should be verified for your specific target "
        "role and location. Visa and immigration information is provided as general guidance "
        "only — always verify with a registered immigration consultant before making decisions.*\n\n"
        "END OF OUTPUT STRUCTURE"
    )

    _cached_system_prompt = "\n\n".join(parts)
    return _cached_system_prompt


def build_user_message(answers: dict, user_name: str | None, completed_at: datetime | None) -> str:
    """Build the user message with formatted questionnaire responses.

    Args:
        answers: Dict of question_id -> {"value": ..., "confidence": ...}
        user_name: User's full name or None
        completed_at: When the questionnaire was completed
    """
    qbank = {q.question_id: q for q in get_question_bank()}

    # Determine completeness
    total_questions = len(qbank)
    answered_count = sum(1 for qid, ans in answers.items() if ans.get("value") is not None)
    completeness_pct = round(answered_count / total_questions * 100) if total_questions else 0

    if completeness_pct >= 85:
        completeness_label = "High"
    elif completeness_pct >= 65:
        completeness_label = "Medium"
    else:
        completeness_label = "Low"

    # Determine which modules are completed
    answered_ids = set(answers.keys())
    modules_completed = []
    for mod in CORE_MODULES:
        mod_qs = [q for q in qbank.values() if q.module == mod]
        required_ids = {q.question_id for q in mod_qs if q.required}
        if required_ids.issubset(answered_ids):
            modules_completed.append(mod)

    # Extract key profile values
    def get_val(qid: str):
        ans = answers.get(qid)
        if ans:
            return ans.get("value")
        return None

    language = get_val("Q007") or "English"
    comm_style = get_val("Q008") or "Direct"
    name_display = user_name or "Anonymous"
    date_display = completed_at.strftime("%Y-%m-%d") if completed_at else datetime.utcnow().strftime("%Y-%m-%d")

    lines = [
        "Analyse the following questionnaire responses and generate a career transition "
        "analysis report following the instructions in your system prompt.",
        "",
        "USER PROFILE SUMMARY:",
        f"- Name (or anonymous ID): {name_display}",
        f"- Questionnaire completed: {date_display}",
        f"- Modules completed: {', '.join(modules_completed)}",
        f"- Overall completeness: {completeness_pct}% ({completeness_label})",
        f"- Preferred language (Q007): {language}",
        f"- Communication style (Q008): {comm_style}",
        "",
        "QUESTIONNAIRE RESPONSES:",
    ]

    # Group questions by module
    for mod in CORE_MODULES:
        mod_label = MODULE_LABELS.get(mod, mod)
        lines.append(f"\nMODULE {mod} — {mod_label.upper()}")

        mod_questions = sorted(
            [q for q in qbank.values() if q.module == mod],
            key=lambda q: q.question_id,
        )

        for q in mod_questions:
            ans = answers.get(q.question_id)
            if ans and ans.get("value") is not None:
                value = ans["value"]
                if isinstance(value, list):
                    value_str = json.dumps(value)
                else:
                    value_str = str(value)
            else:
                value_str = "[NULL]"

            lines.append(f"{q.question_id} | {q.prompt} | {value_str}")

    return "\n".join(lines)


def check_completion_gate(answers: dict) -> tuple[bool, str]:
    """Check that all required questions are answered and consent is given.

    Returns:
        (passed, error_message) — passed is True if gate is satisfied.
    """
    qbank = get_question_bank()
    answered_ids = set(answers.keys())

    # Check consent
    q005 = answers.get("Q005")
    if not q005 or q005.get("value") != "Yes":
        return False, "Consent to data processing (Q005) must be 'Yes' before analysis can run."

    # Check all required questions
    missing = []
    for q in qbank:
        if q.required and q.question_id not in answered_ids:
            missing.append(f"{q.question_id} ({q.prompt[:50]}...)")

    if missing:
        return False, f"Missing required questions: {', '.join(missing[:10])}" + (
            f" and {len(missing) - 10} more" if len(missing) > 10 else ""
        )

    return True, ""


async def call_analysis_api(system_prompt: str, user_message: str) -> str:
    """Call the Gemini API to generate the career analysis report.

    Returns the Markdown report text.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError(
            "The 'google-generativeai' package is required for AI analysis. "
            "Install it with: pip install google-generativeai"
        )

    api_key = settings.LLM_API_KEY
    if not api_key:
        raise RuntimeError(
            "LLM_API_KEY is not configured. Set the LLM_API_KEY environment variable "
            "to your Gemini API key."
        )

    model = settings.LLM_MODEL
    genai.configure(api_key=api_key)
    gemini = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=5000,
            temperature=0.4,
        ),
    )

    response = gemini.generate_content(user_message)

    return response.text

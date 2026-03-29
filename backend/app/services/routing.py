"""Adaptive questionnaire routing engine.

Determines the next set of questions based on previous answers and conditional routing rules.
"""

import csv
import json
from pathlib import Path
from dataclasses import dataclass

QUESTION_BANK_PATH = Path(__file__).parent.parent / "data" / "question_bank.csv"
OPTION_HINTS_PATH = Path(__file__).parent.parent / "data" / "option_hints.json"

MODULE_LABELS = {
    "A": "Consent & Baseline",
    "B": "Aviation Profile & Satisfaction",
    "C": "Transferable Skills & Evidence",
    "D": "Work Style & Environment Preferences",
    "E": "Constraints & Feasibility",
    "F": "Location & Mobility",
    "G": "Compensation & Benefits Modeling",
    "H": "Learning, Credentials & Study Pathways",
}

CORE_MODULES = ["A", "B", "C", "D", "E", "F", "G", "H"]

# ---------------------------------------------------------------------------
# Progressive questionnaire: 3-tier system
#
# Tier 1 "Quick Match"   — 18 questions, ~5 min → initial pathway rankings
# Tier 2 "Sharpen"       — 22 more questions, ~5 min → full scoring accuracy
# Tier 3 "Personalise"   — remaining module questions (optional deep-dive)
#
# After Tier 2, the user has answered ALL 40 scoring-relevant questions.
# Tier 3 adds context for the AI narrative but doesn't change rankings.
# ---------------------------------------------------------------------------

TIER1_SCREENS = [
    {
        "id": "t1_1", "tier": 1,
        "label": "The Basics",
        "questions": ["Q005", "Q001", "Q109", "Q009"],
    },
    {
        "id": "t1_2", "tier": 1,
        "label": "Your Experience",
        "questions": ["Q011", "Q017", "Q019", "Q016", "Q047"],
    },
    {
        "id": "t1_3", "tier": 1,
        "label": "Your Skills",
        "questions": ["Q028", "Q034", "Q042", "Q054", "Q060"],
    },
    {
        "id": "t1_4", "tier": 1,
        "label": "What You Want",
        "questions": ["Q048", "Q071", "Q089", "Q106"],
    },
]

TIER2_SCREENS = [
    {
        "id": "t2_1", "tier": 2,
        "label": "Your Full Skill Profile",
        "questions": ["Q027", "Q029", "Q030", "Q033", "Q035", "Q036"],
    },
    {
        "id": "t2_2", "tier": 2,
        "label": "More Skills & Preferences",
        "questions": ["Q031", "Q037", "Q050", "Q051", "Q053"],
    },
    {
        "id": "t2_3", "tier": 2,
        "label": "Your Work Situation",
        "questions": ["Q061", "Q062", "Q063", "Q064", "Q065", "Q066"],
    },
    {
        "id": "t2_4", "tier": 2,
        "label": "A Few More Details",
        "questions": ["Q018", "Q020", "Q049", "Q056", "Q070"],
    },
]

ALL_PROGRESSIVE_SCREENS = TIER1_SCREENS + TIER2_SCREENS


TIER1_QUESTION_IDS: set[str] = set()
for _screen in TIER1_SCREENS:
    TIER1_QUESTION_IDS.update(_screen["questions"])

TIER2_QUESTION_IDS: set[str] = set()
for _screen in TIER2_SCREENS:
    TIER2_QUESTION_IDS.update(_screen["questions"])

ALL_PROGRESSIVE_IDS = TIER1_QUESTION_IDS | TIER2_QUESTION_IDS



# Conditional module triggers based on question answers
CONDITIONAL_TRIGGERS = {
    "training_deep_dive": {
        "trigger_question": "Q034",
        "condition": "gte",
        "threshold": 3,
        "description": "Training/L&D deep dive",
    },
    "safety_deep_dive": {
        "trigger_question": "Q016",
        "condition": "gte",
        "threshold": 3,
        "description": "Safety/compliance deep dive",
    },
    "tech_pivot": {
        "trigger_question": "Q042",
        "condition": "eq",
        "threshold": "High",
        "description": "Tech pivot deep dive",
    },
    "entrepreneurship": {
        "trigger_question": "Q096",
        "condition": "eq",
        "threshold": "Yes",
        "description": "Entrepreneurship module",
    },
    "relocation": {
        "trigger_question": "Q080",
        "condition": "any_selected",
        "threshold": None,
        "description": "Relocation planning module",
    },
}


@dataclass
class QuestionDef:
    question_id: str
    module: str
    prompt: str
    question_type: str
    required: bool
    options_json: list | None
    min_val: int | None
    max_val: int | None
    route_if_json: dict | None
    tags_json: list | None
    help_text: str | None
    option_hints: dict | None  # {option_text: hint_text}


def _load_option_hints() -> dict:
    """Load option-level hints from JSON file."""
    if OPTION_HINTS_PATH.exists():
        with open(OPTION_HINTS_PATH, "r") as f:
            return json.load(f)
    return {}


def load_question_bank() -> list[QuestionDef]:
    """Load all questions from CSV."""
    option_hints = _load_option_hints()
    questions = []
    with open(QUESTION_BANK_PATH, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            options = None
            if row["options_json"]:
                try:
                    options = json.loads(row["options_json"])
                except json.JSONDecodeError:
                    options = None

            route_if = None
            if row["route_if_json"]:
                try:
                    route_if = json.loads(row["route_if_json"])
                except json.JSONDecodeError:
                    route_if = None

            tags = None
            if row["tags_json"]:
                try:
                    tags = json.loads(row["tags_json"])
                except json.JSONDecodeError:
                    tags = None

            def _safe_int(val: str) -> int | None:
                if not val:
                    return None
                try:
                    return int(val)
                except (ValueError, TypeError):
                    return None

            qid = row["question_id"]
            questions.append(QuestionDef(
                question_id=qid,
                module=row["module"],
                prompt=row["prompt"],
                question_type=row["type"],
                required=row["required"].lower() == "true",
                options_json=options,
                min_val=_safe_int(row["min"]),
                max_val=_safe_int(row["max"]),
                route_if_json=route_if,
                tags_json=tags,
                help_text=row.get("help_text") or None,
                option_hints=option_hints.get(qid),
            ))
    return questions


_question_bank: list[QuestionDef] | None = None


def get_question_bank() -> list[QuestionDef]:
    global _question_bank
    if _question_bank is None:
        _question_bank = load_question_bank()
    return _question_bank


def get_questions_for_module(module: str) -> list[QuestionDef]:
    """Get all questions for a specific module."""
    return [q for q in get_question_bank() if q.module == module]


def is_module_complete(module: str, answered_ids: set[str]) -> bool:
    """Check if all required questions in a module have been answered."""
    module_questions = get_questions_for_module(module)
    required_ids = {q.question_id for q in module_questions if q.required}
    return required_ids.issubset(answered_ids)


def get_next_module(current_module: str | None, answered_ids: set[str]) -> str | None:
    """Determine the next module to show based on progress.

    Scans all modules from the start (or from current_module) and returns
    the first module with unanswered required questions. If all are complete,
    returns None.
    """
    # Determine starting point for the scan
    start_idx = 0
    if current_module and current_module in CORE_MODULES:
        idx = CORE_MODULES.index(current_module)
        # If current module is complete, start scanning from the next one
        if is_module_complete(current_module, answered_ids):
            start_idx = idx + 1
        else:
            return current_module  # Still in current module

    # Scan forward for the first incomplete module
    for i in range(start_idx, len(CORE_MODULES)):
        if not is_module_complete(CORE_MODULES[i], answered_ids):
            return CORE_MODULES[i]

    return None  # All modules complete


def get_unanswered_questions(module: str, answered_ids: set[str]) -> list[QuestionDef]:
    """Get questions in a module the user hasn't answered yet."""
    module_questions = get_questions_for_module(module)
    return [q for q in module_questions if q.question_id not in answered_ids]


def check_consent_block(answers: dict) -> bool:
    """Check if user declined consent (Q005 = No), which blocks the questionnaire."""
    q005 = answers.get("Q005")
    if q005 and q005.get("value") == "No":
        return True
    return False


# ---------------------------------------------------------------------------
# Progressive-phase helpers
# ---------------------------------------------------------------------------

def get_next_progressive_screen(answered_ids: set[str]) -> dict | None:
    """Return the next progressive screen (Tier 1 or 2) with unanswered Qs."""
    for screen in ALL_PROGRESSIVE_SCREENS:
        unanswered = [qid for qid in screen["questions"] if qid not in answered_ids]
        if unanswered:
            return screen
    return None


def is_tier1_complete(answered_ids: set[str]) -> bool:
    return TIER1_QUESTION_IDS.issubset(answered_ids)


def is_tier2_complete(answered_ids: set[str]) -> bool:
    return TIER2_QUESTION_IDS.issubset(answered_ids)


def is_all_progressive_complete(answered_ids: set[str]) -> bool:
    return ALL_PROGRESSIVE_IDS.issubset(answered_ids)


def get_screen_questions(screen: dict) -> list["QuestionDef"]:
    """Return QuestionDef objects for the given screen (preserving order)."""
    bank = {q.question_id: q for q in get_question_bank()}
    return [bank[qid] for qid in screen["questions"] if qid in bank]


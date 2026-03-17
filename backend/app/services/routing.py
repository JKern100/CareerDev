"""Adaptive questionnaire routing engine.

Determines the next set of questions based on previous answers and conditional routing rules.
"""

import csv
import json
from pathlib import Path
from dataclasses import dataclass

QUESTION_BANK_PATH = Path(__file__).parent.parent / "data" / "question_bank.csv"

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


def load_question_bank() -> list[QuestionDef]:
    """Load all questions from CSV."""
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

            questions.append(QuestionDef(
                question_id=row["question_id"],
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

"""Deterministic scoring engine.

Computes pathway scores from questionnaire answers using the six-component model.
Each pathway defines its own scoring weights (must sum to 1.0):
- Interest Fit (default 0.25)
- Skill Fit (default 0.25)
- Environment Fit (default 0.10)
- Feasibility (default 0.20)
- Compensation Fit (default 0.15)
- Risk Fit (default 0.05)

Confidence adjustment: final_score = raw_score * (0.7 + 0.3 * confidence_factor)
"""

import json
from pathlib import Path
from dataclasses import dataclass

PATHWAYS_PATH = Path(__file__).parent.parent / "data" / "pathways.json"


@dataclass
class ScoredPathway:
    pathway_id: str
    pathway_name: str
    description: str
    raw_score: float
    confidence_factor: float
    adjusted_score: float
    interest_score: float
    skill_score: float
    environment_score: float
    feasibility_score: float
    compensation_score: float
    risk_score: float
    typical_roles: list[str]
    salary_band_refs: dict | None
    salary_global_note: str | None
    recommended_credentials: list[dict] | None
    gate_flags: list[str]
    top_evidence_signals: list[str]
    risks_unknowns: list[str]


def load_pathways() -> list[dict]:
    with open(PATHWAYS_PATH, "r") as f:
        return json.load(f)


def _is_not_sure(answer: dict) -> bool:
    """Check if the answer is a 'not sure' response."""
    val = answer.get("value")
    if val is None:
        vj = answer.get("value_json", {})
        val = vj.get("value")
    return val == "not_sure" or val == "Not sure"


def _extract_answer_value(answer: dict):
    """Extract the raw value from an answer dict."""
    val = answer.get("value")
    if val is not None:
        return val
    # fallback to value_json format from DB
    vj = answer.get("value_json", {})
    return vj.get("value")


def _get_likert_score(answer: dict, max_val: int = 5) -> float:
    """Normalize a likert/numeric answer to 0-1 range."""
    if _is_not_sure(answer):
        return 0.5  # neutral for uncertain answers
    val = _extract_answer_value(answer)
    if val is None:
        return 0.5  # neutral default
    try:
        return float(val) / max_val
    except (ValueError, TypeError):
        return 0.5


def _get_slider_score(answer: dict, max_val: int = 10) -> float:
    if _is_not_sure(answer):
        return 0.5
    val = _extract_answer_value(answer)
    if val is None:
        return 0.5
    try:
        return float(val) / max_val
    except (ValueError, TypeError):
        return 0.5


def _compute_skill_score(pathway: dict, answers: dict) -> float:
    """Compute skill fit from skill-related questions."""
    skill_qs = pathway.get("skill_questions", [])
    if not skill_qs:
        return 0.5

    scores = []
    for qid in skill_qs:
        if qid in answers:
            scores.append(_get_likert_score(answers[qid]))
    return sum(scores) / len(scores) if scores else 0.5


def _compute_interest_score(pathway: dict, answers: dict) -> float:
    """Compute interest fit from interest-related questions and career family match."""
    interest_qs = pathway.get("interest_questions", [])
    match_values = pathway.get("interest_match_values", {})
    scores = []

    for qid in interest_qs:
        if qid in answers:
            val = _extract_answer_value(answers[qid])
            # Check if this question has specific match values
            if qid in match_values:
                expected = match_values[qid]
                if isinstance(val, list):
                    overlap = len(set(val) & set(expected))
                    scores.append(min(overlap / max(len(expected), 1), 1.0))
                elif val in expected:
                    scores.append(1.0)
                else:
                    scores.append(0.2)
            else:
                scores.append(_get_likert_score(answers[qid]))

    return sum(scores) / len(scores) if scores else 0.5


def _compute_environment_score(pathway: dict, answers: dict) -> float:
    """Compute environment fit from work style preferences."""
    env_qs = pathway.get("environment_questions", [])
    if not env_qs:
        return 0.5

    scores = []
    for qid in env_qs:
        if qid in answers:
            scores.append(_get_likert_score(answers[qid]))
    return sum(scores) / len(scores) if scores else 0.5


def _compute_feasibility_score(pathway: dict, answers: dict) -> tuple[float, list[str]]:
    """Compute feasibility score and identify gate flags."""
    gate_flags = []
    score = 0.7  # base feasibility

    # Check savings runway
    q065 = answers.get("Q065")
    if q065:
        months = _extract_answer_value(q065)
        if months is not None:
            try:
                months = float(months)
                if months < 3:
                    score -= 0.2
                    gate_flags.append("Low savings runway (<3 months)")
                elif months >= 6:
                    score += 0.1
            except (ValueError, TypeError):
                pass

    # Check willingness to start entry level
    q071 = answers.get("Q071")
    if q071:
        val = _extract_answer_value(q071)
        if val == "No":
            score -= 0.15
            gate_flags.append("Unwilling to start at entry level")

    # Check study willingness
    q070 = answers.get("Q070")
    if q070:
        val = _extract_answer_value(q070)
        if val == "No":
            score -= 0.1
            gate_flags.append("Unwilling to pause income for study")

    # Check visa/sponsorship constraints
    q062 = answers.get("Q062")
    q063 = answers.get("Q063")
    if q062 and _extract_answer_value(q062) == "Yes" and q063 and _extract_answer_value(q063) == "No":
        gate_flags.append("Needs sponsorship but won't change employer — internal moves only")
        score -= 0.2

    # Check work mode constraint (remote-only restriction)
    q048 = answers.get("Q048")
    if q048 and _extract_answer_value(q048) == "Remote":
        gate_flags.append("Remote-only preference may limit options")
        score -= 0.05

    return max(0.0, min(1.0, score)), gate_flags


def _compute_compensation_score(pathway: dict, answers: dict) -> float:
    """Compare pathway salary bands to user's minimum needs."""
    target = answers.get("Q089")
    minimum = answers.get("Q066")

    if not target and not minimum:
        return 0.5

    salary_refs = pathway.get("salary_band_refs", {})
    if not salary_refs:
        return 0.5

    # Get the max salary across all roles in this pathway
    max_salary = max(
        (band.get("max_aed", 0) for band in salary_refs.values()),
        default=0
    )
    min_salary = min(
        (band.get("min_aed", 0) for band in salary_refs.values()),
        default=0
    )

    user_min = 0
    if minimum:
        try:
            user_min = float(_extract_answer_value(minimum))
        except (ValueError, TypeError):
            user_min = 0

    user_target = 0
    if target:
        try:
            user_target = float(_extract_answer_value(target))
        except (ValueError, TypeError):
            user_target = 0

    # Score based on how well the salary band covers user needs
    if user_min > 0 and min_salary < user_min:
        # Entry salary below minimum — penalty proportional to gap
        gap_ratio = (user_min - min_salary) / user_min
        return max(0.1, 0.5 - gap_ratio * 0.5)

    if user_target > 0 and max_salary >= user_target:
        return 0.9  # Pathway can reach target
    elif user_target > 0:
        return max(0.3, max_salary / user_target)

    return 0.6


def _compute_risk_score(pathway: dict, answers: dict) -> float:
    """Align user's risk tolerance with pathway volatility."""
    q060 = answers.get("Q060")
    if not q060:
        return 0.5

    risk_tolerance = _get_slider_score(q060)
    # Higher risk tolerance = better fit for uncertain pathways
    return risk_tolerance


def _compute_confidence_factor(answers: dict, relevant_question_ids: list[str]) -> float:
    """Average confidence across relevant questions.

    'Not sure' answers carry confidence=50 which naturally dampens the score.
    """
    confidences = []
    for qid in relevant_question_ids:
        if qid in answers:
            ans = answers[qid]
            if _is_not_sure(ans):
                confidences.append(0.5)
            else:
                conf = ans.get("confidence", 100)
                confidences.append(conf / 100.0)
    return sum(confidences) / len(confidences) if confidences else 1.0


def _apply_negative_signals(pathway: dict, answers: dict) -> float:
    """Apply negative signal penalties defined in the pathway.

    Returns a total penalty (0.0 to ~0.5) to subtract from the raw score.
    """
    signals = pathway.get("negative_signals", {})
    if not signals:
        return 0.0

    total_penalty = 0.0
    for qid, rule in signals.items():
        if qid not in answers:
            continue
        val = _extract_answer_value(answers[qid])
        if val is None or _is_not_sure(answers[qid]):
            continue

        condition = rule.get("condition")
        threshold = rule.get("threshold")
        penalty = rule.get("penalty", 0.1)

        try:
            if condition == "gte" and float(val) >= float(threshold):
                total_penalty += penalty
            elif condition == "lte" and float(val) <= float(threshold):
                total_penalty += penalty
            elif condition == "eq" and str(val) == str(threshold):
                total_penalty += penalty
        except (ValueError, TypeError):
            if condition == "eq" and str(val) == str(threshold):
                total_penalty += penalty

    return total_penalty


def _identify_evidence_signals(pathway: dict, answers: dict) -> list[str]:
    """Identify which answers most strongly support this pathway."""
    signals = []
    skill_qs = pathway.get("skill_questions", [])
    for qid in skill_qs:
        if qid in answers:
            val = _extract_answer_value(answers[qid])
            try:
                if float(val) >= 4:
                    signals.append(f"Strong self-rating on {qid}")
            except (ValueError, TypeError):
                pass

    # Check for evidence-type answers
    for qid in ["Q038", "Q039", "Q040"]:
        if qid in answers:
            val = _extract_answer_value(answers[qid])
            if val and len(str(val)) > 50:
                signals.append(f"Detailed evidence provided ({qid})")

    return signals[:5]


def _identify_risks(pathway: dict, answers: dict, gate_flags: list[str]) -> list[str]:
    """Identify risks and unknowns for this pathway."""
    risks = list(gate_flags)

    # Low confidence answers
    all_qs = (
        pathway.get("skill_questions", [])
        + pathway.get("interest_questions", [])
        + pathway.get("feasibility_questions", [])
    )
    low_conf_count = sum(
        1 for qid in all_qs
        if qid in answers and answers[qid].get("confidence", 100) < 30
    )
    if low_conf_count > 2:
        risks.append(f"{low_conf_count} answers have low confidence — advisor clarification recommended")

    return risks


def score_pathways(answers: dict) -> list[ScoredPathway]:
    """Score all pathways for a user based on their answers.

    Args:
        answers: dict of question_id -> {value, confidence, evidence_refs}

    Returns:
        List of ScoredPathway sorted by adjusted_score descending.
    """
    pathways = load_pathways()
    results = []

    for pw in pathways:
        interest = _compute_interest_score(pw, answers)
        skill = _compute_skill_score(pw, answers)
        environment = _compute_environment_score(pw, answers)
        feasibility, gate_flags = _compute_feasibility_score(pw, answers)
        compensation = _compute_compensation_score(pw, answers)
        risk = _compute_risk_score(pw, answers)

        # Weighted raw score
        raw_score = (
            pw.get("weight_interest", 0.25) * interest
            + pw.get("weight_skill", 0.25) * skill
            + pw.get("weight_environment", 0.10) * environment
            + pw.get("weight_feasibility", 0.20) * feasibility
            + pw.get("weight_compensation", 0.15) * compensation
            + pw.get("weight_risk", 0.05) * risk
        )

        # Apply negative signals (e.g. explicit disinterest in sales)
        negative_penalty = _apply_negative_signals(pw, answers)
        raw_score = max(0.0, raw_score - negative_penalty)

        # Confidence adjustment
        all_question_ids = (
            pw.get("skill_questions", [])
            + pw.get("interest_questions", [])
            + pw.get("environment_questions", [])
            + pw.get("feasibility_questions", [])
            + pw.get("compensation_questions", [])
        )
        confidence_factor = _compute_confidence_factor(answers, all_question_ids)
        adjusted_score = raw_score * (0.7 + 0.3 * confidence_factor)

        evidence_signals = _identify_evidence_signals(pw, answers)
        risks = _identify_risks(pw, answers, gate_flags)

        results.append(ScoredPathway(
            pathway_id=pw["id"],
            pathway_name=pw["name"],
            description=pw["description"],
            raw_score=round(raw_score, 4),
            confidence_factor=round(confidence_factor, 4),
            adjusted_score=round(adjusted_score, 4),
            interest_score=round(interest, 4),
            skill_score=round(skill, 4),
            environment_score=round(environment, 4),
            feasibility_score=round(feasibility, 4),
            compensation_score=round(compensation, 4),
            risk_score=round(risk, 4),
            typical_roles=pw.get("typical_roles", []),
            salary_band_refs=pw.get("salary_band_refs"),
            salary_global_note=pw.get("salary_global_note"),
            recommended_credentials=pw.get("recommended_credentials"),
            gate_flags=gate_flags,
            top_evidence_signals=evidence_signals,
            risks_unknowns=risks,
        ))

    results.sort(key=lambda x: x.adjusted_score, reverse=True)
    return results

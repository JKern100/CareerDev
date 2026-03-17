"""Summary report generator.

Creates a flowing narrative report that plays back the user's questionnaire
answers in a personalized style, with teaser questions for the full analysis.
"""

import json
from app.services.routing import get_question_bank, MODULE_LABELS

# Communication style mapping from Q008
STYLE_INSTRUCTIONS = {
    "Direct": "Be concise, confident, and action-oriented. Use short sentences. Get to the point fast. No fluff.",
    "Detailed": "Be thorough and comprehensive. Explain connections between their answers. Provide context and nuance.",
    "Motivational": "Be warm, encouraging, and energizing. Celebrate their strengths. Frame challenges as opportunities. Use an uplifting tone.",
    "Minimal": "Be extremely brief. Use bullet-like prose. Only essential observations. No filler words.",
}

# Question prompts lookup
def _build_question_map() -> dict[str, dict]:
    """Build a map of question_id -> question metadata."""
    qmap = {}
    for q in get_question_bank():
        qmap[q.question_id] = {
            "prompt": q.prompt,
            "module": q.module,
            "module_label": MODULE_LABELS.get(q.module, q.module),
            "type": q.question_type,
        }
    return qmap


def _format_answers_for_prompt(answers: dict) -> str:
    """Format user answers into a readable block for the AI prompt."""
    qmap = _build_question_map()
    sections = {}

    for qid, ans_data in sorted(answers.items()):
        qinfo = qmap.get(qid)
        if not qinfo:
            continue
        module_label = qinfo["module_label"]
        if module_label not in sections:
            sections[module_label] = []

        value = ans_data.get("value")
        if value is None:
            continue

        # Format the value nicely
        if isinstance(value, list):
            value_str = ", ".join(str(v) for v in value)
        else:
            value_str = str(value)

        confidence = ans_data.get("confidence", 100)
        conf_label = "low" if confidence < 30 else "moderate" if confidence < 70 else "high"

        sections[module_label].append(
            f"- {qinfo['prompt']}: {value_str} (confidence: {conf_label})"
        )

    lines = []
    for section, items in sections.items():
        lines.append(f"\n## {section}")
        lines.extend(items)

    return "\n".join(lines)


def build_summary_prompt(answers: dict, user_name: str | None = None) -> str:
    """Build the prompt for generating the summary report."""
    # Extract communication style preference
    style_pref = "Direct"  # default
    q008 = answers.get("Q008")
    if q008:
        val = q008.get("value", "Direct")
        if val in STYLE_INSTRUCTIONS:
            style_pref = val

    style_instruction = STYLE_INSTRUCTIONS[style_pref]

    # Extract user's name for personalization
    name_line = f"The user's name is {user_name}. Address them by name occasionally." if user_name else ""

    formatted_answers = _format_answers_for_prompt(answers)

    return f"""You are a career advisor writing a personalized summary report for someone transitioning out of cabin crew work.

{name_line}

COMMUNICATION STYLE: {style_pref}
{style_instruction}

Below are their questionnaire responses across all modules. Write a flowing narrative report (NOT tables or bullet points) that:

1. **Opens with a personal reflection** — acknowledge where they are right now (their urgency, their goals, what they want from this process).

2. **Plays back their professional identity** — weave together their aviation experience, the roles they've held, what they enjoy vs. what drains them, and the peak/hard moments they described. Make them feel seen.

3. **Highlights their transferable strengths** — based on their self-rated skills and the evidence stories they shared. Connect specific skills to real-world value outside aviation.

4. **Acknowledges their constraints honestly** — visa situation, financial runway, dependents, notice period. Don't sugarcoat, but frame constraints as parameters to work within, not barriers.

5. **Reflects their preferences and values** — work style, environment, schedule, leadership aspirations, non-negotiables. Show that the plan will respect what matters to them.

6. **Ends with 3-5 thought-provoking teaser questions** — questions the full Career Analysis Report will answer, such as:
   - "Which career paths actually match your unique combination of crisis management skills and service orientation?"
   - "What salary range can you realistically expect in your top pathway, and how does it compare to your minimum needs?"
   - "Which credentials would give you the fastest entry into your best-fit field?"
   Make these specific to THEIR answers, not generic.

IMPORTANT GUIDELINES:
- Write in second person ("you").
- Keep it between 800-1200 words.
- Do NOT include tables, charts, scores, or rankings.
- Do NOT recommend specific career paths yet — that's for the analysis report.
- If they expressed low confidence on certain answers, gently note that those areas might benefit from further reflection.
- If their urgency is high (7+/10), acknowledge that and reflect appropriate pace in your tone.
- Reference their actual answers naturally (e.g., "You mentioned that your peak moment was..." not "In Q024 you said...").

USER'S QUESTIONNAIRE RESPONSES:
{formatted_answers}
"""


def generate_summary_without_ai(answers: dict, user_name: str | None = None) -> str:
    """Generate a template-based summary when no AI API key is available."""
    qmap = _build_question_map()

    name = user_name or "there"

    # Extract key answers
    def get_val(qid: str):
        ans = answers.get(qid)
        if ans:
            return ans.get("value")
        return None

    urgency = get_val("Q009") or "not specified"
    goals = get_val("Q004") or []
    style = get_val("Q008") or "Direct"
    years = get_val("Q011") or "several"
    employer_type = get_val("Q012") or "an airline"
    aircraft = get_val("Q013") or []
    roles = get_val("Q014") or []
    burnout = get_val("Q026") or "not specified"
    residence = get_val("Q001") or "not specified"
    visa_type = get_val("Q061") or "not specified"
    savings = get_val("Q065") or "not specified"
    min_salary = get_val("Q066") or "not specified"
    target_salary = get_val("Q089") or "not specified"
    education = get_val("Q097") or "not specified"
    study_hours = get_val("Q100") or "not specified"
    career_families = get_val("Q106") or []
    dream = get_val("Q107") or None
    peak_moment = get_val("Q024") or None
    hard_moment = get_val("Q025") or None
    non_negotiables = get_val("Q057") or "not specified"

    # Build narrative
    if isinstance(goals, list):
        goals_str = ", ".join(goals).lower()
    else:
        goals_str = str(goals)

    if isinstance(aircraft, list):
        aircraft_str = ", ".join(aircraft)
    else:
        aircraft_str = str(aircraft)

    if isinstance(roles, list):
        roles_str = ", ".join(roles)
    else:
        roles_str = str(roles)

    if isinstance(career_families, list):
        career_str = ", ".join(career_families)
    else:
        career_str = str(career_families)

    sections = []

    # Opening
    urgency_note = ""
    try:
        urg_val = int(urgency)
        if urg_val >= 7:
            urgency_note = f"With an urgency level of {urg_val} out of 10, it's clear that change isn't just something you're thinking about — it's something you need. We hear that, and this report is designed to help you move forward with clarity."
        elif urg_val >= 4:
            urgency_note = f"You've rated your urgency for change at {urg_val} out of 10 — you're ready to explore what's next, even if the timing isn't immediate."
        else:
            urgency_note = f"With an urgency of {urg_val} out of 10, you're taking a thoughtful, exploratory approach to your next chapter. That's a great position to be in."
    except (ValueError, TypeError):
        urgency_note = "You've taken the first step by completing this questionnaire — that says something about your readiness for change."

    sections.append(f"""Hello {name},

Thank you for taking the time to complete the CareerDev questionnaire. What you've shared gives us a rich picture of who you are, what you've built over your career, and where you want to go next.

You told us you're looking for {goals_str}. {urgency_note}""")

    # Professional identity
    sections.append(f"""**Your Professional Identity**

You've spent {years} years in aviation, working with {employer_type} across aircraft including {aircraft_str}. Your experience spans roles in {roles_str}, which means you've built a deep operational foundation that goes well beyond what most people outside aviation realize.""")

    if peak_moment:
        sections.append(f"When asked about your peak moment onboard, you shared: \"{peak_moment}\" — this tells us something important about where you come alive professionally.")

    if hard_moment:
        sections.append(f"You also described a difficult moment: \"{hard_moment}\" — acknowledging what drains you is just as valuable as knowing what energizes you.")

    try:
        burnout_val = int(burnout)
        if burnout_val >= 7:
            sections.append(f"Your burnout risk score of {burnout_val}/10 suggests that the toll of this work is real and present. Any transition plan needs to account for recovery, not just new skills.")
        elif burnout_val >= 4:
            sections.append(f"With a burnout indicator of {burnout_val}/10, there's wear showing — but you still have energy to invest in your transition.")
    except (ValueError, TypeError):
        pass

    # Constraints
    sections.append(f"""**Your Constraints & Situation**

You're currently on a {visa_type} work authorisation with a savings runway of {savings} months. Your minimum monthly need is {min_salary}, and you're targeting {target_salary}. Your highest education level is {education}, and you have {study_hours} hours per week available for development.

Your non-negotiables are: {non_negotiables}. These aren't obstacles — they're the boundaries that will make your next career sustainable.""")

    # Interests
    if career_str:
        sections.append(f"""**Where You're Looking**

You've expressed interest in these career families: {career_str}. The full analysis report will tell you which of these actually align with your skill profile and constraints — and which might surprise you.""")

    if dream:
        sections.append(f"And when we asked what you'd do if you couldn't fail, you said: \"{dream}\". Let's see how close we can get to that.")

    # Teaser questions
    sections.append("""**Questions Your Career Analysis Report Will Answer**

Now that we have your full profile, here are the questions we'll tackle in your personalized Career Analysis Report:

1. Which career pathways are the strongest match for your unique combination of experience, skills, and preferences?

2. What realistic salary range can you expect in your top pathways, and how does it compare to your stated minimum and target?

3. Which credentials or certifications would give you the fastest credible entry into your best-fit fields?

4. Given your visa situation, savings runway, and notice period — what's a realistic timeline for your transition?

5. Where are the gaps in your profile that you might want to address before making a move?

When you're ready, click "Generate Career Analysis" to get your detailed, scored report with specific pathway recommendations.""")

    return "\n\n".join(sections)


async def generate_summary_with_ai(answers: dict, user_name: str | None = None, api_key: str = "") -> str:
    """Generate a narrative summary using Gemini API."""
    try:
        import google.generativeai as genai
    except ImportError:
        return generate_summary_without_ai(answers, user_name)

    if not api_key:
        return generate_summary_without_ai(answers, user_name)

    prompt = build_summary_prompt(answers, user_name)

    try:
        genai.configure(api_key=api_key)
        gemini = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=8000,
            ),
        )
        response = gemini.generate_content(prompt)
        return response.text
    except Exception:
        # Fallback to template if AI fails
        return generate_summary_without_ai(answers, user_name)

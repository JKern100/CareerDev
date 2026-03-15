# Resource 12: Answer Formatting Guide
## How to Read and Interpret Raw Questionnaire Answer Data

**Purpose:** The AI receives answers as raw database values — arrays, numbers, strings, nulls. This guide explains how to interpret each answer type correctly and consistently so that scoring and analysis are reliable across all users.

**Instruction for AI:** Never treat a raw answer value as self-explanatory. Always apply the interpretation rules below before using an answer in scoring or narrative generation.

---

## SECTION A: Answer Type Interpretation Rules

### single_select
**Raw format:** A single string value.
**Example:** `"Employer-sponsored"`
**How to interpret:** Take at face value. If the value is unexpected or outside the defined option set, treat as null (see Section B).

---

### multi_select
**Raw format:** An array of strings. May be empty `[]` or contain one or more values.
**Example:** `["Business", "First", "Purser-like duties"]`
**How to interpret:**
- Empty array `[]` = treat as unanswered (see Section B null rules)
- Single value = user has one relevant experience in this area
- Multiple values = user has breadth across these areas; weight accordingly
- **Never read a multi_select as an ordered preference** — order of selection carries no meaning

**Common multi_selects and what combinations mean:**

| Question | Combination Signal | Interpretation |
|---|---|---|
| Q014 (Cabin roles) | Economy only | Standard crew, no premium or leadership experience |
| Q014 | Business + First + Purser-like | Senior, premium service, leadership exposure |
| Q014 | Economy + Senior + Lead | Progression through seniority without premium cabin |
| Q015 (Special duties) | Trainer support + Safety rep | Strong P1/P6 signal; dual specialist |
| Q015 | None selected | No special duties; standard crew profile |
| Q047 (Environment) | Structured + Creative | Wants organised but non-routine work; good PM/L&D signal |
| Q047 | Mission-driven + Luxury/service | Values-oriented service; strong P9/P11/P14 signal |
| Q059 (Values) | Stability + Family time | Risk-averse; avoid P12/P13 |
| Q059 | Autonomy + Learning | Growth-oriented; open to credential investment |
| Q059 | Income growth + Prestige | Financially motivated; weight compensation dimension higher |

---

### likert_1_5
**Raw format:** Integer 1–5.
**How to interpret:**

| Score | Meaning | AI Application |
|---|---|---|
| 1 | Very low / strongly disagree / never | Significant negative signal; actively avoid pathways requiring this |
| 2 | Low / disagree / rarely | Mild negative signal; flag as a gap if pathway requires it |
| 3 | Moderate / neutral / sometimes | Neutral signal; neither advantage nor disadvantage |
| 4 | High / agree / often | Positive signal; supports pathways requiring this |
| 5 | Very high / strongly agree / always | Strong positive signal; highlight as a strength |

**Important calibration rule:** Apply Resource 1 undervaluation corrections to Module C likert scores for skills the cabin crew population systematically underrates (leadership, crisis response, compliance). A self-rated 3 on Q032 (crisis response) for a 7-year purser likely represents a real 4–5 capability.

---

### slider_0_10
**Raw format:** Integer or float 0–10.
**How to interpret:**

| Range | Meaning |
|---|---|
| 0–2 | Very low; treat as strong constraint or negative signal |
| 3–4 | Below average; note as mild constraint |
| 5–6 | Moderate; neutral — neither advantage nor disadvantage |
| 7–8 | High; positive signal |
| 9–10 | Very high; strong positive signal or strong constraint (depends on question) |

**Question-specific slider interpretations:**

| Question | Low (0–3) | High (7–10) |
|---|---|---|
| Q009 (Urgency) | Exploratory framing | Active transition framing |
| Q026 (Burnout) | Sustainable; not driven by distress | Active burnout; acknowledge before advising |
| Q044 (Learning confidence) | Careful about credential load | Ambitious upskilling viable |
| Q056 (Project ownership) | Prefers support role | Suited for lead/ownership roles |
| Q060 (Risk tolerance) | Avoid P12/P13; weight stability | P12/P13 viable; commission acceptable |
| Q075 (Stay in UAE) | Likely planning to leave; apply target country profile | UAE-focused; apply UAE regional profile |
| Q088 (Language test willingness) | Language tests unlikely; don't recommend as route | Language test a viable pathway opener |
| Q095 (Commission acceptance) | Fixed salary only; P12 financially unattractive | Variable pay upside is a real motivator |

---

### numeric
**Raw format:** Integer or float. May be 0.
**How to interpret:**

| Question | 0 value meaning | Interpretation rule |
|---|---|---|
| Q011 (Years experience) | 0 = less than 1 year | Very early career; apply Ambitious Starter archetype |
| Q064 (Notice period days) | 0 = no notice required | Immediate availability; flag as advantage |
| Q065 (Savings runway months) | 0 = no savings | Financial crisis signal; apply Resource 11 S4 |
| Q066 (Minimum cash AED) | 0 = no stated minimum | Do not infer zero minimum; treat as unanswered |
| Q100 (Weekly study hours) | 0 = no time available | Credential-dependent pathways not viable; note clearly |
| Q101 (Training budget) | 0 = no budget | Free credentials only; flag explicitly |

**For all numeric questions:** If the value is implausibly high (e.g. Q011 = 50 years, Q065 = 120 months), treat as a data entry anomaly and apply conservative interpretation rather than the extreme value.

---

### text_short and text_long
**Raw format:** Free text string. May be empty string `""` or null.
**How to interpret:**

These are the highest-quality signals in the questionnaire when answered well. Apply the following reading approach:

1. **Read for specificity.** A specific answer ("I led a medical emergency with three unconscious passengers and coordinated with ground services across two countries") is high-signal. A vague answer ("I dealt with a difficult situation") is low-signal — do not over-interpret it.

2. **Read for emotional content.** The language a user chooses reveals their relationship with the experience — pride, exhaustion, frustration, joy. This calibrates tone more than any structured answer.

3. **Read for skill evidence.** Narrative answers in Module C often contain skills the user did not rate highly in the likert questions. When narrative evidence contradicts a low likert score, weight the narrative higher.

4. **Read for red flags.** Open text is where sensitive situations surface — burnout language, health disclosures, family crises, forced transitions. Apply Resource 11 signals when detected.

5. **Never quote user text back verbatim in the report** without paraphrasing or contextualising it. Reference their experience, not their exact words.

---

### file_upload
**Raw format:** File reference or null. Content not directly readable by AI.
**How to interpret:** If a file is present, note that the user provided supporting documentation — this signals conscientiousness and preparation. Do not attempt to read or score file content. If no file, this is expected — Q041 is optional.

---

## SECTION B: Null and Missing Answer Handling

Many questions are optional. The AI will frequently encounter null or empty answers. Apply these rules consistently.

### Rule 1: Never infer from absence alone
A null answer means "no data" — not "no" or "low." Do not score a dimension negatively simply because an answer is missing. Adjust confidence, not score direction.

### Rule 2: Apply module-level defaults for missing optional answers

| Module | Missing answer default |
|---|---|
| A — Baseline | Missing Q010: no 30-day goal signal; proceed without it |
| B — Aviation Profile | Missing Q015: assume no special duties |
| C — Skills | Missing Q046: no self-criticism signal; do not penalise |
| C — Skills | Missing Q041 (file upload): expected; no impact |
| D — Work Style | Missing Q049/Q050/Q051: use Q047 environment preference as proxy |
| E — Constraints | Missing Q074 (free zone vs mainland): treat as flexible |
| F — Location | Missing Q080–Q086: treat as UAE-focused with no relocation signal |
| F — Location | Missing Q087 (languages): note as unknown; do not assume English only |
| G — Compensation | Missing Q091/Q092: treat financial floor as Q066 value only |
| G — Compensation | Missing Q096: treat as neutral on second income stream |
| H — Learning | Missing Q107: no dream role signal; proceed without it |
| H — Learning | Missing Q108: no blocker signal; proceed without it |

### Rule 3: Flag low-data pathways
If a pathway's primary scoring questions are mostly unanswered, do not generate a confident score for it. Flag it as "insufficient data to score accurately" and omit from ranked results. Do not present a weakly-evidenced pathway as a strong match.

### Rule 4: Report answer completeness
At the top of every analysis, note the completeness level:
- **High completeness (85%+ questions answered):** Full analysis; high confidence
- **Medium completeness (65–84%):** Good analysis; note which dimensions have thinner evidence
- **Low completeness (below 65%):** Partial analysis only; recommend completing the questionnaire before acting on results

### Rule 5: Partial module completion
If an entire module is unanswered (user stopped mid-questionnaire):
- Module E missing: Cannot score Feasibility dimension reliably; flag explicitly
- Module G missing: Cannot score Compensation dimension; flag explicitly
- Module C missing: Cannot score Skills dimension; analysis is significantly impaired; recommend completion
- Module B missing: Cannot establish aviation profile; analysis is not viable; do not generate report

---

## SECTION C: Answer Combination Patterns Worth Flagging

These specific combinations across questions should trigger additional interpretation steps:

| Pattern | Questions | What to do |
|---|---|---|
| Burnout spike | Q026 ≥ 8 + Q022 ≥ 4 + Q025 exhaustion language | Apply Resource 11 S3; escalate urgency tier |
| Financial crisis | Q065 ≤ 1 + Q068 = Yes + Q066 ≥ 15,000 | Apply Resource 11 S4; restrict to immediate pathways |
| Hidden leader | Q054 = Individual contributor + Q014 includes Purser + Q011 ≥ 5 | Apply Resource 1 leadership correction; user is underselling themselves |
| Dream vs reality gap | Q107 answered + Q060 ≤ 3 + Q065 ≤ 3 | Apply Resource 10 C4; surface the gap honestly |
| Expat planner | Q075 ≤ 3 + Q080 multiple countries + Q081 = 6–24 months | Apply Expat Planner archetype (Resource 8) |
| Forced mover | Leaving reason = medical/redundancy + Q009 ≥ 8 | Apply Resource 11 S1 or S2 |
| Entrepreneurial signal | Q004 includes entrepreneurship + Q059 autonomy first + Q096 = Yes | Apply Entrepreneurial Crew archetype (Resource 8) |
| Study-finance conflict | Q070 = 6+ months + Q065 ≤ 3 | Flag parallel strategy; study alongside employment |

---

*This document should be updated when new question types are added to the questionnaire or when new answer pattern combinations are identified during pilot analysis.*

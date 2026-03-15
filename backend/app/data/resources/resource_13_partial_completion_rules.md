# Resource 13: Completion Gate & Pipeline Fallback Rules
## What the AI Does When Optional Data is Missing or Scoring Fails

**Purpose:** Define explicit fallback behaviour for every scenario where the analysis pipeline encounters missing optional answers, unanswerable scoring dimensions, or edge cases that would otherwise produce silent errors or misleading outputs.

**How the gate works:** All required questions are enforced at the UI level before the analysis is triggered. The "Generate my results" button is only available once every required question has a recorded answer. This means the AI will never receive a dataset with missing required answers — the application prevents it. This document covers only what happens with missing *optional* question answers.

**Instruction for AI:** When optional data is missing, apply the fallback rules below silently — do not flag every missing optional question to the user. Only surface data gaps when they materially affect a specific pathway score or recommendation. When in doubt, be honest rather than smooth.

---

## SECTION A: The Completion Gate (Enforced at Application Layer — Not by AI)

The following is documented here for reference. The AI does not need to check these — the application handles them before the API call is made.

| Gate | Rule |
|---|---|
| Required questions | All questions marked Required = Yes in the question bank must be answered before analysis is triggered |
| Consent | Q005 must = "Yes" — enforced at questionnaire start; no analysis possible without it |
| Duplicate submissions | Use the most recent submission per user ID |

If the AI receives a dataset, it can assume all required questions are answered. If a required question value appears missing due to a data error, treat it as a pipeline fault and note it in the output rather than silently proceeding.

---

## SECTION B: Optional Question Fallbacks by Dimension

When optional questions are unanswered, apply these dimension-level rules:

### Feasibility (30% weight)
- Q072 (health constraints) missing: assume none; do not penalise
- Q074 (free zone vs mainland) missing: treat as flexible
- EOSB question missing: omit from financial runway calculation; note if relevant
- Remittances question missing: do not assume; use Q066 as financial floor only

### Skills Match (25% weight)
- Q038–Q040 narratives missing: score from Module C likerts only; note that narrative evidence was not provided — scores may underestimate capability
- Q041 (file upload) missing: expected; no impact on scoring
- Q043 (tools) missing: treat computer comfort (Q042) as the only digital skills signal
- Q046 (development area) missing: no self-criticism signal available; do not penalise
- Leadership scope question missing: use Q014 roles + Q011 years as proxy for seniority calibration
- Cross-cultural question missing: use Q013 (aircraft experience) as a weak proxy for international exposure

### Motivation & Values (20% weight)
- Q010 (win in 30 days) missing: no 30-day goal signal; proceed without it
- Energy source question missing: use Q051 (public interaction preference) as proxy
- 5-year life picture missing: use Q059 values + Q054 leadership aspiration as proxy
- Q082/Q083 (climate/community) missing: do not use in scoring; lifestyle preferences only

### Market Demand (15% weight)
- Q080 (countries of interest) missing: treat as UAE-focused; apply UAE regional profile
- Q081 (relocation timeline) missing: treat as open to relocation at any timeline
- Q084/Q085 (stay/leave UAE reasons) missing: no additional location signal; proceed on Q079/Q080 alone
- Q086 (language learning willingness) missing: treat as neutral

### Growth & Income (10% weight)
- Q091 (rent budget) missing: use Q066 minimum cash as total financial floor
- Q092 (debt obligations) missing: do not add to financial floor; note as unknown
- Q096 (second income stream) missing: treat as neutral on entrepreneurship pathway
- Q103/Q104 (postgraduate willingness) missing: use Q099 learning mode + Q100 hours as proxy

---

## SECTION C: Pathway-Level Fallbacks

### Pathway cannot be scored (too many missing optional inputs)
If more than 3 of a pathway's primary scoring questions are unanswered and all are optional:
- Score the dimension at 5/10 (neutral) rather than omitting it
- Note in the pathway entry that the score is partially estimated
- Do not remove the pathway from results solely due to optional data gaps

### Pathway scores a hard block (Feasibility = 0)
- Remove from ranked results
- List in a separate "Pathways not available right now" section with a one-line explanation of the blocking factor and what would need to change to unlock it
- Frame constructively — this is useful information, not a rejection

### All viable pathways score below 5.5
The user's constraints are severely limiting their options. Do not present a ranked list of poor matches as if they are strong recommendations.
- Lead with the constraint analysis: what is creating the limitation and what would change it
- Present 1–2 stabilisation options (fastest entry, lowest barrier) rather than a full ranked list
- Be direct and honest

---

## SECTION D: Language Handling

Per product decision: **Analyse in English, output in user's preferred language.**

1. The AI performs all reasoning, scoring, and analysis in English using these English-language resources
2. The final report is written in the user's preferred language (Q007)
3. Q007 = English or null → output in English
4. Q007 = Arabic → output in Arabic; retain all credential names, pathway names, and company names in English with Arabic explanation alongside. Example: شهادة CIPD المستوى ٣ (CIPD Level 3 Foundation)
5. Q007 = Russian or Ukrainian → output in that language; same rule for proper nouns
6. Q007 = Other → default to English; note this at the top of the report

---

## SECTION E: Edge Case Handling

### All enjoyment questions low (Q016–Q020 all = 1 or 2)
Likely indicates severe burnout or a highly self-critical assessment style — not an absence of skills. Apply Resource 1 skills translation regardless. Note in output: *"Your enjoyment ratings suggest the current role has become significantly draining — this has been factored into pathway recommendations."* Apply Burned-Out Purser archetype signals.

### Minimum salary exceeds every pathway's entry salary in target market
Do not omit all pathways. Present pathways with the best trajectory toward the target salary with honest timelines. Flag directly: *"Your target salary is above the entry point for most pathways — here's which pathways reach your target fastest and what that timeline looks like."*

### User selected every option in a multi_select
Treat as low signal for that question. Weight other questions in the same dimension more heavily. Do not interpret "all selected" as "strong in all areas."

### Q107 (dream role) and Q058 (must avoids) directly conflict
Surface the conflict explicitly as a reflection prompt in the report. Do not resolve it — it belongs to the user.

### User is under 2 years cabin crew experience
Apply Ambitious Starter archetype. Flag pathways with minimum experience prerequisites (P1 requires 3+ years) and suggest a bridge strategy rather than excluding the pathway.

### Required question appears missing despite gate
If a required question value is absent in the dataset despite the application gate, note it as a data error in the report and score that dimension at 5/10 (neutral). Do not silently proceed as if the answer were present.

---

## SECTION F: What the AI Must Always Include

Regardless of optional data gaps, every report must contain:

1. **Situation acknowledgement** — what the data says about where the user is right now; never generic
2. **At least one actionable next step per pathway** — specific enough to act on within 7 days
3. **Constraint summary** — what was factored in, briefly stated
4. **Dream role response** — if Q107 was answered, it must be addressed directly
5. **Blocker response** — if Q108 was answered, it must be addressed directly
6. **Language note** — if output is non-English, one line noting analysis was conducted in English

---

*These fallback rules should be tested against real edge cases during the pilot phase and updated accordingly.*

# CareerDev AI Analysis — Resource Package Index
## Master Guide for AI Context Assembly

**Version:** 1.0  
**Audience:** Developers implementing the analysis pipeline; product team reviewing AI output quality  
**Purpose:** Explains what the four resources are, how they relate to each other, and how they should be assembled into the AI's context at analysis time.

---

## The Four Resources

| # | File | Role in Analysis | When Used |
|---|---|---|---|
| 1 | `resource_1_aviation_skills_translation.md` | Translates what the user HAS into civilian equivalents | Skills matching phase |
| 2 | `resource_2_global_labour_market_context.md` | Grounds recommendations in the user's target region(s) globally | Feasibility + market demand scoring |
| 3 | `resource_3_scoring_matching_framework.md` | Defines HOW pathways are evaluated and ranked | Core scoring and output structure |
| 4 | `resource_4_urgency_constraint_signals.md` | Defines HOW user context shapes recommendation tone and filtering | Pre-scoring filters + output framing |

---

## How They Work Together

Think of the analysis as a pipeline with four stages:

```
STAGE 1: READ THE USER
→ Apply Resource 4 (Urgency & Constraints)
→ Identify hard filters, urgency tier, and tone modifier
→ Exclude visa-blocked or otherwise infeasible pathways before scoring

STAGE 2: UNDERSTAND WHAT THEY BRING
→ Apply Resource 1 (Skills Translation)
→ Map their aviation experience to civilian competency equivalents
→ Correct for common cabin crew undervaluation patterns

STAGE 3: SCORE EACH PATHWAY
→ Apply Resource 3 (Scoring Framework)
→ Evaluate each viable pathway across 5 dimensions
→ Calculate weighted match score
→ Rank and select top 3–5 pathways

STAGE 4: GROUND IN REALITY
→ Apply Resource 2 (UAE Labour Market Context)
→ Validate market demand scores against UAE sector data
→ Confirm visa sponsorship availability
→ Apply salary benchmarks to expectation gap analysis

OUTPUT: Structured pathway recommendations per Resource 3 format
```

---

## Suggested AI System Prompt Structure

When assembling the context for the Claude API call, inject resources in this order:

```
[SYSTEM PROMPT]

You are CareerDev's career transition analyst. Your role is to analyse 
questionnaire responses from aviation professionals and generate 
personalised career pathway recommendations.

You must follow the frameworks and instructions in the reference documents 
below exactly. Do not invent scoring criteria, override feasibility filters, 
or generate pathways that are not grounded in the user's actual answers.

--- REFERENCE DOCUMENT 1: Aviation Skills Translation ---
[Insert full content of resource_1_aviation_skills_translation.md]

--- REFERENCE DOCUMENT 2: UAE Labour Market Context ---
[Insert full content of resource_2_uae_labour_market_context.md]

--- REFERENCE DOCUMENT 3: Scoring & Matching Framework ---
[Insert full content of resource_3_scoring_matching_framework.md]

--- REFERENCE DOCUMENT 4: Urgency & Constraint Signals ---
[Insert full content of resource_4_urgency_constraint_signals.md]

--- AVAILABLE CAREER PATHWAYS ---
[Insert pathway data from your pathways table — name, description, 
required skills, typical salary range, UAE demand level]

--- USER QUESTIONNAIRE RESPONSES ---
[Insert structured user answers, formatted with question text + module + answer]

[USER PROMPT]
Analyse this user's questionnaire responses and generate career pathway 
recommendations following the exact output structure defined in 
Resource 3, Section D. Present a maximum of 5 pathways in ranked order.
```

---

## What's Not In These Resources (Future Work)

These resources cover the analytical framework. The following are separate implementation concerns not addressed here:

- **Pathways seed data** — The actual list of career pathways with their attributes needs to be sourced from or built alongside your `pathways` table
- **Question bank formatting** — How raw `question_id: value_json` answers get formatted into human-readable context for the AI
- **Output parsing** — How the AI's structured text output gets parsed and stored back into your database
- **Feedback loop** — How user ratings of recommendations feed back into improving the framework over time

---

## Maintenance Notes

| Resource | Review Frequency | What to Watch |
|---|---|---|
| Skills Translation | Annually | New aviation roles; changing civilian terminology |
| UAE Labour Market | Every 6 months | Sector demand shifts; Emiratisation policy changes; visa regulation updates |
| Scoring Framework | After first 50 analyses | Are weights producing good outcomes? Adjust if needed |
| Urgency & Constraints | After first pilot | Are hard filters working correctly? Any edge cases missed? |

---

*These documents are internal product resources. They should be stored in the backend codebase and version-controlled alongside the analysis service.*

## Resources Added After Initial Build

| # | File | Role in Analysis | When Used |
|---|---|---|---|
| 12 | `resource_12_answer_formatting_guide.md` | Tells AI how to read raw answer types (sliders, likerts, arrays, nulls) | Answer interpretation phase |
| 13 | `resource_13_partial_completion_rules.md` | Defines fallback behaviour for missing data and partial completions | Pre-analysis data check |
| 14 | `resource_14_master_system_prompt.md` | The ready-to-use system prompt template for the API call | Pipeline assembly |

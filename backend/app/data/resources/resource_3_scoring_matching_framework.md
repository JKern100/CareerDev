# Resource 3: Scoring & Matching Framework
## How to Evaluate Career Pathway Fit for CareerDev Users

**Purpose:** Give the AI a consistent, structured method for evaluating how well each career pathway matches a user's profile. This prevents the AI from making intuitive but inconsistent judgements, and gives the product team control over what the platform optimises for.

**Design principle:** The AI should not invent a scoring methodology. It should follow this framework, apply it to each pathway, and surface its reasoning so users can understand why pathways were ranked the way they were.

---

## SECTION A: The Five Matching Dimensions

Each career pathway should be evaluated across five dimensions. Each dimension produces a score from 0–10. The weighted total determines the pathway's overall match score.

---

### Dimension 1: FEASIBILITY (Weight: 30%)
*Can this person actually pursue this pathway given their constraints?*

This is the highest-weighted dimension because a perfect-fit career that is visa-blocked, financially inaccessible, or geographically impossible is worthless to the user.

**Inputs from questionnaire (Module E & F):**
- Visa/residency status and flexibility
- Financial runway (months they can sustain transition)
- Mobility willingness (relocate within UAE, or internationally)
- Dependent obligations
- Current employment status

**Scoring guide:**
| Score | Meaning |
|---|---|
| 9–10 | No material barriers; transition is structurally straightforward |
| 7–8 | Minor barriers present (e.g., short certification needed, moderate financial stretch) |
| 5–6 | Meaningful barriers but surmountable with planning (e.g., visa change needed, 6–12 months study) |
| 3–4 | Significant barriers; transition requires substantial life/financial restructuring |
| 1–2 | Pathway is technically possible but highly unlikely given current constraints |
| 0 | Hard block — visa status, legal restriction, or financial impossibility rules it out |

**Hard blocks that score 0 regardless of other factors:**
- Pathway requires citizenship or nationality the user does not hold (e.g., national-only roles in any country)
- Pathway requires the user to be in a country/region where they have no legal right to work and no realistic visa pathway
- Pathway requires physical relocation user has explicitly ruled out
- Pathway income floor is below user's stated minimum and user has no financial flexibility
- Pathway requires credentials that take longer than user's stated urgency window without a bridge option

---

### Dimension 2: SKILLS MATCH (Weight: 25%)
*How much of what this pathway requires does the user already have?*

**Inputs from questionnaire (Module C):**
- Self-assessed skill ratings (1–5 or 0–10 sliders)
- Narrative evidence provided for key skills
- Confidence scores on answers

**Cross-reference against:** Resource 1 (Aviation Skills Translation Reference) to identify hidden transferable skills the user may have underrated.

**Scoring guide:**
| Score | Meaning |
|---|---|
| 9–10 | Strong match on core skills; user meets most requirements without additional training |
| 7–8 | Good match on majority of skills; 1–2 gaps fillable with short courses or on-the-job learning |
| 5–6 | Partial match; transferable skills present but a meaningful credential or experience gap exists |
| 3–4 | Weak match; foundation exists but significant reskilling required |
| 1–2 | Minimal match; user would be starting near-entry level with this background |
| 0 | No meaningful skills overlap identified |

**Important:** Always adjust for undervaluation. If a user rates themselves 2/5 on leadership but has a purser or senior crew role, apply the correction from Resource 1 and note the adjustment in the output.

---

### Dimension 3: MOTIVATION & VALUES ALIGNMENT (Weight: 20%)
*Does this pathway fit how the user wants to work and what they care about?*

**Inputs from questionnaire (Module D):**
- Work style preferences (collaborative vs independent, structured vs autonomous)
- Values rankings (security, growth, impact, prestige, flexibility, income)
- Risk tolerance (slider 0–10)
- Preferred work environment (office, remote, travel, outdoors, etc.)
- Urgency and reason for transition (burnout vs. curiosity vs. financial vs. forced)

**Scoring guide:**
| Score | Meaning |
|---|---|
| 9–10 | Pathway directly reflects stated values and work preferences |
| 7–8 | Strong alignment on most dimensions; minor friction on 1 factor |
| 5–6 | Mixed alignment; some meaningful preferences not met |
| 3–4 | Pathway conflicts with key stated preferences (e.g., user wants autonomy; pathway is highly supervised) |
| 1–2 | Significant values mismatch; user is unlikely to sustain motivation |
| 0 | Direct conflict with a non-negotiable preference |

**Special cases:**
- If user's primary reason for transition is **burnout**, weight work environment and pace factors more heavily
- If user's reason is **financial**, weight income potential more heavily within this dimension
- High risk tolerance (7–10) opens entrepreneurial and commission-based pathways; low risk tolerance (0–3) should downgrade these pathways accordingly

---

### Dimension 4: MARKET DEMAND (Weight: 15%)
*Is there actual demand for this pathway in the user's target region(s)?*

**Inputs from:** Resource 2 (Global Labour Market Context) — use the regional profile matching the user's target location(s) from Module F
**User inputs:** Module F (target locations, mobility, citizenship/passport held)

**Scoring guide:**
| Score | Meaning |
|---|---|
| 9–10 | High and growing demand in UAE; expat-accessible; multiple employers |
| 7–8 | Solid demand; some competition but realistic hiring timeline |
| 5–6 | Moderate demand; may require networking or niche positioning |
| 3–4 | Limited demand in UAE currently; or strong Emiratisation pressure |
| 1–2 | Low demand; niche or declining sector |
| 0 | No realistic demand in UAE for this user's profile |

---

### Dimension 5: GROWTH & INCOME TRAJECTORY (Weight: 10%)
*Does this pathway offer meaningful growth over 3–5 years?*

**Inputs from questionnaire (Module G & H):**
- Salary floor and ceiling expectations
- Importance of career progression vs stability
- Appetite for further study or credentials

**Scoring guide:**
| Score | Meaning |
|---|---|
| 9–10 | Strong income growth potential; clear senior pathway; aligns with salary expectations |
| 7–8 | Good trajectory; may take 2–3 years to reach target income but realistic |
| 5–6 | Moderate growth; ceiling exists but acceptable within user's stated preferences |
| 3–4 | Slow trajectory or income ceiling below user's medium-term expectation |
| 1–2 | Limited growth; income likely to remain near entry level |
| 0 | Income trajectory is incompatible with user's stated financial requirements |

---

## SECTION B: Weighted Score Calculation

```
Overall Match Score = 
  (Feasibility × 0.30) +
  (Skills Match × 0.25) +
  (Motivation & Values × 0.20) +
  (Market Demand × 0.15) +
  (Growth & Income × 0.10)

Maximum possible score: 10.0
```

### Interpretation bands:
| Score | Label | AI Recommendation Approach |
|---|---|---|
| 8.5 – 10.0 | Strong Match | Lead recommendation; present with high confidence |
| 7.0 – 8.4 | Good Match | Recommended; note any specific gaps or conditions |
| 5.5 – 6.9 | Possible Match | Present as worth exploring; flag key barriers clearly |
| 4.0 – 5.4 | Stretch Match | Include with honest framing; useful for user self-reflection |
| Below 4.0 | Not Recommended | Omit from results unless user has explicitly expressed interest |

---

## SECTION C: Hard Filters (Apply Before Scoring)

These are binary checks. If any apply, the pathway is excluded from scored results entirely — or flagged as blocked with explanation.

1. **Work rights hard block** — User has no legal right to work in the pathway's required location and no realistic visa pathway exists
2. **Nationality requirement** — Role requires citizenship or nationality the user does not hold
3. **Income floor breach** — User's stated minimum salary exceeds realistic entry salary for this pathway by more than 30%, and user has no financial flexibility
4. **Geography exclusion** — Pathway only viable in a region the user has explicitly excluded
5. **Physical requirement** — Pathway has physical requirements the user has indicated they cannot meet
6. **Urgent timeline + long credential** — User needs transition within 3 months; pathway entry requirement is 12+ months of study with no bridge option

---

## SECTION D: Output Structure the AI Should Produce

For each recommended pathway, the AI should produce:

```
PATHWAY: [Name]
MATCH SCORE: [X.X / 10] — [Label]

WHY THIS FITS YOU:
[2–3 sentences connecting user's specific profile to this pathway. 
Reference their actual answers, not generic descriptions.]

YOUR TRANSFERABLE STRENGTHS:
[Bullet list of 3–5 specific skills/experiences from their profile that apply]

GAPS TO ADDRESS:
[Honest list of 1–3 things they'd need to develop or obtain. 
If none, say so clearly.]

FEASIBILITY NOTE:
[1–2 sentences on visa, financial, or logistical considerations specific to them]

FIRST STEPS (next 30–90 days):
[Concrete, actionable list of 3–5 things they can do immediately]

SALARY REALITY CHECK:
[Entry range vs. their expectation; flag if there's a gap and what timeline closes it]
```

---

## SECTION E: Ranking & Presentation Rules

1. Present a **maximum of 5 pathways** in ranked order. More than 5 dilutes trust and overwhelms users.
2. Always present at least **1 "quick win" pathway** — something accessible within 3 months — even if it's not the highest overall score.
3. Always present at least **1 "growth" pathway** — something with strong 3–5 year trajectory even if it requires more upfront investment.
4. If the top 3 pathways all have Feasibility scores below 6, surface this clearly: *"Your current constraints are limiting your most aligned options — here's what we recommend addressing first."*
5. Never present a pathway without **at least one concrete next step** the user can take within 30 days.

---

*This framework is a living document. Weights and scoring bands should be reviewed after the first 50 user analyses to assess whether outputs match user-reported satisfaction and outcomes.*

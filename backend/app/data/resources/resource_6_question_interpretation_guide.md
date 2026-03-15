# Resource 6: Question Interpretation Guide
## How the AI Should Read and Apply Questionnaire Answers

**Purpose:** The questionnaire was designed to collect structured self-assessment data. This guide tells the AI what each module and its key questions are *designed to measure*, which questions are most diagnostic, how to handle low-confidence or ambiguous answers, and how to interpret conflicting signals across modules.

**Instruction for AI:** Do not treat questionnaire answers as face-value facts. Treat them as signals that require interpretation. A user who rates themselves 3/5 on leadership may be accurately modest or may be significantly undervaluing a purser-level role. A user who selects "low urgency" may be protecting themselves emotionally from a change they are actually desperate for. Read the full picture, not individual data points.

---

## MODULE A: Consent & Baseline

**What it measures:** Orientation, expectations, and urgency framing. Sets the tone for everything else.

**Most diagnostic questions:**
- **Q009 (Urgency slider):** The single most important framing signal. Treat 0–3 as exploratory, 4–6 as planning mode, 7–10 as active transition. But cross-check against Module B burnout signals — stated urgency and felt urgency often diverge.
- **Q004 (Desired outcomes):** If user selected "Entrepreneurship," flag this early — it significantly narrows which pathways are relevant and changes the tone of recommendations.
- **Q010 (Win in 30 days):** Tells you what the user actually wants from the platform — not always what they said in Q004. Take this seriously as a tone calibrator.

**Interpretation notes:**
- Q007 (Preferred language) and Q008 (Communication style) should directly shape how the report is written. "Minimal" style = shorter, bullet-led. "Detailed" = full explanations. "Motivational" = warmer framing. "Direct" = no softening.
- Q001 (Country) + passport question: Cross-reference to establish where work rights are strongest. A user based in UAE with an EU passport has significantly more options than one on an employer-sponsored visa only.

---

## MODULE B: Aviation Profile & Satisfaction

**What it measures:** The depth and quality of the user's aviation experience, and crucially — their emotional relationship with the work. This module is the foundation for skills translation and urgency calibration.

**Most diagnostic questions:**
- **Q026 (Burnout slider):** 7–10 = active burnout. This escalates urgency regardless of Q009. It also shapes tone — do not lead with aspirational framing for users scoring 8+.
- **Q024 (Peak moment):** The most revealing open text in the module. What a user describes as their best moment tells you what they value most and what they want to preserve. A user who describes a medical emergency handled well = values competence under pressure. A user who describes a passenger interaction = values human connection.
- **Q025 (Hard moment):** Equally revealing. What they never want again is as important as what they want. A user who describes exhausting emotional labour = needs a lower-people-contact pathway. A user who describes a conflict with management = may struggle in hierarchical environments.
- **Q011 (Years experience):** Combined with Q014 (roles held) and Q015 (special duties) this establishes seniority level for pathway scoring. Do not rely on years alone — 10 years in economy class is different from 5 years as a purser.

**Interpretation notes:**
- Q016–Q020 (enjoyment ratings): These are the clearest signals for pathway fit. High Q016 (safety) + high Q020 (compliance) = strong P6 (HSE) and P1 (training) signal. High Q017 (service) + high Q018 (conflict) = strong P4 (CX), P9 (hospitality) signal. High Q019 (teamwork/leading) = management track potential across multiple pathways.
- Q021–Q023 (drain ratings): High scores here tell you what to avoid, not just what they don't enjoy — these are energy-depleting factors that will follow them if the new role has the same characteristics.
- **Reason for leaving (new question):** This is a hard filter. Medical/forced = treat as Critical urgency regardless of Q009. Burnout = wellbeing framing first. Redundancy = practical and immediate framing. Curiosity = exploratory framing.

---

## MODULE C: Transferable Skills & Evidence

**What it measures:** The user's self-assessed skill profile, with narrative evidence to calibrate accuracy.

**Most diagnostic questions:**
- **Q034 (Training/instructing):** Adaptive trigger question. Score ≥ 3 unlocks training-adjacent pathways (P1, P2, P14). Below 3 = deprioritise these pathways significantly.
- **Q032 (Crisis response):** One of the most undervalued skills in this population. Cabin crew have real crisis response experience that civilians rarely have. A score of 3/5 here likely underrepresents actual capability — apply the correction from Resource 1.
- **Q038, Q039, Q040 (Narrative evidence):** These are the highest-quality signals in the entire module. Read these carefully. They reveal actual behaviour, not self-perception. A user who rates Q033 (team coordination) 3/5 but describes coordinating a 12-person crew through an emergency in Q038 should be scored higher.
- **Q045 (What colleagues rely on you for):** Reveals the user's functional identity — how others perceive their contribution. This often surprises users and frequently reveals strengths they haven't surfaced elsewhere.
- **Q046 (Development area):** If answered honestly, this is the most useful gap signal in the module. If the answer is vague or deflecting ("sometimes I work too hard"), note it as low-quality signal and do not over-index on it.

**Interpretation notes:**
- **Systematic undervaluation:** Apply Resource 1 corrections throughout this module. Assume cabin crew users underestimate by approximately 1 point on leadership, crisis response, and compliance skills relative to their actual demonstrated capability.
- Q044 (Learning confidence): This is a gate signal. Below 4 = flag credentials carefully, don't overwhelm with study requirements. Above 7 = user is likely to engage positively with upskilling recommendations.
- Q042 (Computer comfort) + Q043 (Tools): Low scores here narrow P8a, P8b significantly and affect P2, P3 recommendations. High scores open more pathways.

---

## MODULE D: Work Style & Environment Preferences

**What it measures:** How the user wants to work — not just what they want to do. This module prevents the AI from recommending the right career in the wrong environment.

**Most diagnostic questions:**
- **Q059 (Values):** The most important question in the module. If "Stability" is ranked first, never recommend P12 (Sales) or P13 (Entrepreneurship) without heavily caveating. If "Autonomy" is ranked first, deprioritise highly structured or supervised roles. If "Mission" is ranked first, lean toward P11 (Healthcare), P14 (Education), or NGO-type roles within pathways.
- **Q060 (Risk tolerance):** Hard boundary for P12 and P13. Below 4 = explicitly flag that sales and entrepreneurship pathways carry income risk that conflicts with stated preference. Do not omit them if other signals are strong, but surface the conflict clearly.
- **Q057 (Non-negotiables) + Q058 (Must avoids):** Read these carefully as override signals. If a user says "I will never work shifts again" in Q058, do not recommend P9 (Hospitality) entry roles without flagging that shift work is common at entry level. If they say "I need to travel" in Q057, weight P10 (Private aviation) and international roles higher.
- **Q054 (Leadership aspiration):** Individual contributor preference should depress management-track pathway scoring. Senior leader preference should weight management progression potential in pathway scoring.

**Interpretation notes:**
- Q047 (Preferred environment): Multi-select — users often choose contradictory options (e.g. "Structured" and "Creative"). When this occurs, use Q059 values and Q025 hard moment to resolve the conflict.
- Q050 (Teamwork vs independent): Low scores (prefers independent) = flag roles that are heavily collaborative. This particularly affects P3 (HR), P7 (PM), and P5 (Operations) which all require constant cross-functional work.
- Q053 (Tolerance for ambiguity): Critical for P13 (Entrepreneurship) and P2 (L&D) — both require high ambiguity tolerance. Below 3 should prompt a flag on these pathways.

---

## MODULE E: Constraints & Feasibility

**What it measures:** The structural reality of the user's situation — what they can actually do, not what they'd like to do.

**Most diagnostic questions:**
- **Q065 (Savings runway):** The most important feasibility signal. Below 3 months = only recommend immediately accessible pathways with no credential gap. 3–6 months = short credentials viable. 6+ months = full range accessible.
- **Q066 (Minimum monthly cash):** Cross-reference against pathway salary floors. If minimum cash exceeds entry salary of a pathway by more than 30%, flag explicitly — don't hide the gap.
- **Q061 (Residency type) + visa/passport signals:** Cross-reference with target location from Module F. An employer-sponsored expat with no savings runway and dependents (Q068) is in a constrained position that must be acknowledged before any recommendations.
- **Q076 (Biggest constraint):** User-stated constraint should be treated as a hard override. Whatever they name here must be acknowledged and respected in the recommendation framing.
- **Q077 + Q078 (Trade-offs willing/unwilling to make):** These are the user's own boundary statements. Never recommend something that violates Q078.

**Interpretation notes:**
- Q070 (Willingness to pause income): "No" = only recommend pathways with zero study gap or pathways where study can be done alongside current employment.
- Q071 (Willingness to start at entry level): "No" = remove pathways where entry would require a significant step down from current seniority. Flag clearly if this significantly restricts options.
- Q072 (Health constraints): If "Some" is selected, do not probe — note sensitivity and deprioritise physically demanding roles. Medical grounding context (if disclosed elsewhere) = Critical urgency trigger.
- Q068 (Dependents): Yes = increase financial conservatism in all recommendations. Highlight financial runway implications of every transition option.

---

## MODULE F: Location & Mobility

**What it measures:** Where the user can and wants to go, and what constraints that creates.

**Most diagnostic questions:**
- **Q079/Q080 (Target locations):** Primary geography filter. Apply the correct regional profile from Resource 2 for the user's stated target market.
- **Q087 (Languages):** Cross-reference with target markets. Arabic + UAE target = significant advantage flagged explicitly. French + Europe = opens French-speaking markets. Tagalog/Hindi/Urdu = relevant for specific community hiring in UAE.
- **Q085 (Top reason to leave UAE):** If answered specifically (not "better opportunities" generically), this reveals the user's actual dissatisfaction with their current situation — useful for tone and framing.
- **Q081 (Relocation timeline):** Cross-reference with urgency (Q009). A user with urgency 8 and relocation timeline "24+ months" has a conflict — they need something local now, global later.

**Interpretation notes:**
- If Q080 is blank (no countries selected), treat as UAE-focused and apply UAE regional profile only.
- Q086 (Willingness to learn a language): Yes = opens additional markets. No = restricts to English-dominant markets or user's current language markets.
- Q082/Q083 (Climate and community preference): Use these to validate relocation suggestions, not to lead them. Don't lead recommendations with "you'd love Canada because you prefer temperate climates."

---

## MODULE G: Compensation & Benefits

**What it measures:** Financial expectations, flexibility, and total compensation picture.

**Most diagnostic questions:**
- **Q089 (Target monthly cash):** The user's floor. Cross-reference against pathway entry salaries in their target market. Surface gaps explicitly — do not paper over a 40% salary cut.
- **Q090 (Cash vs benefits preference):** Affects how to frame total compensation. "Benefits" preference = highlight pathways with strong healthcare, housing, and pension packages. "Cash" = highlight base salary and progression speed.
- **Q095 (Commission acceptance):** High score (7–10) = P12 (Sales) becomes significantly more viable financially — variable pay upside should be highlighted. Low score (0–3) = P12 loses most of its financial appeal.
- **Total comp baseline (new question):** Compare current total compensation (including allowances) against target monthly cash. Many cabin crew will find they're currently earning more in total than their stated target cash — or less than they realise once allowances are stripped. Surface this calculation explicitly.

**Interpretation notes:**
- Q092 (Debt obligations): Add to monthly minimum from Q066 to establish real financial floor.
- Q096 (Second income stream): Yes = P13 (Entrepreneurship) becomes more viable as a parallel-build strategy rather than a full jump. Recommend as a "build alongside" option if other signals support it.
- Remittances question (new): Yes = add to financial floor calculation. A user sending AED 3,000/month home has a higher real minimum than Q066 suggests.

---

## MODULE H: Learning & Credentials

**What it measures:** The user's realistic capacity and appetite for upskilling — which determines how quickly different pathways become accessible.

**Most diagnostic questions:**
- **Q100 (Weekly study hours available):** The most important feasibility signal for credential-dependent pathways. Below 5 hrs/week = only recommend self-paced credentials with low weekly intensity. 10+ hrs/week = full range of credentials viable.
- **Q101 (Training budget):** Cross-reference against credential costs in Resource 9. Budget below AED 3,000 restricts to free or low-cost options (Google certificates, Coursera). AED 10,000+ opens professional certifications (NEBOSH, CIPD, PMP).
- **Q105 (Target start date):** Convert to urgency tier. "Within 1 month" = Critical urgency. "1–3 months" = High urgency. "Just exploring" = Low urgency. Cross-check against Q009.
- **Q107 (Dream role):** Despite being optional, this is one of the most valuable questions in the bank. When answered, it often contradicts the user's more "sensible" answers elsewhere — revealing genuine aspiration. Always surface this tension respectfully if it exists.
- **Q108 (What would stop action):** Read this as a pre-objection the user is raising about their own plan. Address it directly in the recommendations rather than ignoring it.

**Interpretation notes:**
- Q097 (Education level) + Q098 (Field of study): Degree in relevant field = credential bar lowers for adjacent pathways. No degree = note where this is a real barrier vs. where experience substitutes.
- Q099 (Learning mode): "University" preference + low budget + full-time work = conflict. Flag this. "Self-study" preference = favour asynchronous, self-paced credentials.
- Q106 (Preferred career families): Cross-reference with pathway scoring. If user selects "Entrepreneurship" here but shows low risk tolerance in Q060, surface the tension.

---

## CROSS-MODULE INTERPRETATION RULES

**When Module A urgency and Module B burnout conflict:**
Trust the burnout score. A user who says urgency 3 but burnout 8 is protecting themselves. Treat as High urgency and use compassionate framing.

**When Module C skills and Module B enjoyment conflict:**
Enjoyment wins for long-term fit. A user skilled at something they hate will be unhappy doing it in a new career. Note the skill as an asset but don't recommend pathways where it would be the primary daily activity.

**When Module D values and Module G compensation conflict:**
Compensation wins for short-term viability; values win for long-term retention. Recommend the financially viable pathway first, then surface the values-aligned pathway as a medium-term goal.

**When Module F location and Module E feasibility conflict:**
Feasibility wins. Don't recommend a pathway in a market where the user has no legal right to work, regardless of how strong the skills fit is.

**When Q107 (dream role) conflicts with everything else:**
Surface it. Don't suppress a user's stated aspiration because the other signals make it look difficult. The role of the analysis is to be honest about the path to the dream, not to replace the dream with something more achievable.

---

*This guide should be updated as new question types are added and as patterns emerge from real user analyses during the pilot phase.*

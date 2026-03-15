# Resource 4: Urgency & Constraint Signal Definitions
## How the AI Should Interpret and Apply User Context Signals

**Purpose:** The AI must understand not just *what* a user answered, but *what it means* for how recommendations should be shaped. This document defines how to read urgency and constraint signals from questionnaire answers and translate them into meaningful adjustments to the analysis output.

**Design principle:** These signals act as filters and tone modifiers. They don't change the scoring framework — they change how recommendations are presented, what gets emphasised, and what gets excluded.

---

## SECTION A: Urgency Signals

### Primary Urgency Signal (Module A — Baseline)

The questionnaire captures how urgently the user wants or needs to transition. Map responses to the following tiers:

| User Response | Urgency Tier | Meaning for Analysis |
|---|---|---|
| "I'm actively trying to leave as soon as possible" | 🔴 Critical (0–3 months) | Prioritise immediately accessible pathways; flag long-credential routes as secondary; emphasise financial runway |
| "I'm planning to transition within 6 months" | 🟠 High (3–6 months) | Balance quick-win and growth pathways; credential options under 3 months are viable |
| "I'm thinking about transitioning in the next 1–2 years" | 🟡 Medium (6–24 months) | Full range of pathways available; credential investment is reasonable |
| "I'm exploring options but not in a hurry" | 🟢 Low (24+ months) | Broadest pathway range; frame as career exploration not urgent decision |
| "I'm not sure / just curious" | ⚪ Exploratory | Treat as Low urgency; avoid pressure framing; use discovery language |

### Secondary Urgency Signals (Module B — Satisfaction & Burnout)

These modify the primary urgency tier. Even if a user selected a low urgency level, these signals may indicate the need for a more urgent response tone.

**Burnout indicators — escalate urgency tone if present:**
- Self-rated job satisfaction: 1–2 / 5
- Reports of health impact from current role
- Describes feeling "trapped" or "stuck" in open text
- Reports active avoidance behaviours (calling in sick, counting days)
- Mentions relationship or family stress attributed to the role

**AI instruction:** If burnout signals are detected alongside any urgency tier, add a wellbeing acknowledgement to the output before recommendations. Example: *"It sounds like the timing of this transition matters not just professionally, but for your wellbeing. The recommendations below prioritise options that can move quickly while setting you up for long-term satisfaction."*

**Forced transition indicators — treat as Critical regardless of stated urgency:**
- Contract ending (fixed-term)
- Airline restructuring / redundancy mentioned
- Medical grounding (unable to continue flying for health reasons)
- Visa expiry without renewal pathway

---

## SECTION B: Constraint Signals

Constraints are structural facts that limit what recommendations are viable. The AI must identify these before scoring pathways, not after.

### B1: Financial Constraints (Module E & G)

| Signal | What to Check | AI Action |
|---|---|---|
| Financial runway < 3 months | Module E: savings/runway question | Flag as Critical constraint; only recommend pathways with immediate income potential |
| Financial runway 3–6 months | Module E | Note as constraint; prefer pathways with quick hiring timelines |
| Financial runway 6–12 months | Module E | Credential investments under 6 months are viable |
| Financial runway 12+ months | Module E | Full flexibility on timeline |
| Dependents on user's visa | Module E | Increase financial constraint weight; flag EOSB calculation as priority action |
| Current salary significantly above target entry salary | Module G | Flag income gap explicitly; don't hide it; offer timeline to close the gap |
| Debt obligations mentioned | Module E | Treat as financial runway reducer; be conservative on transition timelines |

**Key rule:** Never recommend a pathway where the entry salary is more than 30% below the user's stated minimum without explicitly flagging this and explaining what timeline or progression closes the gap.

---

### B2: Visa & Legal Constraints (Module E)

This is the most common hard constraint for expat users. The AI must handle this carefully — bad visa advice could lead to serious legal or financial harm.

| Signal | AI Interpretation | Response |
|---|---|---|
| Citizen / permanent resident of target country | Full work rights — no constraint | No visa action needed; full pathway range available |
| EU citizen targeting EU country | Free movement rights | No visa action needed; full pathway range in any EU member state |
| Commonwealth citizen targeting UK/Australia/NZ/Canada | Strong immigration pathways | Flag relevant skilled migration routes as a parallel action |
| Employer-sponsored visa, currently employed | Standard expat situation | Recommend pathways where new employer provides sponsorship; flag self-employment options where available |
| Employer-sponsored visa, notice period given | Grace period active (varies by country: UAE 60 days, UK immediate, Australia varies) | Treat as Critical urgency; flag grace period length explicitly |
| Long-term / investor / golden visa (UAE, Portugal, Greece, etc.) | High flexibility | Self-employment, freelance, and company formation fully viable |
| Freelance / self-employment visa | Already self-employed | Consulting, coaching, independent practice pathways fully viable |
| Dependent / spouse visa | Work rights vary by country | Check if work rights are attached (many countries allow dependent work rights); if not, flag obtaining independent permit as first step |
| No current visa in target country | Must secure visa before relocating | Identify the correct visa route for target country; advise against relocating without secured offer or valid visa |
| Open to immigration (skilled migration) | Australia, Canada, New Zealand, Germany offer points-based or skills-based routes | Flag immigration pathway as a medium-term option alongside job search |

**Disclaimer the AI must always include when surfacing visa information:**
*"Visa and work permit regulations vary by country and change frequently. Always verify your specific situation with a registered immigration consultant or the official government immigration authority of your target country before making employment decisions."*

---

### B3: Geographic Constraints (Module F)

| Signal | AI Action |
|---|---|
| Unwilling to relocate (current city only) | Restrict pathway scoring to roles available in user's current location |
| Open to relocation within current country | Expand pathway scoring to include major cities in that country |
| Open to regional relocation (e.g., GCC, EU, APAC) | Apply relevant regional profiles from Resource 2; score pathways across that region |
| Open to global relocation | Use citizenship and language profile to identify highest-opportunity markets; surface regional variation in recommendations |
| Tied to specific location (school, family, medical) | Hard-lock location; deprioritise any pathway requiring relocation regardless of fit score |
| Mentions specific target country or city | Treat as primary location preference; score pathways primarily against that market |

---

### B4: Time Availability Constraints (Module H & D)

| Signal | AI Action |
|---|---|
| Currently working full-time, roster-based | Study options must be self-paced or online; flag in-person intensive programmes as difficult |
| Long-haul flying schedule (frequent absences) | Further reduce in-person study viability; highlight async/online credentials |
| Available for full-time study | Open all credential options; can pursue accelerated programmes |
| Caring responsibilities (children, family) | Flag time commitment of credential options explicitly; prefer flexible programmes |

---

## SECTION C: Constraint Stacking — When Multiple Constraints Apply

When multiple constraints apply simultaneously, the AI should acknowledge the complexity honestly rather than generating recommendations that ignore it.

**High constraint stack (3+ significant constraints):**
- 🔴 Critical urgency + financial pressure + visa tied to current employer
- AI response: Lead with the constraint acknowledgement. Recommend a short-term stabilisation strategy first (e.g., extend current employment while preparing), then layer in transition pathways. Do not generate an optimistic pathway list that ignores structural reality.

**Example framing for high constraint stack:**
*"Based on your answers, you're navigating a combination of time pressure, financial constraints, and visa dependency that limits immediate options. We've prioritised pathways that can be pursued without leaving your current job, and flagged the actions that will give you the most flexibility within your current situation."*

**Moderate constraint stack (1–2 significant constraints):**
- Standard approach: note constraints in Feasibility scoring; surface in pathway notes
- Offer at least one pathway that works within constraints as a first recommendation

**No significant constraints:**
- User has runway, visa flexibility, and no hard geographic limits
- Full pathway range available; frame as opportunity rather than limitation
- Focus recommendations on values and ambition alignment

---

## SECTION D: Tone Modifiers by User State

These are overall framing instructions for how the AI should write its output, based on the combination of urgency and constraint signals.

| User State | Tone Instruction |
|---|---|
| Exploratory, low urgency, no constraints | Curious and expansive. Frame as possibility mapping. |
| Motivated, medium urgency, few constraints | Energetic and structured. Balance aspiration with practical steps. |
| Urgent but constrained | Honest and grounded. Acknowledge difficulty. Prioritise stability and near-term wins. |
| Burnout-driven transition | Compassionate first. Acknowledge before advising. Emphasise roles with better quality of life. |
| Forced transition (medical, redundancy) | Clear and practical. Avoid dwelling on the circumstance. Focus on what's possible now. |
| High ambition, long runway | Ambitious and stretching. Encourage growth pathways. Don't undersell them. |

---

## SECTION E: What the AI Should Never Do

- **Never generate recommendations that ignore hard constraints.** A visa-blocked pathway presented as viable destroys user trust.
- **Never present financial reality as optional.** If entry salary is below the user's floor, say so directly.
- **Never use urgency as an excuse to recommend lower-quality pathways.** "You need to move fast" is not a reason to recommend a bad fit.
- **Never omit the constraint summary.** Even if constraints are minimal, briefly acknowledge what you factored in — this builds trust.
- **Never assume constraints the user didn't state.** Only apply constraints that are evidenced in their answers.
- **Never be falsely optimistic.** A user making a real career decision needs honest framing more than they need encouragement.

---

*This document should be reviewed alongside real user outputs during the first pilot phase to validate that urgency and constraint signals are being applied correctly and proportionately.*

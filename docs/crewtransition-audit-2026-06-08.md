# CrewTransition — End-to-End Audit (Strategy · Messaging · Functionality)

*Date: 2026-06-08 · Read-only audit, no code changed. Recommendation types: **framing-safe** (do anytime) · **engine-decision** (touches scoring/pathways/archetypes/knowledge docs) · **founder-decision** (strategy/product call).*

Grounded in `CLAUDE.md`, `docs/crewtransition-strategic-advisor.md`, `docs/crewtransition-question-audit-framework.md`, and a direct read of the code/copy.

---

## Executive summary — the 5 highest-leverage findings

1. **Your binding constraint is distribution, and it's unaddressed.** The product (engine + copy) is now genuinely good, but *nothing reliably brings crew in*: one blog post (`frontend/src/lib/blog.ts`), a `TODO` where testimonials should be (`page.tsx:635`), no pride/social artifact, and the co-founder who *was* your crew-community access is gone (strategy doc §4). **This is the single biggest risk to traction.**
2. **You can't yet measure the thing your whole strategy hinges on.** Your thesis is "judge channels by conversion, not reach" — but Vercel's free Hobby tier **doesn't record the funnel events** we wired (`hook_started/completed/unlock`). Today you see visits + referrers, **not** hook→signup conversion. Fixable cheaply (PostHog free).
3. **The highest-stakes moment can hang.** Report generation is **synchronous** (`api/analysis.py`) on a **free backend that cold-starts ~50s** — so a first-time user who just signed up and clicks "unlock" can wait 30–60s or time out. That's conversion death at the worst possible point.
4. **The data quietly says "Gulf-first," but you haven't committed to it.** Salary figures only exist for AED/Gulf (`pathways.json` bands; teaser hides figures elsewhere). Naming Gulf crew as the first market would sharpen SEO, positioning, and the salary experience — right now it's implied, not decided.
5. **Messaging is on-brand and coherent (a real strength)** — the worth/curiosity voice holds across hero, `/start`, report, pricing, dashboard, plan, coach. The residue is in *non-user-facing* layers (knowledge docs still say "escape"; Q025 options; localization) — important but second-order.

---

## Pillar 1 — Strategy & distribution

| # | Current state → risk | Recommendation | Impact | Effort | Type |
|---|---|---|---|---|---|
| S1 | **Distribution unbuilt.** 1 SEO post; no testimonials (`page.tsx:635` TODO); no shareable worth artifact; warm channel (co-founder's network) lost. → *Great product nobody reaches.* | Pick **one** time-boxed channel experiment with a pass/fail bar: either an **SEO cluster** around private, high-intent crew queries ("careers after flying", "cabin crew transferable skills", Gulf-specific) **or** one **pride/worth shareable**. Don't do both. Measure organic spread + conversion. | High | M | founder-decision |
| S2 | **Funnel not measurable.** Hobby tier drops custom events → no hook→signup conversion data; only reach. → *You'll be forced to judge channels by the feed, the exact failure your strategy warns against.* | Move the 3 funnel events to **PostHog free** (≈1M events/mo, real funnels). Small code change. Keep Vercel for pageviews/referrers. | High | S | framing-safe |
| S3 | **Gulf-first implied, not committed.** AED-only salary data; teaser only shows figures for Gulf. → *Diffuse positioning; weaker SEO; non-Gulf users get a thinner teaser.* | Decide explicitly. If Gulf-first: aim SEO/positioning/imagery at UAE/Gulf crew; treat other regions as "coming soon." Revisit when you have non-AED data. | High | S (decision) | founder-decision |
| S4 | **Backend is free-tier + cold-starting** (50s spin-down; the app warned in Render/Railway). → *First impressions and report generation stall.* | Keep the instance warm (scheduled ping) and/or upgrade the backend plan; pair with F1 (async generation). | High | M | founder-decision |
| S5 | **Free/paid is reasonable but fuzzy at the edges.** Pro = **$9/mo** (Paddle); free = Stage-1 + summary. Price is **hardcoded** in the UI (`pricing/page.tsx:256`) and Tier-3's value isn't explained to free users. | Pull price from backend; add a one-line "what Pro unlocks" incl. Stage 3, coach, plan. | Med | S | framing-safe |

**Cheapest next experiment:** instrument conversion (S2) **first** — it's a prerequisite for judging *any* channel — then run one SEO-cluster experiment (S1) aimed at Gulf queries (S3). Everything else is premature until you can see the funnel.

---

## Pillar 2 — Messaging & UX

| # | Current state → risk | Recommendation | Impact | Effort | Type |
|---|---|---|---|---|---|
| M1 | **Voice is consistently on-brand** across hero, `/start`, report, summary, pricing, dashboard, plan, coach, blog (verified). | Keep it. Note as a strength; protect it in future copy via `CLAUDE.md`. | — | — | ✅ |
| M2 | **"Escape" language remains in knowledge docs** — `resource_5_pathway_profiles.md:16` ("escape operations"), `resources_8_to_11.md:272` ("escape service work"). → *The model's worldview still encodes exit-framing even though output is reframed.* | Retone these to worth/curiosity **without changing detection/weighting** (same pattern as the Archetype-1 retone already done). | Med | S | engine-decision |
| M3 | **Q025 options are still incident-confessions** ("Verbally abusive passenger", "burnout episode"). Mitigated (Tier-3, and they double as the archetype "hard moment" signal). | Decided earlier to hold — they feed archetype detection. Leave, or do the keyword-preserving softening. | Low | S | engine-decision |
| M4 | **Localization debt, user-visible.** Non-English users (es/uk/ar-EG) get translated UI but **English question prompts/options/help** (`question_bank.csv` + `option_hints.json` English-only; translations' `questions:{}` empty). → *Jarring mid-flow language switch; looks unfinished.* | Either translate the question bank for the offered languages, or **restrict the language switch to EN** until translations exist. Don't ship a half-localized flow. | Med | L | framing-safe |
| M5 | **Hardcoded English on `coach`/`pricing`** (e.g. `pricing/page.tsx:214,224,308,449`; coach quota strings). | Move to translation keys. | Low–Med | S | framing-safe |
| M6 | **Pathway-count inconsistency.** Engine scores **17** (`pathways.json`: P1–P16, P8a/P8b); `resource_5` only profiles ~15 (no profile for **P15 Creative**, **P16 Media/PR**); `resource_14` template still says "14"; `/start` + `/methodology` say 17. → *Either the claim is wrong somewhere, or you're scoring two pathways the model can't reason about well.* | Set the canonical number and align docs; **decide whether P15/P16 should be scored at all** without profiles (see F7). | Med | S | engine-decision |
| M7 | **Email/deliverability gaps.** List-Unsubscribe present ✅; but **CAN-SPAM physical address missing**, transactional `EMAIL_FROM` still `noreply@`, and the friendly-From + Reply-To fix is **unmerged in PR #176**. | Merge #176, set Railway `NEWSLETTER_*` vars; add a physical address before any real list blast (PO box/virtual mailbox). | Med | S | framing-safe |

---

## Pillar 3 — Functionality & technical health

| # | Current state → risk | Recommendation | Impact | Effort | Type |
|---|---|---|---|---|---|
| F1 | **Report generation is synchronous, no timeout/queue** (`api/analysis.py`; `results/page.tsx` calls `runAnalysis()` then reads). On a cold backend this can exceed request timeout. → *The post-signup payoff hangs or 500s.* | Make generation **async (job + poll)** or at minimum warm the instance + raise timeout + clear progress UI. Scoring logic untouched — this is request/job plumbing. | High | M | engine-decision* |
| F2 | **No graceful fallback if the LLM/Gemini key is missing/down on `/results`** (summary has a rule-based fallback; results just errors). | Friendlier error + optional deterministic fallback so users never hit a dead end. | Med | M | framing-safe |
| F3 | **Real bug — `plan/page.tsx:404`:** ternary has **identical branches** (`status === "skipped" ? handleUnskip : handleUnskip`), so "done" vs "skipped" behave the same. | One-line fix to branch correctly. | Low–Med | S | framing-safe |
| F4 | **Paddle checkout race** (`pricing/page.tsx:85–96`): 2s `setTimeout` then sync, **silent catch**. → *If the webhook lags, a paying user lands on the dashboard without Pro active.* | Verify subscription on dashboard load with retry/backoff; surface failure instead of swallowing. | Med (revenue) | M | framing-safe |
| F5 | **Silent error swallows** — plan notes (`catch {}`) and goal updates show no failure. → *User believes a save succeeded when it didn't.* | Surface a small error/toast on write failures. | Low | S | framing-safe |
| F6 | **Auto-regeneration on `can_regenerate` flags** (results/summary) regenerates without consent. Fine for admin, risky if ever set on a real user (re-incurs LLM cost, overwrites). | Gate behind explicit user action, or scope strictly to admin/impersonation. | Low | S | framing-safe |
| F7 | **Engine-data gap.** `Q032` (crisis→P6 skill), `Q022` (→P12 negative signal), `Q100/Q101` (feasibility) are **referenced by scoring but never asked**; **P15/P16 scored without `resource_5` profiles**. → *Those signals never fire; two pathways are scored with thin guidance.* | Decide: re-add the questions to the flow (or trim the dead refs), and either profile or de-scope P15/P16. | Med | M | engine-decision |
| F8 | **Mobile mostly fine** (clamp fonts, `auto-fit` grids), but **coach goals panel** `width: min(300px, 35vw)` gets cramped on narrow phones. | Stack the goals panel below chat under ~700px. | Low | S | framing-safe |
| F9 | **Accessibility — good baseline** (real `<button>`s, ARIA on selectors), gaps: pricing promo input has **no `<label>`**, Likert buttons lack label association, some `#475569`-on-dark text is **below AAA contrast**, and **RTL rules exist but Arabic RTL is untested**. | Add labels; bump low-contrast grays; test `dir="rtl"` for Arabic. | Low–Med | S–M | framing-safe |
| F10 | **Tech debt / duplicate infra.** LemonSqueezy legacy config lingers; the **Render service still exists and keeps failing** (you're on Railway; `render.yaml` already removed from repo). | Delete the Render service (Render dashboard); drop LemonSqueezy config if unused. | Low | S | framing-safe |

\* F1 is "engine-decision" only because it touches the analysis *pipeline*; the **scoring/LLM logic itself stays unchanged**.

---

## Prioritized roadmap

**Now (high impact, low effort, mostly framing-safe)**
- S2 — wire funnel to **PostHog free** so you can see conversion.
- M7 / PR #176 — merge the From+Reply-To fix; set Railway vars.
- F3 — fix the plan-page button bug.
- F10 — delete the failing Render service.
- S3 — **make the Gulf-first call** (a decision, not code).

**Next (high impact, more effort / decisions)**
- S4 + F1 — stop the backend cold-start + make report generation async so the post-signup payoff is fast and reliable.
- S1 — launch **one** time-boxed distribution experiment (SEO cluster, Gulf-targeted), now that S2 lets you measure it.
- M4 — resolve localization (translate the question bank **or** lock to EN).
- M6 / F7 — settle the pathway count and the P15/P16 + dead-question-signal questions.

**Later (polish / hardening)**
- F2 (LLM-down fallback), F4 (Paddle race), F5/F6 (silent errors, auto-regen), F8/F9 (mobile + a11y), M2/M3/M5 (knowledge-doc retone, Q025, remaining i18n), S5 (dynamic price + Pro clarity).

---

## Open questions for the founder
1. **Gulf-first?** Commit, or keep global? (Unlocks S1/S3 and the salary experience.)
2. **Distribution bet:** which *one* experiment first — SEO cluster or a pride/worth shareable?
3. **Measurement:** OK to add **PostHog free** for the funnel (recommended), or stay Vercel-only?
4. **Backend spend:** willing to upgrade/keep-warm and invest in async generation (F1/S4)? This directly protects conversion.
5. **Pathways:** keep scoring **P15/P16** without profiles, or de-scope? And the canonical count to display?
6. **Engine-adjacent retones** (knowledge-doc "escape" language M2, Q025 options M3): do them, or leave frozen?
7. **Localization:** translate the question bank, or restrict to English for now?
8. **PRs:** merge **#176** (email) and **#175** (skip unsubscribed users)?

*What would sharpen this:* live funnel data (post-S2), and ~the first 20 real generated reports to validate report quality and archetype detection against actual users.

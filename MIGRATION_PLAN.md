# Migration Plan — Fork CrewTransition into a Generic Career-Matching Product

**Approach chosen:** Fork to a new repo, then de-brand (externalize copy/branding into config so the engine stays generic). This gives speed now and a clean path to later run CrewTransition itself as one "content pack" of the same engine.

**Mental model:** You are keeping the **engine** unchanged and replacing the **content + brand**. Treat the engine as a product you don't fork-edit; treat everything below the "swap" line as data you author.

---

## Phase 0 — New repo + infrastructure (½–1 day)

### 0.1 Create the repo
- Create a new GitHub repo (e.g. `pathfinder` / working name).
- Copy the codebase. Two options:
  - **Clean history (recommended):** copy the working tree into a fresh repo with a new initial commit. Avoids dragging CrewTransition's history/secrets references.
  - **Full history:** `git clone --mirror` then push to the new remote, if you want the commit history.
- Strip anything CrewTransition-specific from committed files (see Phase 4 env table — none of the real secrets are committed, they're env vars, which is good).

### 0.2 Provision a separate stack (nothing is shared with CrewTransition)
| Service | What to create | Notes |
|---|---|---|
| **Supabase** | New project (Postgres + pgvector) | New `DATABASE_URL` / `DATABASE_URL_SYNC` |
| **Railway** | New backend service from the new repo | Runs `python start.py`, healthcheck `/health` |
| **Vercel** | New project from the new repo (`frontend/`) | Set `NEXT_PUBLIC_API_URL` rewrite to the new Railway URL |
| **Resend** | Verify the new sending domain | New `EMAIL_FROM`, webhook → `/webhooks/resend`, `RESEND_WEBHOOK_SECRET` |
| **Paddle** | New product + price (`pri_xxx`) | New `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_PRO` |
| **LLM** | Reuse or new key | `LLM_API_KEY`, `LLM_MODEL` |
| **Domain** | New domain + DNS | Drives canonical URLs, OG tags, email DKIM/SPF |

### 0.3 Run DB migrations
- Alembic migrations are domain-agnostic — run them as-is against the new Supabase DB. Schema needs **no changes**.

---

## Phase 1 — De-brand refactor (make the engine generic) — 1–2 days

Goal: no hardcoded "cabin crew / aviation / Emirates" anywhere in the **engine**. Pull brand + audience language into one config each side.

### 1.1 Backend brand/config
- `backend/app/config.py` → set `APP_NAME`, `EMAIL_FROM`, `FRONTEND_URL`, `ALLOWED_ORIGINS` via env (already env-driven — just new values).
- `backend/app/services/coach.py` — contains domain phrasing (e.g. "UAE/GCC and global job markets") and the coach system prompt. Generalize the coach persona to be audience-neutral or audience-configurable.

### 1.2 Frontend brand layer (new)
Create **`frontend/src/lib/brand.ts`** as the single source of brand truth:
```ts
export const BRAND = {
  name: "Pathfinder",
  nameAccent: "finder",          // for the two-tone logo treatment
  tagline: "Find your next career move.",
  audienceNoun: "career changers",
  domain: "https://example.com",
  // colors already live in globals.css; reference tokens here if you want them in JS
};
```
Then replace the **~105 hardcoded aviation references across ~25 files**. The highest-density files:
- `frontend/src/app/page.tsx` — the marketing homepage (badges, headline, "Built for flight attendants", pathways marquee, methodology copy, stats). **Biggest single file.**
- `frontend/src/app/layout.tsx` — `<title>` / meta description (site-wide SEO).
- `frontend/src/components/PublicHeader.tsx`, `BlogNav.tsx`, `AppHeader.tsx` — logo wordmark + nav.
- `frontend/src/app/{terms,privacy,refund}/page.tsx` — legal copy mentioning the brand.
- `frontend/src/app/newsletter/*` — newsletter branding/copy.
- `frontend/src/lib/blog.ts` + `frontend/src/app/blog/*` — the blog system is generic, but **the existing post is aviation content** (drop or replace it).
- `frontend/src/utils/shareImage.ts` — share-card text.
- `frontend/public/` — `logo.svg`, `hero-logo.png`, `hero-plane.png`, `hero-people.png` → replace with new brand assets.

### 1.3 Translations
- `frontend/src/translations/{en,es,uk,ar-EG}.json` contain aviation strings. The questionnaire/UI uses these; marketing homepage does **not** (it's hardcoded). Update the JSON strings; you can start English-only and backfill locales later.

### 1.4 Definition of done for Phase 1
- `grep -riE 'cabin crew|flight attendant|aviation|emirates|etihad|flydubai|airline|layover|roster' frontend/src backend/app` returns **only** content-data files (questions/pathways/resources), not engine/UI code.

---

## Phase 2 — Content authoring (the real work; critical path) — weeks, not days

This is where the product is actually made. Everything here lives in `backend/app/data/`. **Keep the file formats and ID schemes identical** so the engine keeps working untouched.

### 2.1 Questions — `question_bank.csv` (currently 123 rows)
- Schema (keep it): `question_id, module, prompt, type, required, options_json, min, max, route_if_json, tags_json, help_text`.
- **Keep the `Q001…` ID scheme as stable "slots."** Pathways and resources reference these IDs — renumbering breaks the mappings.
- Redesign: baseline (location, work rights), interests, skills, environment preferences, feasibility/constraints, compensation expectations — but for a **general** audience (current Q001/Q002 are UAE/aviation-flavored).
- `route_if_json` drives conditional branching (`routing.py`) — preserve the mechanism.

### 2.2 Pathways — `pathways.json` (~14 pathways)
This is the most coupled file. Each pathway object contains:
- `name`, `description`, `typical_roles`, `prerequisites`
- `salary_band_refs` + `salary_global_note` (currently AED / UAE sources → re-source for your market)
- `recommended_credentials` (currently IATA etc. → general credentials)
- **Question mappings:** `skill_questions`, `interest_questions`, `environment_questions`, `feasibility_questions`, `compensation_questions`, `interest_match_values`, `negative_signals` — all reference question IDs.
- **Weights:** `weight_interest/skill/environment/feasibility/compensation/risk` (sum ≈ 1.0).
- ⚠️ **Re-map every pathway's question references after the questions change**, and re-tune weights. Budget real calibration time here.

### 2.3 Option hints — `option_hints.json` (392 lines)
- Tooltip/explainer text per answer option → rewrite for the new questions.

### 2.4 Knowledge docs — `backend/app/data/resources/*.md`
These are injected into the AI analysis context (`career_analysis.py`, fixed injection order). Rewrite each for the general domain:
| File | Purpose | Action |
|---|---|---|
| `resource_0_index.md` | Overview | Rewrite |
| `resource_1_aviation_skills_translation.md` | Maps user's skills → civilian equivalents | **Rewrite for general audience** (e.g. transferable-skills framework) |
| `resource_2_global_labour_market_context.md` | Regional market/visa/salary context | Re-source for target markets |
| `resource_3_scoring_matching_framework.md` | How pathways are scored | Mostly generic — light edits |
| `resource_4_urgency_constraint_signals.md` | Tone/filtering by user context | Light edits |
| `resource_5_pathway_profiles.md` | Per-pathway deep profiles | **Rewrite to match new pathways.json** |
| `resource_6_question_interpretation_guide.md` | What each Q measures (references Q-IDs) | **Rewrite to match new questions** |
| `resource_7_example_outputs.md` | Few-shot examples | Rewrite |
| `resource_12_answer_formatting_guide.md` | Output formatting | Mostly generic |
| `resource_13_partial_completion_rules.md` | Confidence handling | Generic — keep |
| `resource_14_master_system_prompt.md` | Master prompt + injection order | **Rewrite persona/audience**; keep structure |
| `resources_8_to_11.md` | Credentials/market extras | Rewrite |

> Tip: do **2.1 → 2.2 → 2.4** in that order, because pathways depend on questions and the docs depend on both.

---

## Phase 3 — Branding & messaging (1–2 days, parallel with Phase 2)
- New logo + hero imagery in `frontend/public/`.
- Homepage copy (`page.tsx`): headline, subhead, the pathways marquee list, methodology section, stats bar — all currently aviation-specific.
- Email templates: the branded wrapper `_branded_email()` + DB-backed templates (admin "Edit Templates") — update logo/colors/footer and the per-template copy.
- Blog: remove/replace the aviation post; the blog engine + sitemap stay.
- Legal pages: terms/privacy/refund — swap entity name; have them reviewed.

---

## Phase 4 — Config / env / integrations (½ day)
New `.env` values (everything is already env-driven — this is just new values):

| Var | Purpose |
|---|---|
| `APP_NAME` | Product name |
| `DATABASE_URL` / `DATABASE_URL_SYNC` | New Supabase |
| `SECRET_KEY` | New random secret |
| `ALLOWED_ORIGINS` | New frontend origin(s) |
| `FRONTEND_URL` | New domain |
| `EMAIL_FROM`, `NEWSLETTER_FROM`, `NEWSLETTER_SENDER_ADDRESS` | New sender + CAN-SPAM address |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | New Resend project + webhook |
| `GOOGLE_CLIENT_ID/SECRET` | New OAuth app (redirect URIs → new domain) |
| `LLM_API_KEY`, `LLM_MODEL` | AI pipeline (optionally switch model) |
| `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_PRO`, `PADDLE_ENVIRONMENT` | New billing |
| Frontend `NEXT_PUBLIC_API_URL` | New backend URL (vercel.json rewrite) |

Also update committed infra files: `vercel.json` (rewrite target), `render.yaml` / `railway.toml` (names), `docker-compose.yml` (local names), `frontend/vercel.json`.

---

## Phase 5 — QA & launch checklist
- [ ] Sign-up / login / Google OAuth on the new domain
- [ ] Full questionnaire → summary → results → action plan renders with new content
- [ ] Scoring produces sensible rankings (sanity-check 3–5 fake personas end-to-end)
- [ ] AI analysis reads the new resource docs (no aviation leakage in output)
- [ ] Paddle checkout (sandbox first) → Pro unlock
- [ ] Email: verify delivery + open/click tracking on the new domain (apply the lessons from CrewTransition: real `<a>` links, verified domain, webhook wired)
- [ ] SEO: title/canonical/OG per new brand; sitemap; blog
- [ ] `grep` sweep: zero aviation references outside content-data files
- [ ] Mobile (375px) pass on homepage + questionnaire + results

---

## Effort summary
| Phase | Effort | Risk |
|---|---|---|
| 0 Infra | ½–1 day | Low |
| 1 De-brand engine | 1–2 days | Low (mechanical) |
| 2 Content authoring | **Weeks** | **High — this is the product** |
| 3 Branding | 1–2 days | Low |
| 4 Config | ½ day | Low |
| 5 QA | 1–2 days | Medium |

**The code work is small and fast. The content design (questions ↔ pathways ↔ knowledge docs ↔ scoring calibration) is the real project** — that's where domain expertise and iteration go.

---

## Suggested sequencing
1. Phase 0 (repo + infra) and Phase 1 (de-brand) can be done immediately and quickly — they make a generic, deployable skeleton.
2. Phase 2 content is authored against that skeleton, iterating with test personas.
3. Phase 3/4 branding + config in parallel.
4. Phase 5 QA, then soft launch to a friends group (same playbook you're using for CrewTransition).

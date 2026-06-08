# CrewTransition Listening Agent — MVP

A Reddit monitor that surfaces transition-relevant conversations and drafts brand-voice replies for you to review and post manually.

This is the Phase 1 implementation of the listening agent spec'd in `listening_agent_spec.md`. It covers Reddit only (the platform with a clean API). Instagram and LinkedIn remain semi-automated for now via the screenshot-and-ask workflow.

---

## What it does

Once a day:

1. Scans seven subreddits (cabin crew, flight attendant, Emirates, UAE-related) for posts from the last 24 hours
2. Scores each post against signal patterns (transition language, UAE-specific concerns, pathway curiosity, burnout markers)
3. Filters out disqualifiers — mental health crisis posts, aspiring-crew content, politically charged threads, lead-magnet spam
4. Drafts a suggested reply in brand voice for each surviving post, using the verified facts from the anchor post slate
5. Writes everything to a markdown digest you can read in 10 minutes
6. Remembers which posts it surfaced so the same one is never offered twice

What it does **not** do:

- Post anything automatically. Ever. You always decide whether to engage.
- Send DMs, follow accounts, or take any action on your behalf.
- Monitor Instagram, LinkedIn, or TikTok (those need the screenshot workflow for now).
- Surface mental health crisis posts. Those are auto-filtered as a wellbeing choice.

---

## What you need

| Item | Cost | One-time setup time |
|------|------|----------------------|
| Reddit API credentials | Free | 5 minutes |
| Anthropic API key | ~$5-15/month at this volume | 2 minutes if you don't have one |
| Python 3.10+ installed | Free | 10 minutes if not installed |
| A place to run it | Free options exist | Varies (see below) |

Total one-time setup: **30–60 minutes**, depending on what's already installed.

---

## One-time setup

### Step 1 — Get Reddit API credentials

1. Go to https://www.reddit.com/prefs/apps
2. Scroll to the bottom, click **"are you a developer? create an app"**
3. Fill in: **name** = "crewtransition-listener", **type** = "script", **redirect uri** = "http://localhost" (anything works for a script app)
4. Click **Create app**
5. Note two values from the result:
   - **Client ID**: the short string just under "personal use script"
   - **Client secret**: the longer string labeled "secret"

### Step 2 — Get an Anthropic API key

1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Go to **Settings → API Keys → Create key**
4. Copy the key (starts with `sk-ant-`)

### Step 3 — Install Python dependencies

In the agent's folder, run:

```bash
pip install -r requirements.txt
```

### Step 4 — Set the credentials as environment variables

Create a file called `.env` in the agent's folder (or set them in your shell). Add:

```
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=crewtransition-listener/0.1 by your_reddit_username
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

The `REDDIT_USER_AGENT` should ideally include your Reddit username — Reddit requests this for politeness.

---

## Daily use

Once a day, run:

```bash
python agent.py
```

This writes a file like `digests/digest_2026-05-31.md` to the same folder.

Open that file. You'll see something like:

> **1. Considering leaving Emirates after 6 years — gratuity questions**
>
> Subreddit: r/cabincrewcareers
> Posted: 8 hours ago by u/example_user
> Engagement: 14 upvotes, 23 comments
> Signal score: 78 (Direct transition conversation, UAE-specific concern)
> Link: https://reddit.com/...
>
> Original post (preview): ...
>
> Suggested reply: ...
>
> Decision: [ ] Engage [ ] Skip [ ] Save for later

Read the original thread. If you agree the suggested reply adds value, copy it (edit if needed) and post it from the @crewtransition Reddit account. Done.

Daily time investment target: **10 minutes**.

---

## Running it automatically (optional, recommended)

Running the script manually works, but automating it removes one more thing to remember.

**Option A — Your laptop (simplest if your laptop is on every morning):**

- Mac/Linux: add a cron job:
  ```
  0 7 * * * cd /path/to/agent && python agent.py
  ```
- Windows: use Task Scheduler with the same command.

**Option B — A free cloud service (most reliable):**

- **GitHub Actions** (free, recommended): commit the code to a private repo, add the credentials as repository secrets, create a workflow that runs on a schedule. ~15 minutes to set up. Survives your laptop being off.
- **Railway.app** scheduled jobs: similar concept, web UI instead of YAML.

Recommend GitHub Actions for the combination of free + reliable + survives anything.

---

## What you can tune without touching code

Everything that controls *what* the agent surfaces is in the CONFIGURATION block at the top of `agent.py`. You can edit these without changing any logic:

- **SUBREDDITS** — add or remove communities to monitor
- **KEYWORDS** — change which phrases trigger which signal categories
- **DISQUALIFIERS** — add patterns the agent should never surface
- **WEIGHTS** — change how categories are ranked against each other
- **POST_AGE_HOURS** — extend the lookback window past 24h
- **MIN_SCORE** — raise to surface fewer / higher-quality items, lower for more volume
- **MAX_POSTS_PER_DIGEST** — cap on items per day

Also tunable without code: the **BRAND_VOICE_PROMPT** further down, which is the instruction Claude uses when drafting replies. As the brand voice evolves or new factual base lands (e.g., the cofounder validates new specifics), edit this block. The verified facts from `anchor_post_slate.md` are repeated here on purpose — they should stay in sync.

---

## What's NOT tunable without code

These require Claude Code or a developer:

- Adding a new platform (e.g., LinkedIn, Hacker News)
- Changing the output format (e.g., to email instead of markdown file)
- Changing the scoring algorithm itself (e.g., adding ML-based scoring)
- Multi-user / team support
- A web dashboard for reviewing the digest

All of these are in the Phase 2/3 backlog of the listening agent spec. None are needed for the MVP to be useful.

---

## Maintenance overhead

Once set up:

- **Daily:** ~10 minutes reviewing the digest. No code touched.
- **Weekly:** ~5 minutes glancing at engagement patterns, deciding if any keyword or subreddit should change. Edit the CONFIGURATION block if so.
- **Monthly:** ~15 minutes refreshing the BRAND_VOICE_PROMPT if the cofounder validates new facts or the voice evolves.
- **As-needed:** if UAE labour law or visa rules change, update both `anchor_post_slate.md` AND the BRAND_VOICE_PROMPT to stay in sync.

The hardcoded facts in the prompt are the brittle part. They were verified in May 2026; they should be re-verified yearly or whenever a regulatory change is reported.

---

## Operating cost

- Reddit API: free (current usage well within free tier)
- Anthropic API: ~$5-15/month at expected volume (15 reply drafts per day × Claude Sonnet pricing)
- Hosting (if using GitHub Actions): free
- **Total: ~$5-15/month**

If the agent surfaces even one conversation per month that converts to a Pro subscription, it pays for itself.

---

## If something goes wrong

**The script errors out with "Missing environment variable":**
Your credentials aren't loading. Confirm the `.env` file is in the same folder as `agent.py`, or that you've exported them in your shell.

**The digest is empty:**
Either (a) nothing matched today, which is normal on slow days, or (b) MIN_SCORE is set too high. Lower it to 25 temporarily and re-run to see what's getting close.

**Replies sound generic / off-brand:**
Edit the BRAND_VOICE_PROMPT. Add more specific examples of what the voice should and shouldn't sound like. The model follows the prompt closely.

**Replies cite numbers you don't recognize:**
The model is hallucinating. The verified facts in the prompt are what it should be drawing from. If it's inventing other numbers, tighten the "do not invent numbers" instruction or shorten the factual base to only what's been validated.

**Reddit rate-limits you:**
Highly unlikely at this volume, but if it happens, reduce SUBREDDITS or POST_AGE_HOURS.

---

## Reference materials

- `listening_agent_spec.md` — the full spec this implements (Phase 1 only)
- `anchor_post_slate.md` — brand voice principles and verified facts
- `monitoring_map.md` — where the audience lives across platforms

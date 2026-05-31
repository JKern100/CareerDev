#!/usr/bin/env python3
"""
CrewTransition Listening Agent — MVP (Phase 1)

Monitors Reddit for transition-relevant conversations.
Ranks them. Drafts suggested replies in brand voice.
Outputs a daily digest as a markdown file.

Usage:
    python agent.py

Designed to be run daily (via cron, Task Scheduler, or manually).
Never auto-engages. Always outputs drafts for human review.
"""

import os
import sys
import sqlite3
import textwrap
from datetime import datetime, timezone, timedelta
from pathlib import Path

import praw
from anthropic import Anthropic
from dotenv import load_dotenv

# Load credentials from a local .env file if present (see .env.example).
# Real environment variables always take precedence over values in .env.
load_dotenv()


# =============================================================================
# CONFIGURATION
# Edit this section to tune the agent's behavior.
# No code knowledge needed — just edit the lists and numbers.
# =============================================================================

# Subreddits to monitor. Add or remove freely.
SUBREDDITS = [
    "cabincrewcareers",
    "flightattendants",
    "emiratescareers",
    "Emirates",
    "dubai",
    "UAEjobs",
    "UAE",
]

# Keywords that score posts as relevant. The more matches, the higher the score.
# Categorized so different signal types weight differently in ranking.
KEYWORDS = {
    # Direct transition signals — highest weight
    "high_signal": [
        "leaving emirates", "left emirates", "leaving etihad",
        "leaving flydubai", "leaving cabin crew", "leaving flying",
        "career change", "career after", "careers after flying",
        "ex cabin crew", "ex flight attendant", "thinking about leaving",
        "considering leaving", "considering quitting", "resigning",
        "transition out", "next career", "post flying", "after flying",
        "what's next", "what to do next",
    ],

    # UAE-specific signals — medium-high weight, matches our positioning
    "uae_signal": [
        "gratuity", "end of service", "end-of-service",
        "uae visa", "dubai visa", "abu dhabi", "uae labor law",
        "uae labour law", "free zone visa", "green visa", "golden visa",
        "emirates grade", "aed",
    ],

    # Pathway / skills curiosity — medium weight
    "pathway_signal": [
        "skills transfer", "what pays well", "non flying jobs",
        "ground roles", "corporate l&d", "what fields",
        "career advice cabin crew", "advice flight attendant",
        "transferable skills",
    ],

    # Burnout signals — medium weight, but require care (see disqualifiers)
    "burnout_signal": [
        "burned out", "burnout", "exhausted", "drained",
        "tired of flying", "tired of this job", "had enough",
    ],
}

# Disqualifiers — posts containing these are dropped regardless of score.
# Critical: includes mental health crisis language (we don't engage on those)
# and wrong-direction content (aspiring crew, not transitioning crew).
DISQUALIFIERS = [
    # Mental health crisis — respect wellbeing, never engage
    "suicid", "self-harm", "self harm", "killing myself", "end it all",
    "literal toilet", "can't take", "can't take it", "beyond desperate",
    "kms", "want to die", "no point",

    # Wrong audience direction — people trying to BECOME crew
    "want to become", "applying to emirates", "applying for cabin",
    "open day", "interview tips", "how to apply", "how to get hired",
    "passing the interview", "preparing for emirates", "tips for interview",
    "cabin crew application", "csa batch",

    # Politically charged / wartime content
    "during the war", "fair weather", "boycott emirates", "genocide",
    "israeli airstrike", "iranian war", "war exodus",

    # Lead magnet / spam patterns
    "comment link", "dm me link", "comment guide",
]

# Scoring weights
WEIGHTS = {
    "high_signal": 25,
    "uae_signal": 20,
    "pathway_signal": 15,
    "burnout_signal": 10,
    "comment_bonus": 0.5,    # points per comment, capped
    "comment_cap": 15,        # max bonus from comments
    "upvote_bonus": 0.3,      # points per upvote, capped
    "upvote_cap": 15,         # max bonus from upvotes
    "recency_bonus": 15,      # full points if < 6 hours, decays to 0 at 24 hours
}

# How far back to look (hours)
POST_AGE_HOURS = 24

# Minimum total score for a post to make it into the digest
MIN_SCORE = 35

# Maximum number of posts in a single digest
MAX_POSTS_PER_DIGEST = 15

# Output paths
OUTPUT_DIR = Path("./digests")
STATE_DB = Path("./agent_state.db")

# Claude model used for drafting replies
DRAFT_MODEL = "claude-sonnet-4-5"
DRAFT_MAX_TOKENS = 400


# =============================================================================
# BRAND VOICE PROMPT
# Used by the Claude API when drafting suggested replies.
# Embeds the factual base from anchor_post_slate.md so replies are accurate.
# =============================================================================

BRAND_VOICE_PROMPT = """You are drafting a Reddit reply in the voice of CrewTransition, a brand helping UAE cabin crew transition to non-flying careers.

VOICE PRINCIPLES:
- Insider, not influencer. Sound like someone who knows the space deeply.
- Direct about money, visa, and tradeoffs. No hype. No corporate hedging.
- Specifics over generalities. Real numbers beat vague claims.
- No agreement-fluff ("Totally agree!", "Great post!", "This is so true!").
- Always add information, never just affirm.
- Never include CTAs. No "DM us", no "link in bio", no "check out our".
- No emojis unless the original post used them.

VERIFIED FACTUAL BASE (use only these specifics — do not invent numbers):
- UAE gratuity rule (Federal Decree-Law No. 33 of 2021): 21 days basic salary per year for years 1-5, 30 days per year after year 5. Calculated on basic only, not total. Capped at 2 years' basic.
- Since Feb 2022, resigned and terminated employees receive same gratuity. Old reduction abolished.
- Emirates Grade II compensation: ~AED 4,260 basic + AED 60-70/hour flying pay × 80-90 hours/month + layover allowances. Total monthly cash ~AED 10-12k. Plus free housing (worth AED 5-8k/month in Dubai), transport, medical, ID90 flight benefits.
- UAE post-cancellation grace period: 30-180 days depending on visa type.
- Green Visa requires AED 15k+/month skilled salary OR AED 360k/year freelance income.
- Golden Visa for skilled professionals: AED 30k+/month basic minimum.
- UAE L&D Manager roles: AED 13-27k typical, senior up to 32k+.
- Pathways that translate well from crew: corporate L&D, hospitality leadership at luxury venues, private aviation, B2B sales, real estate (commission-heavy).

LENGTH: 60-120 words. Substantive but conversational.

STRUCTURE:
1. Lead with the specific factual or experiential point that adds value.
2. One concrete number, rule, or named pathway when relevant.
3. Optional: a short closing observation that invites further thought (not a CTA).

If the post is asking about a topic outside the verified facts above, write a softer, more general reply that doesn't invent specifics. When in doubt, point toward the general principle rather than fabricate a number.

Output ONLY the reply text. No preamble. No commentary. No quotation marks."""


# =============================================================================
# SIGNAL PATTERNS (for the digest summary, not used in scoring)
# =============================================================================

# Human-readable category labels shown in the digest
CATEGORY_LABELS = {
    "high_signal": "Direct transition conversation",
    "uae_signal": "UAE-specific concern",
    "pathway_signal": "Pathway / skills curiosity",
    "burnout_signal": "Burnout / dissatisfaction signal",
}


# =============================================================================
# STATE TRACKING (SQLite)
# Tracks which posts have been alerted on, so we never re-surface the same one.
# =============================================================================

def init_db():
    """Create the SQLite database if it doesn't exist."""
    conn = sqlite3.connect(STATE_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS seen_posts (
            post_id TEXT PRIMARY KEY,
            subreddit TEXT,
            title TEXT,
            score INTEGER,
            surfaced_at TEXT,
            user_action TEXT DEFAULT NULL
        )
    """)
    conn.commit()
    return conn


def already_seen(conn, post_id):
    """Return True if this post has been surfaced before."""
    cur = conn.execute("SELECT 1 FROM seen_posts WHERE post_id = ?", (post_id,))
    return cur.fetchone() is not None


def mark_seen(conn, post_id, subreddit, title, score):
    """Record that a post has been surfaced in a digest."""
    conn.execute(
        """INSERT OR IGNORE INTO seen_posts
           (post_id, subreddit, title, score, surfaced_at)
           VALUES (?, ?, ?, ?, ?)""",
        (post_id, subreddit, title, score, datetime.now(timezone.utc).isoformat())
    )
    conn.commit()


# =============================================================================
# SCORING
# =============================================================================

def score_post(post):
    """
    Score a Reddit post against the signal patterns.

    Returns a tuple of (total_score, matched_categories) where
    matched_categories is a list of category keys that fired.

    Returns (0, []) if the post matches any disqualifier.
    """
    # Combine title and body for scanning
    text = f"{post.title}\n{post.selftext}".lower()

    # Disqualifier check — short-circuit if matched
    for term in DISQUALIFIERS:
        if term in text:
            return 0, []

    total_score = 0
    matched_categories = []

    # Keyword category matching
    for category, terms in KEYWORDS.items():
        for term in terms:
            if term in text:
                total_score += WEIGHTS[category]
                if category not in matched_categories:
                    matched_categories.append(category)
                break  # Only count one match per category to avoid stacking

    # If no signal at all, skip the post
    if total_score == 0:
        return 0, []

    # Engagement bonuses (capped)
    comment_bonus = min(post.num_comments * WEIGHTS["comment_bonus"], WEIGHTS["comment_cap"])
    upvote_bonus = min(post.score * WEIGHTS["upvote_bonus"], WEIGHTS["upvote_cap"])
    total_score += comment_bonus + upvote_bonus

    # Recency bonus — full points if <6h old, decays linearly to 0 at 24h
    post_age_hours = (datetime.now(timezone.utc) - datetime.fromtimestamp(
        post.created_utc, tz=timezone.utc
    )).total_seconds() / 3600

    if post_age_hours < 6:
        total_score += WEIGHTS["recency_bonus"]
    elif post_age_hours < 24:
        total_score += WEIGHTS["recency_bonus"] * (1 - (post_age_hours - 6) / 18)

    return int(total_score), matched_categories


# =============================================================================
# REDDIT FETCHING
# =============================================================================

def get_reddit_client():
    """Authenticate with Reddit using credentials from environment variables."""
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "crewtransition-listener/0.1"),
    )


def fetch_recent_posts(reddit, subreddit_name, hours_back):
    """Fetch posts from a subreddit created in the last N hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    posts = []

    try:
        subreddit = reddit.subreddit(subreddit_name)
        # Iterate up to 100 newest posts; stop when we go past the cutoff
        for post in subreddit.new(limit=100):
            post_time = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
            if post_time < cutoff:
                break
            posts.append(post)
    except Exception as e:
        print(f"  ! Error fetching r/{subreddit_name}: {e}", file=sys.stderr)

    return posts


# =============================================================================
# REPLY DRAFTING
# =============================================================================

def draft_reply(anthropic_client, post):
    """Call the Claude API to draft a suggested reply in brand voice."""
    user_message = f"""Subreddit: r/{post.subreddit.display_name}
Title: {post.title}

Post content:
{post.selftext if post.selftext else '(title-only post)'}

Draft a reply that adds substantive value to this conversation, following the brand voice principles."""

    try:
        response = anthropic_client.messages.create(
            model=DRAFT_MODEL,
            max_tokens=DRAFT_MAX_TOKENS,
            system=BRAND_VOICE_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        return f"[Reply drafting failed: {e}]"


# =============================================================================
# DIGEST OUTPUT
# =============================================================================

def format_post_block(rank, post, score, categories, draft):
    """Format a single post entry for the digest markdown."""
    permalink = f"https://reddit.com{post.permalink}"
    age_hours = (datetime.now(timezone.utc) - datetime.fromtimestamp(
        post.created_utc, tz=timezone.utc
    )).total_seconds() / 3600

    category_labels = ", ".join(CATEGORY_LABELS.get(c, c) for c in categories)

    body_preview = post.selftext[:400] if post.selftext else "(title-only post)"
    if len(post.selftext) > 400:
        body_preview += "..."

    block = textwrap.dedent(f"""
        ---

        ### {rank}. {post.title}

        **Subreddit:** r/{post.subreddit.display_name}
        **Posted:** {age_hours:.0f} hours ago by u/{post.author.name if post.author else "[deleted]"}
        **Engagement:** {post.score} upvotes, {post.num_comments} comments
        **Signal score:** {score} ({category_labels})
        **Link:** {permalink}

        **Original post (preview):**

        > {body_preview.replace(chr(10), chr(10) + '> ')}

        **Suggested reply:**

        ```
        {draft}
        ```

        **Decision:** [ ] Engage  [ ] Skip  [ ] Save for later
    """).strip()

    return block


def write_digest(scored_posts):
    """Write the daily digest to a markdown file."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    output_path = OUTPUT_DIR / f"digest_{today}.md"

    header = textwrap.dedent(f"""
        # CrewTransition — Listening Digest
        ### {datetime.now(timezone.utc).strftime("%A, %d %B %Y")}

        {len(scored_posts)} conversations surfaced from the last {POST_AGE_HOURS} hours.

        Suggested replies are drafted in brand voice for your review.
        Always read the full thread before posting — drafts may need editing.
    """).strip() + "\n\n"

    body = "\n\n".join(
        format_post_block(i + 1, post, score, cats, draft)
        for i, (post, score, cats, draft) in enumerate(scored_posts)
    )

    if not scored_posts:
        body = "_No qualifying posts surfaced today. Try widening keyword set or extending the time window._"

    footer = textwrap.dedent("""

        ---

        ## Notes

        - Posts you've already engaged with on prior digests are not re-surfaced.
        - Mental health crisis posts and wrong-audience content (aspiring crew, lead magnets, war-themed) are auto-filtered.
        - Edit the KEYWORDS and DISQUALIFIERS lists in agent.py to tune what gets surfaced.

        _Generated by listening_agent_mvp v0.1_
    """).strip()

    output_path.write_text(header + body + footer, encoding="utf-8")
    return output_path


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("CrewTransition Listening Agent — daily run")
    print(f"Scanning {len(SUBREDDITS)} subreddits, posts from last {POST_AGE_HOURS} hours\n")

    # Set up dependencies
    conn = init_db()
    reddit = get_reddit_client()
    anthropic_client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Phase 1: Fetch and score posts
    candidates = []
    for sub_name in SUBREDDITS:
        print(f"  Scanning r/{sub_name}...")
        posts = fetch_recent_posts(reddit, sub_name, POST_AGE_HOURS)
        print(f"    Found {len(posts)} recent posts")

        for post in posts:
            if already_seen(conn, post.id):
                continue
            score, cats = score_post(post)
            if score >= MIN_SCORE:
                candidates.append((post, score, cats))

    # Sort by score, descending
    candidates.sort(key=lambda x: x[1], reverse=True)

    # Cap at max per digest
    candidates = candidates[:MAX_POSTS_PER_DIGEST]

    print(f"\n  {len(candidates)} posts passed the threshold (score >= {MIN_SCORE})")

    # Phase 2: Draft replies for qualifying posts
    scored_posts = []
    for post, score, cats in candidates:
        print(f"  Drafting reply for: '{post.title[:60]}...'")
        draft = draft_reply(anthropic_client, post)
        scored_posts.append((post, score, cats, draft))
        mark_seen(conn, post.id, post.subreddit.display_name, post.title, score)

    # Phase 3: Write the digest
    output_path = write_digest(scored_posts)
    print(f"\n✓ Digest written to {output_path}")

    conn.close()


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"\nERROR: Missing environment variable: {e}", file=sys.stderr)
        print("See README.md for setup instructions.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)

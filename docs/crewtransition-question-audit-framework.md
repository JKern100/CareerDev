# Crew Transition — Assessment Question Audit Framework

*Companion to `docs/crewtransition-strategic-advisor.md`. Read both before changing any assessment question. Commit this to `docs/` and reference it from `CLAUDE.md` as required reading before touching the question bank.*

---

## Why this exists

The assessment was originally built as an **escape / exit** instrument. The strategy is now **worth / curiosity** (see the strategy doc: crew are a *suppressed-need* audience — they quietly consider their options but live in a culture that celebrates the job, so anything that reads as "you want out" carries social cost and suppresses engagement).

Escape questions and worth questions are **structurally different**:

- Escape asks: *what's pushing you out, how ready are you to leave, what will you sacrifice.*
- Worth asks: *what have you built, what are you curious about, what would make a move worth it to you.*

A prior reframe pass reworded the question **stems** but left the **options** and, in some cases, the **premise** in escape framing. This framework is how to finish that properly — without breaking the scoring engine.

---

## The non-negotiable: preserve engine signal

Every question feeds the scoring engine (dimensions / scores / pathway signals). You may change how a question is **presented**: wording, premise framing, order, and whether it appears up-front or is gated behind readiness. You may **not** change what a question **measures**.

If a reframe would change the signal the engine reads, **STOP and flag it.** That is an engine change, not a framing change, and it is a separate decision for the founder. Do not make it inside this audit.

---

## Step 1 — Extract before you judge

Produce the full **annotated question bank** first:

- every question,
- every answer option,
- and for each, **what it feeds into scoring** (which dimension / score / pathway signal).

Do **not** reword anything in this step. This mapping is the basis for every verdict below, and it's the one thing that must not be guessed at — it comes from the code.

---

## Step 2 — Find the failure layer

A question can carry escape framing at three layers. Check all three for each question:

1. **Stem** — the question text assumes leaving.
2. **Options** — the answer choices are push-factors or confessions ("what's wrong with your current job"). *This is the layer the prior pass missed.*
3. **Premise** — the question only makes sense if the person has already decided to leave (e.g. "willingness to start at entry level in a new field"). This is the deepest failure, and it usually **cannot** be reworded away.

---

## Step 3 — Assign one verdict per question

1. **Keep** — already neutral, feeds the engine, reads fine to someone who loves the job.
2. **Reword** — same signal, but the language assumes leaving; rewrite the stem **and every option** into worth/curiosity language.
3. **Re-premise** — the premise assumes exit; flip it to a worth/curiosity version that feeds the **same** signal, or demote it if you can't.
4. **Move to optional deep-dive** — escape-flavored, only relevant once someone has chosen to explore leaving; gate it behind readiness so a curious first-timer is never greeted with exit-talk. The engine still gets the signal *if* the user goes there.
5. **Cut** — pure confession / push-factor, no worth equivalent, and not load-bearing for the engine. Only after confirming from Step 1 that it isn't critical signal.

---

## The litmus test (apply to every question)

> Would a flight attendant who **loves** the job answer this, in private, without feeling the assessment has already decided they want out?

If it makes them feel judged or pre-labeled as a leaver → reword, re-premise, or move.

---

## Two levels — don't conflate them

- **Level A (this framework):** reframe the *existing* questions. Framing-only. Safe. Do it now.
- **Level B:** a true worth assessment may eventually need *different or additional* questions the escape version never asked. That **adds engine inputs** = an engine change. Separate, deliberate, founder decision. **Do not introduce new questions as part of Level A.**

---

## Workflow (with a hard stop built in)

1. Extract the annotated bank (Step 1).
2. For each question, assign the failure layer (Step 2), the verdict (Step 3), and — where it applies — the proposed new wording. Present as a **table**: question · options · what it feeds · failure layer · verdict · proposed rewrite.
3. **STOP. Present to the founder for sign-off. Do not edit any question code yet.**
4. After approval: implement. For each changed question, show before/after and confirm the engine signal is unchanged.

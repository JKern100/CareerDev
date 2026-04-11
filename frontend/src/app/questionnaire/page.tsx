"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCoreNextScreen,
  getCoreScreenById,
  submitAnswers,
  completeQuestionnaire,
  getProgress,
  getMe,
  Question,
  CoreScreen,
  APP_VERSION,
} from "@/lib/api";
import QuestionField from "@/components/QuestionField";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";

type AnswerMap = Record<string, { value: string | number | string[]; confidence: number }>;

interface HubData {
  tier1Complete: boolean;
  tier2Complete: boolean;
  tier3Complete: boolean;
  tier1ScreensDone: number;
  tier2ScreensDone: number;
  tier3ScreensDone: number;
  isPremium: boolean;
}

// Stage config constants
const STAGE_CONFIG = [
  { tier: 1 as const, screens: 4, questions: 21, minutes: 5, label: "Quick Match" },
  { tier: 2 as const, screens: 4, questions: 22, minutes: 5, label: "Sharpen" },
  { tier: 3 as const, screens: 8, questions: 42, minutes: 10, label: "Personalise" },
];

// Screen IDs per tier (must match backend routing.py)
const TIER_SCREEN_IDS: Record<number, string[]> = {
  1: ["t1_1", "t1_2", "t1_3", "t1_4"],
  2: ["t2_1", "t2_2", "t2_3", "t2_4"],
  3: ["t3_1", "t3_2", "t3_3", "t3_4", "t3_5", "t3_6", "t3_7", "t3_8"],
};

export default function QuestionnairePage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: "center", marginTop: "4rem" }}><FlowerSpinner size={48} /><p className="text-muted" style={{ marginTop: "1rem" }}>Loading...</p></div>}>
      <QuestionnaireContent />
    </Suspense>
  );
}

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startParam = searchParams.get("start");

  // Phase: "hub" = overview, "tier1/2/3" = answering questions
  const [phase, setPhase] = useState<"hub" | "tier1" | "tier2" | "tier3">("hub");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const { t, getQuestionTranslation, lang } = useTranslation();
  const ui = lang !== "en" ? { step_of: t("ui.step_of"), quick_match: t("ui.quick_match"), sharpening: t("ui.sharpening") } as Record<string, string> : undefined;
  const qTr = lang !== "en" ? new Proxy({} as Record<string, { prompt?: string; options?: Record<string, string>; help_text?: string }>, { get: (_, qid: string) => getQuestionTranslation(qid) }) : undefined;

  // Hub state
  const [hubData, setHubData] = useState<HubData | null>(null);

  // In-stage state
  const [coreScreen, setCoreScreen] = useState<CoreScreen | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unansweredQuestions, setUnansweredQuestions] = useState<Question[]>([]);

  // Review mode state
  const [reviewing, setReviewing] = useState(false);
  const [reviewScreenIdx, setReviewScreenIdx] = useState(0);

  // ── Load hub data ──
  const loadHub = useCallback(async () => {
    try {
      setLoading(true);
      const [progress, me] = await Promise.all([getProgress(), getMe()]);
      setHubData({
        tier1Complete: progress.tier1_complete,
        tier2Complete: progress.tier2_complete,
        tier3Complete: progress.tier3_complete,
        tier1ScreensDone: progress.tier1_screens_done,
        tier2ScreensDone: progress.tier2_screens_done,
        tier3ScreensDone: progress.tier3_screens_done,
        isPremium: me.is_premium || me.role === "admin",
      });
    } catch {
      setError("Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load a specific screen by ID (for review mode) ──
  const loadReviewScreen = useCallback(async (screenId: string) => {
    try {
      setLoading(true);
      setError("");
      const screen = await getCoreScreenById(screenId);
      setCoreScreen(screen);

      // Initialize answers from existing answers
      const initial: AnswerMap = {};
      const existingMap = new Map<string, { value: string | number | string[]; confidence: number }>();
      if (screen.existing_answers) {
        for (const ea of screen.existing_answers) {
          if (ea.value != null) {
            existingMap.set(ea.question_id, {
              value: ea.value as string | number | string[],
              confidence: ea.confidence,
            });
          }
        }
        const q003 = screen.existing_answers.find((ea) => ea.question_id === "Q003");
        if (q003?.value && typeof q003.value === "string") {
          setCurrencyCode(q003.value);
        }
      }
      for (const q of screen.questions) {
        const existing = existingMap.get(q.question_id);
        if (existing) {
          initial[q.question_id] = existing;
        } else {
          let defaultValue: string | number | string[] = "";
          if (q.question_type === "slider_0_10") {
            defaultValue = Math.round(((q.min_val ?? 0) + (q.max_val ?? 10)) / 2);
          } else if (q.question_type === "likert_1_5") {
            defaultValue = 3;
          } else if (q.question_type === "numeric") {
            defaultValue = "";
          }
          initial[q.question_id] = { value: defaultValue, confidence: 100 };
        }
      }
      setAnswers(initial);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load screen");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load next question screen ──
  const loadCoreScreen = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const screen = await getCoreNextScreen();

      const currentPhase = phaseRef.current;

      // Tier completion → return to hub
      if (
        (screen.tier1_complete && currentPhase === "tier1") ||
        (screen.tier2_complete && currentPhase === "tier2") ||
        (screen.tier3_complete && currentPhase === "tier3") ||
        (screen.tier1_complete && screen.tier2_complete && screen.tier3_complete)
      ) {
        // If all done and user was in tier3, mark questionnaire complete
        if (screen.tier3_complete && currentPhase === "tier3") {
          try { await completeQuestionnaire(); } catch { /* ignore */ }
        }
        setPhase("hub");
        await loadHub();
        return;
      }

      // Edge: tier2 done but not in tier3 — back to hub
      if (screen.tier1_complete && screen.tier2_complete && !screen.tier3_complete && screen.questions.length === 0 && currentPhase !== "tier3") {
        setPhase("hub");
        await loadHub();
        return;
      }

      // Subscription gate — free user tried Tier 2/3
      if (screen.screen_id === "upgrade_required") {
        setPhase("hub");
        await loadHub();
        return;
      }

      setCoreScreen(screen);

      // Initialize answers
      const existingMap = new Map<string, { value: string | number | string[]; confidence: number }>();
      if (screen.existing_answers) {
        for (const ea of screen.existing_answers) {
          if (ea.value != null) {
            existingMap.set(ea.question_id, {
              value: ea.value as string | number | string[],
              confidence: ea.confidence,
            });
          }
        }
        const q003 = screen.existing_answers.find((ea) => ea.question_id === "Q003");
        if (q003?.value && typeof q003.value === "string") {
          setCurrencyCode(q003.value);
        }
      }

      const initial: AnswerMap = {};
      for (const q of screen.questions) {
        const existing = existingMap.get(q.question_id);
        if (existing) {
          initial[q.question_id] = existing;
        } else {
          let defaultValue: string | number | string[] = "";
          if (q.question_type === "slider_0_10") {
            defaultValue = Math.round(((q.min_val ?? 0) + (q.max_val ?? 10)) / 2);
          } else if (q.question_type === "likert_1_5") {
            defaultValue = 3;
          } else if (q.question_type === "numeric") {
            defaultValue = "";
          }
          initial[q.question_id] = { value: defaultValue, confidence: 100 };
        }
      }
      setAnswers(initial);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [loadHub]);

  // ── Initial load ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Clean up first-login flag (no longer need welcome modal)
    localStorage.removeItem("is_first_login");

    if (startParam === "tier2" || startParam === "tier3") {
      setPhase(startParam === "tier2" ? "tier2" : "tier3");
    } else {
      loadHub();
    }
  }, [router, loadHub, startParam]);

  // ── When entering a tier, load the next screen (or first review screen) ──
  useEffect(() => {
    if (phase === "tier1" || phase === "tier2" || phase === "tier3") {
      if (reviewing) {
        const tierNum = phase === "tier1" ? 1 : phase === "tier2" ? 2 : 3;
        const screenIds = TIER_SCREEN_IDS[tierNum];
        setReviewScreenIdx(0);
        loadReviewScreen(screenIds[0]);
      } else {
        loadCoreScreen();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Submit answers handler ──
  async function handleCoreSubmit() {
    if (!coreScreen) return;
    setSubmitting(true);
    setError("");
    setUnansweredQuestions([]);

    const unanswered = coreScreen.questions.filter((q) => {
      if (!q.required) return false;
      const ans = answers[q.question_id];
      if (!ans) return true;
      if (ans.value === "not_sure") return false;
      return ans.value === "" || (Array.isArray(ans.value) && ans.value.length === 0);
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      setError(`${unanswered.length} required question${unanswered.length > 1 ? "s" : ""} still need${unanswered.length === 1 ? "s" : ""} an answer.`);
      setSubmitting(false);
      return;
    }

    try {
      const payload = Object.entries(answers)
        .filter(([, a]) => a.value !== "" && !(Array.isArray(a.value) && a.value.length === 0))
        .map(([qid, a]) => ({
          question_id: qid,
          value: a.value,
          confidence: a.value === "not_sure" ? 50 : a.confidence,
        }));

      await submitAnswers(payload);
      await loadCoreScreen();
      window.scrollTo(0, 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save answers");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <FlowerSpinner size={48} />
        <p className="text-muted" style={{ marginTop: "1rem" }}>{t("ui.loading")}</p>
      </div>
    );
  }

  // ── Render: Error with nothing loaded ──
  if (!loading && error && !coreScreen && !hubData) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => loadHub()}>
            {t("ui.try_again")}
          </button>
          <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>
            {t("ui.back_to_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Stage Hub ──
  if (phase === "hub" && hubData) {
    const stageData = [
      {
        complete: hubData.tier1Complete,
        screensDone: hubData.tier1ScreensDone,
        locked: false,
        lockReason: null as string | null,
      },
      {
        complete: hubData.tier2Complete,
        screensDone: hubData.tier2ScreensDone,
        locked: !hubData.tier1Complete || (!hubData.isPremium && !hubData.tier2Complete),
        lockReason: !hubData.tier1Complete ? "Complete Stage 1 first" : !hubData.isPremium ? null : null,
      },
      {
        complete: hubData.tier3Complete,
        screensDone: hubData.tier3ScreensDone,
        locked: !hubData.tier2Complete || (!hubData.isPremium && !hubData.tier3Complete),
        lockReason: !hubData.tier2Complete ? "Complete Stage 2 first" : !hubData.isPremium ? null : null,
      },
    ];

    return (
      <div style={{ flex: 1 }}>
        <AppHeader />
        <div className="container" style={{ maxWidth: "640px", marginTop: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              {t("ui.hub_title")}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
              {t("ui.hub_subtitle")}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {STAGE_CONFIG.map((stage, i) => {
              const sd = stageData[i];
              const needsUpgrade = !hubData.isPremium && !sd.complete && i > 0 && (i === 1 ? hubData.tier1Complete : hubData.tier2Complete);

              return (
                <div
                  key={stage.tier}
                  style={{
                    border: `1px solid ${sd.complete ? "rgba(34,197,94,0.3)" : sd.locked ? "var(--border)" : "rgba(59,130,246,0.3)"}`,
                    borderRadius: "14px",
                    padding: "1.5rem",
                    background: sd.complete ? "rgba(34,197,94,0.04)" : sd.locked ? "rgba(100,116,139,0.04)" : "rgba(59,130,246,0.04)",
                    opacity: sd.locked && !needsUpgrade ? 0.7 : 1,
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                        Stage {stage.tier}: {stage.label}
                      </h2>
                      {stage.tier === 3 && (
                        <span style={{
                          fontSize: "0.65rem", padding: "2px 6px", borderRadius: "999px",
                          background: "rgba(139,92,246,0.1)", color: "#7c3aed", fontWeight: 600,
                        }}>
                          OPTIONAL
                        </span>
                      )}
                    </div>
                    {sd.complete && (
                      <span style={{
                        fontSize: "0.75rem", padding: "3px 10px", borderRadius: "999px",
                        background: "rgba(34,197,94,0.15)", color: "#16a34a", fontWeight: 600,
                      }}>
                        ✓ Complete
                      </span>
                    )}
                    {!sd.complete && stage.tier > 1 && !sd.locked && (
                      <span style={{
                        fontSize: "0.65rem", padding: "2px 6px", borderRadius: "999px",
                        background: "rgba(59,130,246,0.1)", color: "#2563eb", fontWeight: 600,
                      }}>
                        PRO
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                    {stage.questions} questions · ~{stage.minutes} min
                  </p>

                  {/* Description */}
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1rem" }}>
                    {stage.tier === 1 && "Get your initial career pathway rankings based on skills, experience, and goals."}
                    {stage.tier === 2 && "Fully score all skills, preferences, and constraints for accurate rankings."}
                    {stage.tier === 3 && "Add background, evidence, and context for a richer AI-written career report. Your rankings won\u2019t change \u2014 this enriches the narrative."}
                  </p>

                  {/* Progress bar (if in progress) */}
                  {!sd.complete && sd.screensDone > 0 && !sd.locked && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{
                        height: "4px", background: "var(--border)", borderRadius: "2px",
                        overflow: "hidden", marginBottom: "0.25rem",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: "2px",
                          width: `${(sd.screensDone / stage.screens) * 100}%`,
                          background: "var(--primary)",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {sd.screensDone} of {stage.screens} screens done
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  {sd.complete ? (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}
                      onClick={() => {
                        setReviewing(true);
                        setPhase(`tier${stage.tier}` as "tier1" | "tier2" | "tier3");
                      }}
                    >
                      Review Answers
                    </button>
                  ) : needsUpgrade ? (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}
                      onClick={() => router.push("/pricing")}
                    >
                      Upgrade to Pro
                    </button>
                  ) : sd.locked ? (
                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                      {sd.lockReason || `Complete Stage ${stage.tier - 1} first`}
                    </p>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}
                      onClick={() => setPhase(`tier${stage.tier}` as "tier1" | "tier2" | "tier3")}
                    >
                      {sd.screensDone > 0 ? `Continue Stage ${stage.tier} (${sd.screensDone}/${stage.screens})` : `Start Stage ${stage.tier}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* View Results — single CTA when at least Stage 1 done */}
          {hubData.tier1Complete && (
            <div style={{ marginTop: "1.5rem" }}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
                onClick={() => router.push("/summary")}
              >
                View Results
              </button>
            </div>
          )}

          {/* Back to dashboard */}
          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "none", border: "none", color: "var(--muted)",
                cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline",
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: In-stage question flow ──
  if ((phase === "tier1" || phase === "tier2" || phase === "tier3") && coreScreen) {
    const tierIdx = phase === "tier1" ? 0 : phase === "tier2" ? 1 : 2;
    const stageConf = STAGE_CONFIG[tierIdx];
    const tierScreenNum = phase === "tier1" ? coreScreen.screen_number
      : phase === "tier2" ? coreScreen.screen_number - 4
      : coreScreen.screen_number - 8;
    const isLastScreen = tierScreenNum === stageConf.screens;
    const minsPerScreen = phase === "tier3" ? 1.5 : 1.25;
    const minsLeft = Math.ceil((stageConf.screens - tierScreenNum + 1) * minsPerScreen);

    return (
      <div style={{ flex: 1 }}>
        <AppHeader />
        <div className="container">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.25rem" }}>
            <p className="text-sm text-muted">{APP_VERSION}</p>
          </div>

          {/* Stage pills */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", fontSize: "0.7rem", flexWrap: "wrap" }}>
            {STAGE_CONFIG.map((sc, i) => {
              const isActive = i === tierIdx;
              const isDone = i < tierIdx || (i === tierIdx && false); // current stage not yet done
              const isPast = i < tierIdx;
              return (
                <span
                  key={sc.tier}
                  style={{
                    padding: "3px 10px", borderRadius: "999px", fontWeight: 600,
                    background: isActive ? "#3b82f6" : isPast ? "#22c55e" : "#334155",
                    color: isActive || isPast ? "white" : "#64748b",
                  }}
                >
                  {isPast ? `Stage ${sc.tier} ✓` : isActive ? `Stage ${sc.tier}: ${reviewing ? reviewScreenIdx + 1 : tierScreenNum}/${sc.screens}` : `Stage ${sc.tier}`}
                </span>
              );
            })}
          </div>

          {/* Progress header */}
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm text-muted">
              {reviewing ? "Reviewing: " : ""}Stage {stageConf.tier}: {stageConf.label} — Screen {reviewing ? reviewScreenIdx + 1 : tierScreenNum} of {stageConf.screens}
            </p>
            {!reviewing && <p className="text-sm text-muted">~{minsLeft} min left</p>}
          </div>

          {/* Progress bar (per-stage) */}
          <div className="progress-bar mb-2">
            <div
              className="progress-bar-fill"
              style={{ width: `${(((reviewing ? reviewScreenIdx + 1 : tierScreenNum) - 1) / stageConf.screens) * 100}%` }}
            />
          </div>

          <h1 className="mb-1">{coreScreen.screen_label}</h1>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
            {coreScreen.questions.length} question{coreScreen.questions.length !== 1 ? "s" : ""} on this page
          </p>

          {/* Questions */}
          <div className="flex flex-col gap-1">
            {coreScreen.questions
              .filter((q) => {
                // Q121 is conditional: show only when Q109 = instability OR Q120 has real selections
                if (q.question_id === "Q121") {
                  const q109Val = answers["Q109"]?.value;
                  const q120Val = answers["Q120"]?.value;
                  const hasInstability = q109Val === "Industry instability / geopolitical risk";
                  const hasRealIndustries = Array.isArray(q120Val) && q120Val.length > 0
                    && !q120Val.every((v: string) => v === "No specific industries to avoid");
                  return hasInstability || hasRealIndustries;
                }
                return true;
              })
              .map((q) => (
              <QuestionField
                key={q.question_id}
                question={q}
                value={answers[q.question_id]?.value ?? ""}
                isNotSure={answers[q.question_id]?.value === "not_sure"}
                translation={qTr?.[q.question_id]}
                uiStrings={ui}
                currencyCode={q.question_type === "numeric" && /currency|salary|compensation|rent|debt|budget|cash/i.test(q.prompt) ? (
                  (answers["Q003"]?.value as string) || currencyCode || undefined
                ) : undefined}
                unitLabel={q.question_type === "numeric" && !/currency|salary|compensation|rent|debt|budget|cash/i.test(q.prompt) ? (
                  /year/i.test(q.prompt) ? "years"
                  : /days?\b/i.test(q.prompt) ? "days"
                  : /month/i.test(q.prompt) ? "months"
                  : /hour/i.test(q.prompt) ? "hours"
                  : undefined
                ) : undefined}
                onChange={(val) => {
                  setAnswers((prev) => ({
                    ...prev,
                    [q.question_id]: { value: val, confidence: 100 },
                  }));
                  if (q.question_id === "Q003" && typeof val === "string") {
                    setCurrencyCode(val);
                  }
                }}
                onNotSure={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.question_id]: { value: "not_sure", confidence: 50 },
                  }))
                }
              />
            ))}
          </div>

          {error && (
            <div style={{
              color: "#92400e", background: "#fef3c7", border: "1px solid #f59e0b",
              padding: "0.75rem 1rem", borderRadius: "8px", marginTop: "1rem",
              fontSize: "0.875rem", lineHeight: 1.5,
            }}>
              {error}
              {unansweredQuestions.length > 0 && (
                <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.25rem" }}>
                  {unansweredQuestions.map((q) => (
                    <li key={q.question_id}>
                      <a
                        href={`#q-${q.question_id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`q-${q.question_id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        style={{ color: "#92400e", textDecoration: "underline", cursor: "pointer" }}
                      >
                        {q.prompt}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Navigation */}
          {reviewing ? (
            <>
              <div className="mt-3" style={{ display: "flex", gap: "0.5rem" }}>
                {reviewScreenIdx > 0 && (
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const tierNum = phase === "tier1" ? 1 : phase === "tier2" ? 2 : 3;
                      const newIdx = reviewScreenIdx - 1;
                      setReviewScreenIdx(newIdx);
                      loadReviewScreen(TIER_SCREEN_IDS[tierNum][newIdx]);
                      window.scrollTo(0, 0);
                    }}
                  >
                    Previous
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={submitting}
                  onClick={async () => {
                    // Save any edits first
                    setSubmitting(true);
                    try {
                      const payload = Object.entries(answers)
                        .filter(([, a]) => a.value !== "" && !(Array.isArray(a.value) && a.value.length === 0))
                        .map(([qid, a]) => ({
                          question_id: qid,
                          value: a.value,
                          confidence: a.value === "not_sure" ? 50 : a.confidence,
                        }));
                      if (payload.length > 0) {
                        await submitAnswers(payload);
                      }
                    } catch {
                      // Ignore save errors in review mode
                    } finally {
                      setSubmitting(false);
                    }

                    const tierNum = phase === "tier1" ? 1 : phase === "tier2" ? 2 : 3;
                    const screenIds = TIER_SCREEN_IDS[tierNum];
                    if (reviewScreenIdx < screenIds.length - 1) {
                      const newIdx = reviewScreenIdx + 1;
                      setReviewScreenIdx(newIdx);
                      loadReviewScreen(screenIds[newIdx]);
                      window.scrollTo(0, 0);
                    } else {
                      // Last screen — return to hub
                      setReviewing(false);
                      setPhase("hub");
                      loadHub();
                    }
                  }}
                >
                  {submitting ? "Saving..." : reviewScreenIdx < (TIER_SCREEN_IDS[phase === "tier1" ? 1 : phase === "tier2" ? 2 : 3].length - 1) ? "Save & Next" : "Save & Done"}
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                <button
                  onClick={() => { setReviewing(false); setPhase("hub"); loadHub(); }}
                  style={{
                    background: "none", border: "none", color: "var(--muted)",
                    cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline",
                  }}
                >
                  ← Back to overview
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3" style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCoreSubmit}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? "Saving..." : isLastScreen ? "Done" : "Next"}
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                <button
                  onClick={() => { setPhase("hub"); loadHub(); }}
                  style={{
                    background: "none", border: "none", color: "var(--muted)",
                    cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline",
                  }}
                >
                  ← Back to overview
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

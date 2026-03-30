"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCoreNextScreen,
  submitAnswers,
  completeQuestionnaire,
  getProgress,
  Question,
  CoreScreen,
  APP_VERSION,
} from "@/lib/api";
import QuestionField from "@/components/QuestionField";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";

type AnswerMap = Record<string, { value: string | number | string[]; confidence: number }>;


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
  const startParam = searchParams.get("start"); // ?start=tier2

  // Phase: "tier1" → "tier1_done" → "tier2" → "tier2_done" → "tier3" → "complete"
  // "upgrade_required" shown when free user tries to access Tier 2/3
  const [phase, setPhase] = useState<"tier1" | "tier1_done" | "tier2" | "tier2_done" | "tier3" | "complete" | "upgrade_required">(
    startParam === "tier2" ? "tier2" : "tier1"
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase; // always current — avoids stale closures

  // Language — uses the global useTranslation hook
  const { t, getQuestionTranslation, lang } = useTranslation();
  // Backward-compat aliases for the template
  const ui = lang !== "en" ? { step_of: t("ui.step_of"), quick_match: t("ui.quick_match"), sharpening: t("ui.sharpening"), tier1_done_title: t("ui.tier1_done_title"), tier1_done_body: t("ui.tier1_done_body"), tier1_done_see: t("ui.tier1_done_see"), tier1_done_sharpen: t("ui.tier1_done_sharpen") } as Record<string, string> : undefined;
  const qTr = lang !== "en" ? new Proxy({} as Record<string, { prompt?: string; options?: Record<string, string>; help_text?: string }>, { get: (_, qid: string) => getQuestionTranslation(qid) }) : undefined;


  // Core phase state
  const [coreScreen, setCoreScreen] = useState<CoreScreen | null>(null);

  // Shared state
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unansweredQuestions, setUnansweredQuestions] = useState<Question[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);

  // ── Progressive phase: load next screen (Tier 1 or Tier 2) ──
  const loadCoreScreen = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const screen = await getCoreNextScreen();

      // Check tier milestones (use ref to avoid stale closure)
      const currentPhase = phaseRef.current;
      if (screen.tier1_complete && currentPhase === "tier1") {
        setPhase("tier1_done");
        setLoading(false);
        return;
      }
      if (screen.tier2_complete && currentPhase === "tier2") {
        setPhase("tier2_done");
        setLoading(false);
        return;
      }
      // Tier 3 complete or all progressive screens done
      if (screen.tier3_complete && currentPhase === "tier3") {
        setPhase("complete");
        setLoading(false);
        return;
      }
      if (screen.tier1_complete && screen.tier2_complete && screen.tier3_complete && screen.questions.length === 0) {
        setPhase("complete");
        setLoading(false);
        return;
      }
      // Tier 2 done but not yet in tier3 — show tier2_done milestone
      if (screen.tier1_complete && screen.tier2_complete && !screen.tier3_complete && screen.questions.length === 0 && currentPhase !== "tier3") {
        setPhase("tier2_done");
        setLoading(false);
        return;
      }

      // Subscription gate — backend returns this when free user hits Tier 2/3
      if (screen.screen_id === "upgrade_required") {
        setPhase("upgrade_required" as typeof phase);
        setLoading(false);
        return;
      }

      setCoreScreen(screen);

      // Initialize answers from existing + defaults
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
            defaultValue = q.min_val ?? 0;
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
  }, []);

  // ── Initial load ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (localStorage.getItem("is_first_login") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("is_first_login");
    }

    // If no explicit start param, auto-detect the right phase from progress
    if (!startParam) {
      getProgress().then((progress) => {
        if (progress.tier3_complete) {
          // All tiers done
          setPhase("complete");
          setLoading(false);
        } else if (progress.tier2_complete) {
          // All scoring done — show tier2_done milestone
          setPhase("tier2_done");
          setLoading(false);
        } else if (progress.tier1_complete) {
          // Tier 1 done — show tier1_done milestone
          setPhase("tier1_done");
          setLoading(false);
        } else {
          // Still in tier1
          loadCoreScreen();
        }
      }).catch(() => {
        loadCoreScreen();
      });
    } else if (phaseRef.current === "tier2") {
      // ?start=tier2 — tier2 useEffect handles loading
    } else {
      loadCoreScreen();
    }
  }, [router, loadCoreScreen, startParam]);

  // ── When switching to tier2 or tier3, load next progressive screen ──
  useEffect(() => {
    if (phase === "tier2" || phase === "tier3") {
      loadCoreScreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Core submit handler ──
  async function handleCoreSubmit() {
    if (!coreScreen) return;
    setSubmitting(true);
    setError("");
    setUnansweredQuestions([]);

    // Check required fields
    const unanswered = coreScreen.questions.filter((q) => {
      if (!q.required) return false;
      const ans = answers[q.question_id];
      if (!ans) return true;
      if (ans.value === "not_sure") return false; // "Not sure" counts as answered
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
      await loadCoreScreen(); // Load next core screen or mark complete
      window.scrollTo(0, 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save answers");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    try {
      await completeQuestionnaire();
      router.push("/summary");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete");
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

  // ── Render: Error with no questions loaded ──
  if (!loading && error && !coreScreen) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => loadCoreScreen()}>
            {t("ui.try_again")}
          </button>
          <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>
            {t("ui.back_to_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Tier 1 done milestone ──
  if (phase === "tier1_done") {
    return (
      <>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "4rem", maxWidth: "560px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "#dbeafe",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.75rem", marginBottom: "1.5rem",
          }}>
            &#127775;
          </div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            {ui?.tier1_done_title || "Your initial results are ready!"}
          </h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: "1rem" }}>
            {ui?.tier1_done_body || "Based on your quick assessment, we've matched you to career pathways. You can see your results now, or sharpen them with ~20 more questions (~5 min)."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/summary")}
              style={{ padding: "0.75rem 2rem" }}
            >
              {ui?.tier1_done_see || "See My Results"}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setPhase("tier2")}
              style={{ padding: "0.75rem 2rem" }}
            >
              {ui?.tier1_done_sharpen || "Sharpen My Results (~5 min)"}
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "1.5rem" }}>
            The &quot;Sharpen&quot; questions cover all scoring-relevant skills, preferences, and constraints.
            Your career rankings will be fully accurate after this step.
          </p>
        </div>
      </>
    );
  }

  // ── Render: Upgrade required (free user hit Tier 2/3 paywall) ──
  if (phase === "upgrade_required") {
    return (
      <>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "4rem", maxWidth: "560px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "#dbeafe",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.75rem", marginBottom: "1.5rem",
          }}>
            &#127775;
          </div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            {t("ui.upgrade_title")}
          </h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            {t("ui.upgrade_body")}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/summary")}
              style={{ padding: "0.75rem 2rem" }}
            >
              {t("ui.upgrade_see_free")}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => router.push("/pricing")}
              style={{
                padding: "0.75rem 2rem",
                borderColor: "#3b82f6",
                color: "#3b82f6",
                fontWeight: 600,
              }}
            >
              {t("ui.upgrade_cta")}
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "1.5rem" }}>
            {t("ui.upgrade_note")}
          </p>
        </div>
      </>
    );
  }

  // ── Render: Tier 2 done milestone ──
  if (phase === "tier2_done") {
    return (
      <>
        <AppHeader />
        <div className="container" style={{ marginTop: "2.5rem", maxWidth: "620px" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "#d1fae5",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.75rem", marginBottom: "1.5rem",
            }}>
              &#9989;
            </div>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Your career rankings are locked in
            </h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem" }}>
              You&apos;ve answered all the questions that determine your pathway scores.
              You can see your results now &mdash; or unlock a significantly richer, more personalised report.
            </p>
          </div>

          {/* Primary CTA */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/summary")}
              style={{ padding: "0.75rem 2.5rem", fontSize: "1rem" }}
            >
              See My Results Now
            </button>
          </div>

          {/* Stage 3 pitch */}
          <div style={{
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(139, 92, 246, 0.06))",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            borderRadius: "14px",
            padding: "1.75rem 1.5rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{
                fontSize: "0.7rem", background: "var(--primary)", color: "white",
                padding: "0.2rem 0.65rem", borderRadius: "20px", fontWeight: 600,
                letterSpacing: "0.03em",
              }}>
                RECOMMENDED
              </span>
            </div>

            <h2 style={{ fontSize: "1.15rem", marginBottom: "0.75rem", fontWeight: 600 }}>
              Want a report that actually sounds like you?
            </h2>

            <p style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Your current report uses your scores to rank careers. But the <strong style={{ color: "var(--fg)" }}>personalised deep-dive</strong> transforms it into
              a career transition plan written specifically for your situation &mdash; your aviation background, your real constraints, your ambitions, and the
              trade-offs you&apos;re actually willing to make.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}>
              {[
                { icon: "&#9992;&#65039;", label: "Your aviation story", desc: "How your specific crew experience translates to each career" },
                { icon: "&#128170;", label: "Evidence-backed skills", desc: "Real examples from your career that prove your strengths" },
                { icon: "&#127919;", label: "Your dream role", desc: "We'll address what you really want — even if it's ambitious" },
                { icon: "&#9878;&#65039;", label: "Realistic constraints", desc: "Visa, finances, family — your plan will actually work" },
              ].map((item) => (
                <div key={item.label} style={{
                  background: "white",
                  borderRadius: "10px",
                  padding: "0.875rem",
                  border: "1px solid var(--border)",
                }}>
                  <div dangerouslySetInnerHTML={{ __html: item.icon }} style={{ fontSize: "1.25rem", marginBottom: "0.375rem" }} />
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>{item.label}</p>
                  <p style={{ color: "var(--muted)", fontSize: "0.775rem", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div style={{
              background: "white",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
              border: "1px solid var(--border)",
              marginBottom: "1.25rem",
            }}>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem", color: "var(--fg)" }}>
                What to expect
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.825rem", color: "#475569", lineHeight: 1.6 }}>
                <p>&#128340; <strong>~10-12 minutes</strong> across 8 focused sections &mdash; 40 curated questions</p>
                <p>&#128190; <strong>Save and continue any time</strong> &mdash; close the browser, come back tomorrow, pick up exactly where you left off</p>
                <p>&#128221; <strong>Mix of quick picks and short answers</strong> &mdash; mostly tapping options, a few short written responses</p>
                <p>&#127775; <strong>Each section unlocks more detail</strong> &mdash; your report gets richer with every screen you complete</p>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                className="btn btn-outline"
                onClick={() => setPhase("tier3")}
                style={{
                  padding: "0.75rem 2.5rem",
                  fontSize: "0.95rem",
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                  fontWeight: 600,
                }}
              >
                Start the Deep-Dive
              </button>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.75rem" }}>
                You can stop after any module and still see improved results.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Render: Complete ──
  if (phase === "complete") {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem", maxWidth: "560px" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: "#d1fae5",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.75rem", marginBottom: "1.5rem",
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{t("ui.questionnaire_complete_title")}</h1>
        <p className="text-muted mb-3" style={{ lineHeight: 1.7 }}>
          {t("ui.questionnaire_complete_body")}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleComplete} style={{ padding: "0.75rem 2rem" }}>
            {t("ui.view_profile_summary")}
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: "0.75rem 1.5rem", borderColor: "rgba(234, 179, 8, 0.4)", color: "#eab308" }}
            onClick={() => router.push("/coach")}
          >
            {t("ui.talk_to_coach")}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Progressive phase (Tier 1, Tier 2, or Tier 3) ──
  if ((phase === "tier1" || phase === "tier2" || phase === "tier3") && coreScreen) {
    return (
      <>
      {showWelcome && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}>
          <div style={{
            background: "white", borderRadius: "16px", maxWidth: "520px",
            width: "100%", padding: "2.5rem 2rem", textAlign: "center",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "#dbeafe", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", marginBottom: "1.25rem",
            }}>
              &#127919;
            </div>
            <h1 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>
              Welcome to your career assessment
            </h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.925rem" }}>
              We&apos;ll start with <strong style={{ color: "var(--fg)" }}>18 quick questions (~5 min)</strong> to show you which careers fit. Then you decide how deep to go.
            </p>
            <div style={{
              background: "#f8fafc", borderRadius: "10px",
              padding: "1rem 1.25rem", margin: "1.25rem 0",
              textAlign: "left", lineHeight: 1.75, fontSize: "0.875rem",
              color: "#475569",
            }}>
              <p>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>Step 1: Quick Match (5 min).</span>{" "}
                18 questions to get your initial career pathway rankings.
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>Step 2: Sharpen (5 min, optional).</span>{" "}
                20 more questions that fully score all skills, preferences, and constraints.
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>Step 3: Personalise (~10 min, optional).</span>{" "}
                40 focused questions that add background context for a richer AI-written career report.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowWelcome(false)}
              style={{ padding: "0.75rem 2rem", fontSize: "0.95rem", marginTop: "0.25rem" }}
            >
              Let&apos;s go
            </button>
          </div>
        </div>
      )}
      <AppHeader />
      <div className="container">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.25rem" }}>
          <p className="text-sm text-muted">{APP_VERSION}</p>
        </div>

        {/* Core progress header */}
        <div className="flex justify-between items-center mb-1">
          <div>
            <p className="text-sm text-muted">
              {t("ui.step_of", { n: String(coreScreen.screen_number), total: String(coreScreen.total_screens) })}: {phase === "tier1" ? t("ui.quick_match") : phase === "tier2" ? t("ui.sharpening") : t("ui.personalising")}
            </p>
          </div>
          <p className="text-sm text-muted">
            ~{5 - coreScreen.screen_number + 1} min left
          </p>
        </div>

        {/* Progress bar */}
        <div className="progress-bar mb-2">
          <div
            className="progress-bar-fill"
            style={{ width: `${((coreScreen.screen_number - 1) / coreScreen.total_screens) * 100}%` }}
          />
        </div>

        <h1 className="mb-2">{coreScreen.screen_label}</h1>

        {/* Questions */}
        <div className="flex flex-col gap-1">
          {coreScreen.questions.map((q) => (
            <QuestionField
              key={q.question_id}
              question={q}
              value={answers[q.question_id]?.value ?? ""}
              isNotSure={answers[q.question_id]?.value === "not_sure"}
              translation={qTr?.[q.question_id]}
              uiStrings={ui}
              onChange={(val) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.question_id]: { value: val, confidence: 100 },
                }))
              }
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
            color: "#92400e",
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginTop: "1rem",
            fontSize: "0.875rem",
            lineHeight: 1.5,
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
        <div className="mt-3" style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleCoreSubmit}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            {submitting ? "Saving..." : (coreScreen.tier === 1 && coreScreen.screen_number === 4) ? "See My Results" : (coreScreen.tier === 2 && coreScreen.screen_number === 8) ? "See My Full Results" : (coreScreen.tier === 3 && coreScreen.screen_number === coreScreen.total_screens) ? "View My Profile Summary" : "Next"}
          </button>
        </div>
      </div>
      </>
    );
  }

  return null;
}

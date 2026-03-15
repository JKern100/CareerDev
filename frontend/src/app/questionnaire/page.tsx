"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getNextQuestions,
  getModuleQuestions,
  submitAnswers,
  completeQuestionnaire,
  getProgress,
  QuestionSet,
  ModuleStatus,
  APP_VERSION,
} from "@/lib/api";
import QuestionField from "@/components/QuestionField";
import AppHeader from "@/components/AppHeader";

type AnswerMap = Record<string, { value: string | number | string[]; confidence: number }>;

const MODULE_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H"];

// Encouraging messages shown after completing each module
const MODULE_MILESTONES: Record<string, { heading: string; message: string; nextTeaser: string }> = {
  A: {
    heading: "Baseline locked in",
    message: "We know where you are and what you're looking for. That's the foundation everything else builds on.",
    nextTeaser: "Next: your aviation experience — what energises you, what drains you, and why you're considering a change.",
  },
  B: {
    heading: "Your aviation story is captured",
    message: "We now understand your experience, what you enjoy, what's wearing you down, and why you're exploring a change.",
    nextTeaser: "Next: let's map out the skills you've built — many transfer directly into new careers.",
  },
  C: {
    heading: "Skills profile built",
    message: "Your transferable skills are clearer than you think. The evidence you shared will help us match you to roles that value exactly what you bring.",
    nextTeaser: "Next: what kind of work environment and lifestyle actually suits you?",
  },
  D: {
    heading: "Work style mapped",
    message: "We now know what kind of environment you thrive in — and what to steer you away from.",
    nextTeaser: "Next: the practical stuff — finances, visa, constraints. This is what makes your plan realistic.",
  },
  E: {
    heading: "Constraints understood",
    message: "Knowing your real boundaries means we can build a plan that actually works — not just one that sounds good on paper.",
    nextTeaser: "Next: where in the world do you want to be?",
  },
  F: {
    heading: "Location preferences set",
    message: "Geography shapes opportunity. We'll factor your location preferences into every recommendation.",
    nextTeaser: "Next: let's talk money — what you need, what you want, and what's realistic.",
  },
  G: {
    heading: "Financial picture clear",
    message: "Salary expectations, obligations, and trade-offs — we have what we need to model realistic compensation scenarios.",
    nextTeaser: "Almost done! Last module: your learning preferences and career family interests.",
  },
  H: {
    heading: "All modules complete!",
    message: "You've given us everything we need to build your personalised career transition plan. This is a serious step — well done.",
    nextTeaser: "",
  },
};

// Average seconds per question type (rough estimates for time calculation)
const SECONDS_PER_QUESTION: Record<string, number> = {
  single_select: 8,
  multi_select: 12,
  likert_1_5: 6,
  slider_0_10: 6,
  numeric: 8,
  text_short: 20,
  text_long: 60,
  file_upload: 15,
};

function estimateMinutesRemaining(modules: ModuleStatus[]): number {
  // Count unanswered questions across all incomplete modules
  let totalSeconds = 0;
  for (const m of modules) {
    const remaining = m.total_questions - m.answered_questions;
    if (remaining > 0) {
      // Use an average of 12 seconds per question as a rough estimate
      totalSeconds += remaining * 12;
    }
  }
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [milestone, setMilestone] = useState<{ module: string; heading: string; message: string; nextTeaser: string } | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [prevProgress, setPrevProgress] = useState<number>(0);

  const loadProgress = useCallback(async () => {
    try {
      const progress = await getProgress();
      setModules(progress.modules);
      setPrevProgress(progress.progress_pct);
    } catch {
      // Non-critical; progress tabs will just not update
    }
  }, []);

  const loadQuestions = useCallback(async (module?: string) => {
    try {
      setLoading(true);
      setError("");
      let qs: QuestionSet;
      if (module) {
        qs = await getModuleQuestions(module);
      } else {
        qs = await getNextQuestions();
      }
      setQuestionSet(qs);
      // Build map of existing answers from the backend
      const existingMap = new Map<string, { value: string | number | string[]; confidence: number }>();
      if (qs.existing_answers) {
        for (const ea of qs.existing_answers) {
          if (ea.value != null) {
            existingMap.set(ea.question_id, {
              value: ea.value as string | number | string[],
              confidence: ea.confidence,
            });
          }
        }
      }

      // Initialize answers: use existing answers if available, else sensible defaults
      const initial: AnswerMap = {};
      for (const q of qs.questions) {
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
          initial[q.question_id] = { value: defaultValue, confidence: 50 };
        }
      }
      setAnswers(initial);
      await loadProgress();
    } catch (err: unknown) {
      if (!module) {
        // If /next failed (questionnaire complete or any error), fall back to module A for review
        try {
          await loadQuestions("A");
          return;
        } catch {
          // If even module A fails, show the error
        }
      }
      const msg = err instanceof Error ? err.message : "Failed to load questions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadProgress]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Show welcome popup on first login
    if (localStorage.getItem("is_first_login") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("is_first_login");
    }
    loadQuestions();
  }, [router, loadQuestions]);

  async function handleSaveProgress() {
    if (!questionSet) return;
    setSubmitting(true);
    setError("");
    setSaveMessage("");

    try {
      const payload = Object.entries(answers)
        .filter(([, a]) => a.value !== "" && !(Array.isArray(a.value) && a.value.length === 0))
        .map(([qid, a]) => ({
          question_id: qid,
          value: a.value,
          confidence: a.confidence,
        }));

      if (payload.length === 0) {
        setSaveMessage("Nothing to save yet — answer a few questions first.");
        setSubmitting(false);
        return;
      }

      await submitAnswers(payload);
      await loadProgress();
      setSaveMessage("Progress saved! You can come back any time to finish.");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save progress");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!questionSet) return;
    setSubmitting(true);
    setError("");
    setSaveMessage("");

    // Check required fields
    const unanswered = questionSet.questions.filter((q) => {
      if (!q.required) return false;
      const ans = answers[q.question_id];
      return !ans || ans.value === "" || (Array.isArray(ans.value) && ans.value.length === 0);
    });

    if (unanswered.length > 0) {
      setError(
        `${unanswered.length} required question${unanswered.length > 1 ? "s" : ""} still need${unanswered.length === 1 ? "s" : ""} an answer. ` +
        `You can use "Save Progress" to save what you have so far, or complete the remaining questions to continue.`
      );
      setSubmitting(false);
      return;
    }

    try {
      const payload = Object.entries(answers)
        .filter(([, a]) => a.value !== "" && !(Array.isArray(a.value) && a.value.length === 0))
        .map(([qid, a]) => ({
          question_id: qid,
          value: a.value,
          confidence: a.confidence,
        }));

      const result = await submitAnswers(payload);

      // Check for progress milestone celebrations (25%, 50%, 75%)
      const newProgress = result.questionnaire_complete ? 1 : (questionSet.progress || 0);
      await loadProgress();

      // Calculate actual overall progress from updated modules
      const updatedProgress = await getProgress();
      const overallPct = updatedProgress.progress_pct;

      const thresholds = [
        { pct: 75, msg: "75% done — the finish line is in sight!" },
        { pct: 50, msg: "Halfway there! Your profile is really taking shape." },
        { pct: 25, msg: "Great start — 25% complete. You're building momentum!" },
      ];
      for (const t of thresholds) {
        if (prevProgress < t.pct && overallPct >= t.pct) {
          setCelebration(t.msg);
          setTimeout(() => setCelebration(null), 5000);
          break;
        }
      }
      setPrevProgress(overallPct);
      setModules(updatedProgress.modules);

      if (result.questionnaire_complete) {
        const ms = MODULE_MILESTONES["H"];
        if (ms) {
          setMilestone({ module: "H", ...ms });
        } else {
          setComplete(true);
        }
      } else if (result.next_module) {
        // Show milestone message for the just-completed module
        const completedModule = questionSet.module;
        const ms = MODULE_MILESTONES[completedModule];
        if (ms && result.next_module !== completedModule) {
          setMilestone({ module: completedModule, ...ms });
        } else {
          await loadQuestions(result.next_module);
        }
      } else {
        await loadQuestions();
      }
      window.scrollTo(0, 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save answers");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModuleClick(module: string) {
    await loadQuestions(module);
    window.scrollTo(0, 0);
  }

  async function handleComplete() {
    try {
      await completeQuestionnaire();
      router.push("/summary");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete");
    }
  }

  function handleBack() {
    if (!questionSet) return;
    const currentIdx = MODULE_ORDER.indexOf(questionSet.module);
    if (currentIdx > 0) {
      loadQuestions(MODULE_ORDER[currentIdx - 1]);
      window.scrollTo(0, 0);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p className="text-muted">Loading questions...</p>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <h1>Questionnaire Complete</h1>
        <p className="text-muted mb-3">
          You&apos;ve answered all the questions. Ready to see your career pathways?
        </p>
        <button className="btn btn-primary" onClick={handleComplete}>
          Generate My Career Report
        </button>
      </div>
    );
  }

  // Milestone interstitial — shown after completing a module
  if (milestone) {
    const isLastModule = milestone.module === "H";
    return (
      <>
      <AppHeader />
      <div className="container" style={{ textAlign: "center", marginTop: "4rem", maxWidth: "560px" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: isLastModule ? "#dbeafe" : "#d1fae5",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.75rem", marginBottom: "1.5rem",
        }}>
          {isLastModule ? "\u{1F389}" : "\u2713"}
        </div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{milestone.heading}</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: "1rem" }}>
          {milestone.message}
        </p>
        {milestone.nextTeaser && (
          <p style={{
            color: "#475569", fontSize: "0.875rem", lineHeight: 1.6,
            background: "#f8fafc", borderRadius: "10px",
            padding: "1rem 1.25rem", marginBottom: "1.5rem", textAlign: "left",
          }}>
            {milestone.nextTeaser}
          </p>
        )}
        {/* Time estimate */}
        {modules.length > 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
            About {estimateMinutesRemaining(modules)} min remaining
          </p>
        )}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          {!isLastModule && (
            <button
              className="btn btn-primary"
              onClick={async () => {
                const nextIdx = MODULE_ORDER.indexOf(milestone.module) + 1;
                const nextModule = nextIdx < MODULE_ORDER.length ? MODULE_ORDER[nextIdx] : undefined;
                setMilestone(null);
                if (nextModule) {
                  await loadQuestions(nextModule);
                } else {
                  setComplete(true);
                }
                window.scrollTo(0, 0);
              }}
              style={{ padding: "0.75rem 2rem" }}
            >
              Continue
            </button>
          )}
          {isLastModule && (
            <button className="btn btn-primary" onClick={() => { setMilestone(null); setComplete(true); }}
              style={{ padding: "0.75rem 2rem" }}>
              Generate My Career Report
            </button>
          )}
        </div>
      </div>
      </>
    );
  }

  if (!questionSet) return null;

  const currentModuleIdx = MODULE_ORDER.indexOf(questionSet.module);
  const minutesLeft = modules.length > 0 ? estimateMinutesRemaining(modules) : null;

  return (
    <>
    {/* Progress celebration banner */}
    {celebration && (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
        background: "linear-gradient(135deg, #2563eb, #7c3aed)",
        color: "white", textAlign: "center",
        padding: "0.875rem 1rem", fontSize: "0.95rem", fontWeight: 600,
        animation: "slideDown 0.4s ease-out",
      }}>
        {celebration}
      </div>
    )}
    {/* First-login welcome modal */}
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
            This questionnaire is the foundation of your personalised career transition plan. It covers 8 modules across about <strong style={{ color: "var(--fg)" }}>119 questions</strong> and typically takes <strong style={{ color: "var(--fg)" }}>20 &ndash; 30 minutes</strong> to complete.
          </p>
          <div style={{
            background: "#f8fafc", borderRadius: "10px",
            padding: "1rem 1.25rem", margin: "1.25rem 0",
            textAlign: "left", lineHeight: 1.75, fontSize: "0.875rem",
            color: "#475569",
          }}>
            <p style={{ fontWeight: 600, color: "var(--fg)", marginBottom: "0.375rem" }}>
              A few things to know:
            </p>
            <p>
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>Be thoughtful.</span>{" "}
              Your answers directly shape the career pathways we recommend. The more honest and considered your responses, the better your results will be.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>Your progress is saved.</span>{" "}
              You can close the browser and come back any time &mdash; you&apos;ll pick up right where you left off.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>Take your time.</span>{" "}
              If you&apos;re short on time right now, it&apos;s better to do a few modules well and return later than to rush through everything at once.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowWelcome(false)}
            style={{ padding: "0.75rem 2rem", fontSize: "0.95rem", marginTop: "0.25rem" }}
          >
            I&apos;m ready &mdash; let&apos;s begin
          </button>
        </div>
      </div>
    )}
    <AppHeader />
    <div className="container">
      {/* Version tag */}
      <p className="text-sm text-muted" style={{ textAlign: "right", marginBottom: "0.25rem" }}>{APP_VERSION}</p>

      {/* Module header */}
      <div className="flex justify-between items-center mb-1">
        <div>
          <p className="text-sm text-muted">
            Module {currentModuleIdx + 1} of {MODULE_ORDER.length}
          </p>
        </div>
        <p className="text-sm">
          {questionSet.answered_questions}/{questionSet.total_questions} answered
          {" "}({Math.round(questionSet.progress * 100)}% complete)
          {minutesLeft !== null && (
            <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
              &middot; ~{minutesLeft} min left
            </span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-2">
        <div
          className="progress-bar-fill"
          style={{ width: `${questionSet.progress * 100}%` }}
        />
      </div>

      {/* Module tabs */}
      {modules.length > 0 && (
        <div style={{ display: "flex", gap: "0.25rem", overflowX: "auto", marginBottom: "1.5rem", paddingBottom: "0.5rem" }}>
          {modules.map((m) => {
            const isActive = m.module === questionSet.module;
            return (
              <button
                key={m.module}
                onClick={() => handleModuleClick(m.module)}
                className="btn"
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "0.75rem",
                  padding: "0.375rem 0.75rem",
                  background: isActive ? "var(--primary)" : m.is_complete ? "#d1fae5" : "transparent",
                  color: isActive ? "white" : m.is_complete ? "#065f46" : "var(--muted)",
                  border: `1px solid ${isActive ? "var(--primary)" : m.is_complete ? "#059669" : "var(--border)"}`,
                }}
              >
                {m.module_label} {m.answered_questions}/{m.total_questions}
              </button>
            );
          })}
        </div>
      )}

      <h1 className="mb-2">{questionSet.module_label}</h1>

      {/* Questions */}
      <div className="flex flex-col gap-1">
        {questionSet.questions.map((q) => (
          <QuestionField
            key={q.question_id}
            question={q}
            value={answers[q.question_id]?.value ?? ""}
            confidence={answers[q.question_id]?.confidence ?? 50}
            onChange={(val) =>
              setAnswers((prev) => ({
                ...prev,
                [q.question_id]: { ...prev[q.question_id], value: val },
              }))
            }
            onConfidenceChange={(conf) =>
              setAnswers((prev) => ({
                ...prev,
                [q.question_id]: { ...prev[q.question_id], confidence: conf },
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
        </div>
      )}

      {saveMessage && (
        <div style={{
          color: "#065f46",
          background: "#d1fae5",
          border: "1px solid #059669",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          marginTop: "1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}>
          {saveMessage}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-3" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {currentModuleIdx > 0 && (
          <button className="btn btn-outline" onClick={handleBack} disabled={submitting}>
            Back
          </button>
        )}
        <button
          className="btn btn-outline"
          onClick={handleSaveProgress}
          disabled={submitting}
          style={{ flex: "0 0 auto" }}
        >
          {submitting ? "Saving..." : "Save Progress"}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ flex: 1 }}
        >
          {submitting ? "Saving..." : "Save & Next Module"}
        </button>
      </div>
    </div>
    </>
  );
}

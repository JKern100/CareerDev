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
} from "@/lib/api";
import QuestionField from "@/components/QuestionField";
import AppHeader from "@/components/AppHeader";

type AnswerMap = Record<string, { value: string | number | string[]; confidence: number }>;

const MODULE_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H"];

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

  const loadProgress = useCallback(async () => {
    try {
      const progress = await getProgress();
      setModules(progress.modules);
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

  async function handleSubmit() {
    if (!questionSet) return;
    setSubmitting(true);
    setError("");

    // Check required fields
    for (const q of questionSet.questions) {
      if (q.required) {
        const ans = answers[q.question_id];
        if (!ans || ans.value === "" || (Array.isArray(ans.value) && ans.value.length === 0)) {
          setError(`Please answer: ${q.prompt}`);
          setSubmitting(false);
          return;
        }
      }
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

      if (result.questionnaire_complete) {
        setComplete(true);
      } else if (result.next_module) {
        // Load the next module directly using the response
        await loadQuestions(result.next_module);
      } else {
        // Fallback: reload via /next
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

  if (!questionSet) return null;

  const currentModuleIdx = MODULE_ORDER.indexOf(questionSet.module);

  return (
    <>
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
            This questionnaire is the foundation of your personalised career transition plan. It covers 8 modules across about <strong style={{ color: "var(--fg)" }}>108 questions</strong> and typically takes <strong style={{ color: "var(--fg)" }}>20 &ndash; 30 minutes</strong> to complete.
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
      <p className="text-sm text-muted" style={{ textAlign: "right", marginBottom: "0.25rem" }}>V.01</p>

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
          color: "white",
          background: "#dc2626",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          marginTop: "1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-3" style={{ display: "flex", gap: "0.5rem" }}>
        {currentModuleIdx > 0 && (
          <button className="btn btn-outline" onClick={handleBack}>
            Back
          </button>
        )}
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

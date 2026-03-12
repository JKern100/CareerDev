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
      // Initialize answers for this module
      const initial: AnswerMap = {};
      for (const q of qs.questions) {
        initial[q.question_id] = { value: "", confidence: 50 };
      }
      setAnswers(initial);
      await loadProgress();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Questionnaire complete")) {
        setComplete(true);
      } else {
        setError(msg);
      }
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
      router.push("/results");
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
    <div className="container">
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
        <p style={{ color: "var(--error)", marginTop: "1rem", fontSize: "0.875rem" }}>
          {error}
        </p>
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
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getNextQuestions,
  submitAnswers,
  completeQuestionnaire,
  QuestionSet,
} from "@/lib/api";
import QuestionField from "@/components/QuestionField";

type AnswerMap = Record<string, { value: string | number | string[]; confidence: number }>;

export default function QuestionnairePage() {
  const router = useRouter();
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const qs = await getNextQuestions();
      setQuestionSet(qs);
      // Initialize answers for this module
      const initial: AnswerMap = {};
      for (const q of qs.questions) {
        initial[q.question_id] = { value: "", confidence: 50 };
      }
      setAnswers(initial);
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
  }, []);

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

      await submitAnswers(payload);
      await loadQuestions();
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
      router.push("/results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete");
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

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1>{questionSet.module_label}</h1>
          <p className="text-sm text-muted">
            Module {questionSet.module} — {questionSet.questions.length} questions
          </p>
        </div>
        <p className="text-sm">
          {questionSet.answered_questions}/{questionSet.total_questions} answered
        </p>
      </div>

      <div className="progress-bar mb-3">
        <div
          className="progress-bar-fill"
          style={{ width: `${questionSet.progress * 100}%` }}
        />
      </div>

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

      <div className="mt-3" style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}

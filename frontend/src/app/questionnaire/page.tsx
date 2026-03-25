"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCoreNextScreen,
  getNextQuestions,
  getModuleQuestions,
  submitAnswers,
  completeQuestionnaire,
  getProgress,
  Question,
  QuestionSet,
  CoreScreen,
  ModuleStatus,
  APP_VERSION,
} from "@/lib/api";
import QuestionField from "@/components/QuestionField";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";

type AnswerMap = Record<string, { value: string | number | string[]; confidence: number }>;

const MODULE_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H"];

const MODULE_MILESTONES: Record<string, { heading: string; message: string; nextTeaser: string }> = {
  A: {
    heading: "Baseline locked in",
    message: "We know where you are and what you're looking for. That's the foundation everything else builds on.",
    nextTeaser: "Next: your aviation experience \u2014 what energises you, what drains you, and why you're considering a change.",
  },
  B: {
    heading: "Your aviation story is captured",
    message: "We now understand your experience, what you enjoy, what's wearing you down, and why you're exploring a change.",
    nextTeaser: "Next: let's map out the skills you've built \u2014 many transfer directly into new careers.",
  },
  C: {
    heading: "Skills profile built",
    message: "Your transferable skills are clearer than you think. The evidence you shared will help us match you to roles that value exactly what you bring.",
    nextTeaser: "Next: what kind of work environment and lifestyle actually suits you?",
  },
  D: {
    heading: "Work style mapped",
    message: "We now know what kind of environment you thrive in \u2014 and what to steer you away from.",
    nextTeaser: "Next: the practical stuff \u2014 finances, visa, constraints. This is what makes your plan realistic.",
  },
  E: {
    heading: "Constraints understood",
    message: "Knowing your real boundaries means we can build a plan that actually works \u2014 not just one that sounds good on paper.",
    nextTeaser: "Next: where in the world do you want to be?",
  },
  F: {
    heading: "Location preferences set",
    message: "Geography shapes opportunity. We'll factor your location preferences into every recommendation.",
    nextTeaser: "Next: let's talk money \u2014 what you need, what you want, and what's realistic.",
  },
  G: {
    heading: "Financial picture clear",
    message: "Salary expectations, obligations, and trade-offs \u2014 we have what we need to model realistic compensation scenarios.",
    nextTeaser: "Almost done! Last module: your learning preferences and career family interests.",
  },
  H: {
    heading: "All modules complete!",
    message: "You've given us everything we need to build your personalised career transition plan. This is a serious step \u2014 well done.",
    nextTeaser: "",
  },
};

export default function QuestionnairePage() {
  const router = useRouter();

  // Phase: "tier1" → "tier1_done" → "tier2" → "tier2_done" → "deep_dive" → "complete"
  const [phase, setPhase] = useState<"tier1" | "tier1_done" | "tier2" | "tier2_done" | "deep_dive" | "complete">("tier1");
  const phaseRef = useRef(phase);
  phaseRef.current = phase; // always current — avoids stale closures

  // Core phase state
  const [coreScreen, setCoreScreen] = useState<CoreScreen | null>(null);

  // Deep-dive phase state (existing module-based flow)
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [modules, setModules] = useState<ModuleStatus[]>([]);

  // Shared state
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [milestone, setMilestone] = useState<{ module: string; heading: string; message: string; nextTeaser: string } | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [unansweredQuestions, setUnansweredQuestions] = useState<Question[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [prevProgress, setPrevProgress] = useState<number>(0);

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
      // All progressive screens done
      if (screen.tier1_complete && screen.tier2_complete && screen.questions.length === 0) {
        setPhase("tier2_done");
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

  // ── Deep-dive phase: load module questions ──
  const loadProgress = useCallback(async () => {
    try {
      const progress = await getProgress();
      setModules(progress.modules);
      setPrevProgress(progress.progress_pct);
      if (progress.core_complete && phaseRef.current === "tier1") {
        setPhase("tier1_done");
      }
    } catch {
      // Non-critical
    }
  }, []); // phaseRef.current used instead of phase dep

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
          initial[q.question_id] = { value: defaultValue, confidence: 100 };
        }
      }
      setAnswers(initial);
      await loadProgress();
    } catch (err: unknown) {
      if (!module) {
        try {
          await loadQuestions("A");
          return;
        } catch {
          // fallthrough
        }
      }
      const msg = err instanceof Error ? err.message : "Failed to load questions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadProgress]);

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
    // Start with core phase
    loadCoreScreen();
  }, [router, loadCoreScreen]);

  // ── When switching to tier2, load next progressive screen ──
  useEffect(() => {
    if (phase === "tier2") {
      loadCoreScreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── When switching to deep-dive, load module questions ──
  useEffect(() => {
    if (phase === "deep_dive" && !questionSet && !loading) {
      loadQuestions();
    }
  }, [phase, questionSet, loading, loadQuestions]);

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

  // ── Deep-dive submit handler (existing) ──
  async function handleSubmit() {
    if (!questionSet) return;
    setSubmitting(true);
    setError("");
    setSaveMessage("");
    setUnansweredQuestions([]);

    const unanswered = questionSet.questions.filter((q) => {
      if (!q.required) return false;
      const ans = answers[q.question_id];
      if (!ans) return true;
      if (ans.value === "not_sure") return false;
      return ans.value === "" || (Array.isArray(ans.value) && ans.value.length === 0);
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      setError(
        `${unanswered.length} required question${unanswered.length > 1 ? "s" : ""} still need${unanswered.length === 1 ? "s" : ""} an answer. ` +
        `You can use "Save Progress" to save what you have so far, or click a question below to jump to it.`
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
          confidence: a.value === "not_sure" ? 50 : a.confidence,
        }));

      const result = await submitAnswers(payload);

      await loadProgress();
      const updatedProgress = await getProgress();
      const overallPct = updatedProgress.progress_pct;

      const thresholds = [
        { pct: 75, msg: "75% done \u2014 the finish line is in sight!" },
        { pct: 50, msg: "Halfway there! Your profile is really taking shape." },
        { pct: 25, msg: "Great start \u2014 25% complete. You're building momentum!" },
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
          setPhase("complete");
        }
      } else if (result.next_module) {
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
          confidence: a.value === "not_sure" ? 50 : a.confidence,
        }));

      if (payload.length === 0) {
        setSaveMessage("Nothing to save yet \u2014 answer a few questions first.");
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

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <FlowerSpinner size={48} />
        <p className="text-muted" style={{ marginTop: "1rem" }}>Loading questions...</p>
      </div>
    );
  }

  // ── Render: Error with no questions loaded ──
  if (!loading && error && !coreScreen && !questionSet) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>
        <button className="btn btn-primary" onClick={() => (phase === "tier1" || phase === "tier2") ? loadCoreScreen() : loadQuestions()}>
          Try Again
        </button>
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
            Your initial results are ready!
          </h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: "1rem" }}>
            Based on your quick assessment, we&apos;ve matched you to career pathways.
            You can see your results now, or sharpen them with ~20 more questions (~5 min).
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/summary")}
              style={{ padding: "0.75rem 2rem" }}
            >
              See My Results
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setPhase("tier2")}
              style={{ padding: "0.75rem 2rem" }}
            >
              Sharpen My Results (~5 min)
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

  // ── Render: Tier 2 done milestone ──
  if (phase === "tier2_done") {
    return (
      <>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "4rem", maxWidth: "560px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "#d1fae5",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.75rem", marginBottom: "1.5rem",
          }}>
            &#9989;
          </div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Your results are fully scored!
          </h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: "1rem" }}>
            All scoring-relevant questions are answered. Your career pathway rankings
            are now as accurate as they&apos;ll get. You can view your full results, or
            optionally personalise your report with additional context.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/summary")}
              style={{ padding: "0.75rem 2rem" }}
            >
              See My Full Results
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setPhase("deep_dive")}
              style={{ padding: "0.75rem 2rem" }}
            >
              Personalise My Report
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "1.5rem" }}>
            The optional deep-dive adds context about your aviation background, constraints, and aspirations
            that makes the AI-generated narrative richer and more personalised.
          </p>
        </div>
      </>
    );
  }

  // ── Render: Complete ──
  if (phase === "complete") {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <h1>Questionnaire Complete</h1>
        <p className="text-muted mb-3">
          You&apos;ve answered all the questions. Let&apos;s start with a summary of your profile.
        </p>
        <button className="btn btn-primary" onClick={handleComplete}>
          View My Profile Summary
        </button>
      </div>
    );
  }

  // ── Render: Milestone interstitial (deep-dive) ──
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
                  setPhase("complete");
                }
                window.scrollTo(0, 0);
              }}
              style={{ padding: "0.75rem 2rem" }}
            >
              Continue
            </button>
          )}
          {isLastModule && (
            <button className="btn btn-primary" onClick={handleComplete}
              style={{ padding: "0.75rem 2rem" }}>
              View My Profile Summary
            </button>
          )}
        </div>
      </div>
      </>
    );
  }

  // ── Render: Progressive phase (Tier 1 or Tier 2) ──
  if ((phase === "tier1" || phase === "tier2") && coreScreen) {
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
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>Step 3: Personalise (optional).</span>{" "}
                Add background context for a richer AI-written career report.
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
        <p className="text-sm text-muted" style={{ textAlign: "right", marginBottom: "0.25rem" }}>{APP_VERSION}</p>

        {/* Core progress header */}
        <div className="flex justify-between items-center mb-1">
          <div>
            <p className="text-sm text-muted">
              Step {coreScreen.screen_number} of {coreScreen.total_screens}: {phase === "tier1" ? "Quick Match" : "Sharpening Results"}
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
            {submitting ? "Saving..." : (coreScreen.tier === 1 && coreScreen.screen_number === 4) ? "See My Results" : (coreScreen.tier === 2 && coreScreen.screen_number === coreScreen.total_screens) ? "See My Full Results" : "Next"}
          </button>
        </div>
      </div>
      </>
    );
  }

  // ── Render: Deep-dive phase (existing module flow) ──
  if (phase === "deep_dive" && questionSet) {
    const currentModuleIdx = MODULE_ORDER.indexOf(questionSet.module);

    return (
      <>
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
      <AppHeader />
      <div className="container">
        <p className="text-sm text-muted" style={{ textAlign: "right", marginBottom: "0.25rem" }}>{APP_VERSION}</p>

        {/* Refinement banner */}
        <div style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          fontSize: "0.85rem",
          color: "#1e40af",
        }}>
          Refining your results. These additional questions make your career recommendations more accurate and detailed.
        </div>

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

        <div className="progress-bar mb-2">
          <div
            className="progress-bar-fill"
            style={{ width: `${questionSet.progress * 100}%` }}
          />
        </div>

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

        <div className="flex flex-col gap-1">
          {questionSet.questions.map((q) => (
            <QuestionField
              key={q.question_id}
              question={q}
              value={answers[q.question_id]?.value ?? ""}
              isNotSure={answers[q.question_id]?.value === "not_sure"}
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

  return null;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import {
  computeTeaser,
  REGIONS,
  type TeaserAnswers,
  type Archetype,
  type Priority,
  type ResponsibilityLevel,
  type TeaserResult,
} from "@/lib/teaser";

// ---- Hook question definitions (the ungated 60-second mini-assessment) ----

const RESPONSIBILITY_OPTIONS: { value: ResponsibilityLevel; label: string }[] = [
  { value: "entry",     label: "I deliver the service to a high standard" },
  { value: "section",   label: "I run my section and back up the team" },
  { value: "cabin",     label: "I manage the full cabin and the crew in it" },
  { value: "emergency", label: "I lead in safety and emergency situations" },
  { value: "trainer",   label: "I train, assess, or sign off other crew" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "pay", label: "Higher pay" },
  { value: "home", label: "More time at home" },
  { value: "grow", label: "Room to grow" },
  { value: "stability", label: "More stability" },
  { value: "curious", label: "Just curious what's out there" },
];

const ARCHETYPES: { value: Archetype; label: string }[] = [
  { value: "calm", label: "I stay calm when things go wrong" },
  { value: "connector", label: "I'm the connector — I read people" },
  { value: "organizer", label: "I keep it all running" },
  { value: "builder", label: "I want to build something" },
];

const MOTIVATIONS: { value: Priority; label: string }[] = [
  { value: "stability", label: "Stability" },
  { value: "pay", label: "Pay" },
  { value: "home", label: "Flexibility" },
  { value: "grow", label: "Growth" },
];

// ---- Shared styles ----

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #1e293b",
  borderRadius: "16px",
  padding: "1.75rem",
};

function optionButton(selected: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "0.9rem 1.1rem",
    marginBottom: "0.6rem",
    borderRadius: "12px",
    border: selected ? "1px solid #2563eb" : "1px solid #334155",
    background: selected ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.02)",
    color: "#f1f5f9",
    fontSize: "0.98rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.12s, border 0.12s",
  };
}

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0..4 questions, 5 = teaser
  const [answers, setAnswers] = useState<TeaserAnswers>({ priorities: [] });
  const [result, setResult] = useState<TeaserResult | null>(null);

  const TOTAL_STEPS = 5;

  function next() {
    // Fire once, when the very first question is answered.
    if (step === 0) track("hook_started");
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Last question answered → compute the teaser.
      const res = computeTeaser(answers);
      setResult(res);
      track("hook_completed", { region: answers.region ?? "unknown", topPathway: res.topPathwayName });
      try {
        // Stash answers so they can prefill / inform the full assessment later.
        localStorage.setItem("teaser_answers", JSON.stringify(answers));
      } catch {
        /* ignore storage errors */
      }
      setStep(TOTAL_STEPS); // show teaser
    }
  }

  function togglePriority(value: Priority) {
    setAnswers((a) => {
      const current = a.priorities || [];
      const has = current.includes(value);
      return { ...a, priorities: has ? current.filter((v) => v !== value) : [...current, value] };
    });
  }

  // Whether the current step has a valid answer (Q5 region + motivation; Q2 optional-ish)
  const canAdvance = (() => {
    switch (step) {
      case 0:
        return !!answers.responsibility;
      case 1:
        return (answers.priorities?.length || 0) > 0;
      case 2:
        return !!answers.archetype;
      case 3:
        return !!answers.region;
      case 4:
        return true; // Q5 is optional
      default:
        return false;
    }
  })();

  return (
    <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Minimal nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          maxWidth: "640px",
          margin: "0 auto",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <img src="/logo.svg" alt="CrewTransition" width={32} height={32} />
          <span style={{ fontWeight: 600, fontSize: "1rem", color: "#f1f5f9" }}>
            Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span>
          </span>
        </a>
      </nav>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem 1rem 4rem" }}>
        {step < TOTAL_STEPS ? (
          <>
            {/* Progress */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>
                  Question {step + 1} of {TOTAL_STEPS}
                </span>
                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>~60 seconds · no signup</span>
              </div>
              <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                    background: "linear-gradient(90deg, #38bdf8, #2563eb)",
                    transition: "width 0.25s",
                  }}
                />
              </div>
            </div>

            <div style={card}>
              {step === 0 && (
                <Question title="What's the most you've been responsible for in the cabin?">
                  {RESPONSIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      style={optionButton(answers.responsibility === opt.value)}
                      onClick={() => setAnswers((a) => ({ ...a, responsibility: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </Question>
              )}

              {step === 1 && (
                <Question
                  title="If you explored something new, what would matter most?"
                  subtitle="Select all that apply"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      style={optionButton((answers.priorities || []).includes(opt.value))}
                      onClick={() => togglePriority(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </Question>
              )}

              {step === 2 && (
                <Question title="Which sounds most like you?">
                  {ARCHETYPES.map((opt) => (
                    <button
                      key={opt.value}
                      style={optionButton(answers.archetype === opt.value)}
                      onClick={() => setAnswers((a) => ({ ...a, archetype: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </Question>
              )}

              {step === 3 && (
                <Question title="Where are you based?" subtitle="Used to localize your salary range">
                  <select
                    value={answers.region || ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, region: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.9rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid #334155",
                      background: "#0f172a",
                      color: "#f1f5f9",
                      fontSize: "0.98rem",
                    }}
                  >
                    <option value="" disabled>
                      Select your region…
                    </option>
                    {REGIONS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Question>
              )}

              {step === 4 && (
                <Question
                  title="What's your next move really about?"
                  subtitle="Optional — skip if you're not sure"
                >
                  {MOTIVATIONS.map((opt) => (
                    <button
                      key={opt.value}
                      style={optionButton(answers.motivation === opt.value)}
                      onClick={() =>
                        setAnswers((a) => ({
                          ...a,
                          motivation: a.motivation === opt.value ? undefined : opt.value,
                        }))
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </Question>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    style={{
                      background: "transparent",
                      border: "1px solid #334155",
                      color: "#cbd5e1",
                      padding: "0.8rem 1.25rem",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "0.95rem",
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={!canAdvance}
                  style={{
                    flex: 1,
                    background: canAdvance ? "#2563eb" : "#1e293b",
                    color: canAdvance ? "white" : "#64748b",
                    border: "none",
                    padding: "0.8rem 1.25rem",
                    borderRadius: "10px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: canAdvance ? "pointer" : "not-allowed",
                  }}
                >
                  {step === TOTAL_STEPS - 1 ? "See what I'm worth" : "Continue"}
                </button>
              </div>
            </div>
          </>
        ) : (
          result && <Teaser result={result} onUnlock={() => { track("unlock_clicked"); router.push("/register"); }} />
        )}
      </div>
    </div>
  );
}

function Question({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: subtitle ? "0.35rem" : "1.25rem" }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem" }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

function Teaser({ result, onUnlock }: { result: TeaserResult; onUnlock: () => void }) {
  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(37,99,235,0.18)",
            color: "#60a5fa",
            padding: "0.35rem 1rem",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}
        >
          Your 60-second read
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 700, lineHeight: 1.2 }}>
          Here&apos;s what your flight experience is worth on the ground.
        </h1>
      </div>

      {/* Top 3 pathways */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
          Your 3 strongest pathways
        </h3>
        {result.top.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              gap: "0.9rem",
              padding: "0.9rem 0",
              borderTop: i === 0 ? "none" : "1px solid #1e293b",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "white",
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.2rem" }}>{p.name}</div>
              <div style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.55 }}>{p.why}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Salary range */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "0.35rem" }}>
          Typical range for {result.topPathwayName} · {result.salaryRegionLabel}
        </div>
        {result.salaryShown ? (
          <>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {result.salaryLabel} <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>/ month</span>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.4rem" }}>
              Approximate range. Your full analysis includes precise, role-by-role salary detail.
            </div>
          </>
        ) : (
          <div style={{ color: "#cbd5e1", fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.5 }}>
            {result.salaryLabel}
          </div>
        )}
      </div>

      {/* Underrated strength */}
      <div
        style={{
          ...card,
          marginBottom: "1.75rem",
          background: "rgba(37,99,235,0.06)",
          border: "1px solid rgba(37,99,235,0.3)",
        }}
      >
        <div style={{ color: "#60a5fa", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          One strength you&apos;re underrating
        </div>
        <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.4rem" }}>{result.strength.title}</div>
        <div style={{ color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.6 }}>{result.strength.body}</div>
      </div>

      {/* Account gate — shown AFTER the value */}
      <div
        style={{
          ...card,
          textAlign: "center",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.6rem" }}>Want the full picture?</h3>
        <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          All 17 pathways scored to you, a step-by-step plan for whenever you&apos;re ready, credential
          recommendations, and full salary detail. Create a free account to unlock it.
        </p>
        <button
          onClick={onUnlock}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "0.9rem 2rem",
            borderRadius: "10px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Unlock my full analysis
        </button>
        <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.85rem" }}>
          Free account. Completely private. No judgment.
        </p>
      </div>
    </div>
  );
}

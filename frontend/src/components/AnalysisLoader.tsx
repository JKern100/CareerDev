"use client";

import { useEffect, useState, useRef } from "react";
import FlowerSpinner from "./FlowerSpinner";

const ANALYSIS_STEPS = [
  { icon: "📋", label: "Parsing questionnaire responses", duration: 3000 },
  { icon: "🧠", label: "Analyzing career profile & experience", duration: 4000 },
  { icon: "🔄", label: "Mapping transferable skills", duration: 3500 },
  { icon: "🌍", label: "Scanning global labour market data", duration: 3000 },
  { icon: "🎯", label: "Matching career pathways", duration: 4500 },
  { icon: "📊", label: "Calculating compatibility scores", duration: 3000 },
  { icon: "🎓", label: "Evaluating credential requirements", duration: 2500 },
  { icon: "💰", label: "Assessing financial feasibility", duration: 3000 },
  { icon: "🗺️", label: "Building personalised action plans", duration: 4000 },
  { icon: "📝", label: "Compiling your career report", duration: 5000 },
];

export default function AnalysisLoader() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(Date.now());

  // Step progression
  useEffect(() => {
    if (activeStep >= ANALYSIS_STEPS.length) return;

    // Last step stays spinning until the report actually arrives
    const isLastStep = activeStep === ANALYSIS_STEPS.length - 1;
    if (isLastStep) return;

    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, activeStep]);
      setActiveStep((s) => s + 1);
    }, ANALYSIS_STEPS[activeStep].duration);

    return () => clearTimeout(timer);
  }, [activeStep]);

  // Elapsed time ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDuration = ANALYSIS_STEPS.reduce((sum, s) => sum + s.duration, 0);
  const completedDuration = completedSteps.reduce(
    (sum, i) => sum + ANALYSIS_STEPS[i].duration,
    0
  );
  const currentStepElapsed = Math.min(
    elapsedMs - completedDuration,
    ANALYSIS_STEPS[activeStep]?.duration ?? 0
  );
  const progressPct = Math.min(
    ((completedDuration + currentStepElapsed) / totalDuration) * 100,
    activeStep >= ANALYSIS_STEPS.length - 1 && completedSteps.includes(ANALYSIS_STEPS.length - 1)
      ? 100
      : 95
  );

  const elapsedSec = Math.floor(elapsedMs / 1000);

  return (
    <div className="analysis-loader">
      <div className="analysis-loader-header">
        <div style={{ marginBottom: "0.75rem" }}>
          <FlowerSpinner size={56} />
        </div>
        <h2 className="analysis-loader-title">Generating Your Career Report</h2>
        <p className="text-muted text-sm" style={{ marginTop: "0.25rem" }}>
          Deep analysis in progress — {elapsedSec}s elapsed
        </p>
      </div>

      {/* Progress bar */}
      <div className="analysis-progress-bar-track">
        <div
          className="analysis-progress-bar-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="analysis-steps">
        {ANALYSIS_STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(i);
          const isActive = i === activeStep && !isCompleted;
          const isPending = i > activeStep;

          return (
            <div
              key={i}
              className={`analysis-step ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""} ${isPending ? "pending" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="analysis-step-indicator">
                {isCompleted ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="9" fill="var(--success)" />
                    <path d="M5 9.5L7.5 12L13 6.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <div className="analysis-step-spinner" />
                ) : (
                  <div className="analysis-step-dot" />
                )}
              </div>
              <span className="analysis-step-icon">{step.icon}</span>
              <span className="analysis-step-label">{step.label}</span>
              {isActive && (
                <span className="analysis-step-dots">
                  <span className="dot-1">.</span>
                  <span className="dot-2">.</span>
                  <span className="dot-3">.</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-muted text-sm" style={{ textAlign: "center", marginTop: "1.5rem" }}>
        Sit tight — our AI is cross-referencing your profile against market data, credential frameworks, and career pathways.
      </p>
    </div>
  );
}

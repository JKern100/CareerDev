"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeScores, type PathwayScore, type Answers } from "@/lib/scoring";

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 text-right font-semibold text-gray-700">
        {value}%
      </span>
    </div>
  );
}

function PathwayCard({
  result,
  rank,
}: {
  result: PathwayScore;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(rank <= 2);
  const p = result.pathway;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
              rank <= 3
                ? "bg-[#0c4a6e]"
                : "bg-gray-400"
            }`}
          >
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {p.name}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-2xl font-bold text-[#0c4a6e]">
                  {result.adjustedScore}
                </span>
                <span className="text-sm text-gray-500">/100</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{p.description}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-4">
          {/* Score breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Score Breakdown
            </h4>
            <div className="space-y-2">
              <ScoreBar
                label="Interest Fit"
                value={result.components.interestFit}
                color="bg-blue-500"
              />
              <ScoreBar
                label="Skill Fit"
                value={result.components.skillFit}
                color="bg-green-500"
              />
              <ScoreBar
                label="Environment"
                value={result.components.environmentFit}
                color="bg-purple-500"
              />
              <ScoreBar
                label="Feasibility"
                value={result.components.feasibility}
                color="bg-amber-500"
              />
              <ScoreBar
                label="Compensation"
                value={result.components.compensationFit}
                color="bg-teal-500"
              />
              <ScoreBar
                label="Risk Fit"
                value={result.components.riskFit}
                color="bg-rose-500"
              />
            </div>
          </div>

          {/* Salary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              Salary Range (AED/month)
            </h4>
            <div className="text-xl font-bold text-[#0c4a6e]">
              {p.salaryRange.min.toLocaleString()} -{" "}
              {p.salaryRange.max.toLocaleString()} AED
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Source: {p.salarySource}
            </p>
          </div>

          {/* Roles */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              Typical Landing Roles
            </h4>
            <div className="flex flex-wrap gap-2">
              {p.typicalRoles.map((r) => (
                <span
                  key={r}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Skill signals */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              Key Transferable Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {p.skillSignals.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Credentials */}
          {p.credentials.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Recommended Credentials
              </h4>
              <div className="space-y-2">
                {p.credentials.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 bg-amber-50 rounded-lg p-3"
                  >
                    <svg
                      className="w-5 h-5 text-amber-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    <div>
                      <div className="font-medium text-sm text-gray-800">
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-500">{c.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signals / Risks */}
          <div className="grid grid-cols-2 gap-4">
            {result.topSignals.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {result.topSignals.map((s) => (
                    <li
                      key={s}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-green-500 mt-0.5">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2">
                  Risks
                </h4>
                <ul className="space-y-1">
                  {result.risks.map((r) => (
                    <li
                      key={r}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-red-500 mt-0.5">!</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const [scores, setScores] = useState<PathwayScore[] | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("crewpath_answers");
    if (stored) {
      const answers: Answers = JSON.parse(stored);
      const results = computeScores(answers);
      setScores(results);
    } else {
      // Demo data when no answers
      const demoAnswers: Answers = {
        Q011: 5,
        Q016: 4,
        Q017: 4,
        Q018: 3,
        Q019: 4,
        Q020: 4,
        Q026: 6,
        Q027: 4,
        Q028: 4,
        Q030: 3,
        Q031: 4,
        Q032: 4,
        Q033: 4,
        Q034: 5,
        Q035: 3,
        Q036: 4,
        Q037: 3,
        Q042: "Medium",
        Q044: 7,
        Q047: ["Structured", "Mission-driven"],
        Q048: "Hybrid",
        Q050: 4,
        Q051: 4,
        Q054: "Manager",
        Q059: ["Stability", "Learning", "Income growth"],
        Q060: 5,
        Q061: "Employer-sponsored",
        Q062: "Yes",
        Q064: 30,
        Q065: 6,
        Q066: 15000,
        Q070: "Up to 3 months",
        Q071: "Maybe",
        Q075: 8,
        Q089: 22000,
        Q090: "Balanced",
        Q097: "Bachelor's degree",
        Q100: 10,
        Q101: 10000,
        Q102: ["Project management", "HR (CIPD/SHRM)"],
        Q106: ["Learning & Development", "HR", "Operations"],
        Q107: "Head of Training at a major airline",
      };
      setScores(computeScores(demoAnswers));
    }
  }, []);

  if (!scores) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0c4a6e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analyzing your career pathways...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2">
            <svg
              className="w-7 h-7 text-[#0c4a6e]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            <span className="text-lg font-bold text-[#0c4a6e]">CrewPath</span>
          </a>
          <Link
            href="/questionnaire"
            className="text-sm text-[#0c4a6e] font-medium hover:underline"
          >
            Retake Assessment
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Summary */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Your Career Pathway Rankings
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Based on your assessment, here are your top career pathways ranked
            by fit score. Each score reflects interest fit (25%), skill fit
            (25%), feasibility (20%), compensation fit (15%), environment fit
            (10%), and risk fit (5%).
          </p>
        </div>

        {/* Top 3 summary */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {scores.slice(0, 3).map((s, i) => (
            <div
              key={s.pathway.id}
              className={`rounded-xl p-5 text-center ${
                i === 0
                  ? "bg-[#0c4a6e] text-white"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="text-sm font-medium opacity-75 mb-1">
                #{i + 1} Match
              </div>
              <div className="text-3xl font-bold mb-1">
                {s.adjustedScore}
              </div>
              <div className="text-sm font-medium">{s.pathway.name}</div>
            </div>
          ))}
        </div>

        {/* All pathways */}
        <div className="space-y-4">
          {scores.map((s, i) => (
            <PathwayCard key={s.pathway.id} result={s} rank={i + 1} />
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Important Disclaimers
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>
              - Salary ranges are market estimates from Cooper Fitch UAE Salary
              Guide 2024 — not job offers.
            </li>
            <li>
              - UAE does not levy personal income tax on individuals (source:
              official UAE government portal).
            </li>
            <li>
              - Visa and labor information is informational only — verify with
              MOHRE and official sources.
            </li>
            <li>
              - ROI projections are scenario-based; individual outcomes vary.
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center pb-10">
          <p className="text-gray-600 mb-4">
            Want to refine your results with an advisor?
          </p>
          <button className="bg-[#c2924e] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d4a76a] transition">
            Book Advisor Session (Coming Soon)
          </button>
        </div>
      </main>
    </div>
  );
}

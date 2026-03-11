"use client";

import { useAppState } from "@/lib/store";
import { pathways } from "@/data/pathways";
import { PathwayScore } from "@/lib/types";
import { useState } from "react";

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-400 w-32 text-xs">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-slate-300 w-10 text-right text-xs">{value}%</span>
    </div>
  );
}

function PathwayCard({
  score,
  rank,
  expanded,
  onToggle,
}: {
  score: PathwayScore;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pathway = pathways.find((p) => p.id === score.pathwayId);
  if (!pathway) return null;

  const hasGates = score.gateFlags.length > 0;

  return (
    <div
      className={`bg-white/5 backdrop-blur border rounded-2xl overflow-hidden transition ${
        hasGates ? "border-amber-500/30" : "border-white/10"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-start gap-4 hover:bg-white/5 transition"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
            rank <= 3 ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white">{pathway.name}</h3>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{pathway.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-blue-400">{score.adjustedScore}</div>
          <div className="text-xs text-slate-500">score</div>
        </div>
      </button>

      {/* Gate Flags */}
      {hasGates && (
        <div className="px-6 pb-3">
          {score.gateFlags.map((flag, i) => (
            <div
              key={i}
              className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5 mt-1"
            >
              {flag}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-6">
          {/* Score Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Score breakdown</h4>
            <div className="space-y-2">
              <ScoreBar label="Interest Fit (25%)" value={score.interestFit} color="bg-blue-500" />
              <ScoreBar label="Skill Fit (25%)" value={score.skillFit} color="bg-cyan-500" />
              <ScoreBar label="Environment (10%)" value={score.environmentFit} color="bg-green-500" />
              <ScoreBar label="Feasibility (20%)" value={score.feasibility} color="bg-purple-500" />
              <ScoreBar label="Compensation (15%)" value={score.compensationFit} color="bg-amber-500" />
              <ScoreBar label="Risk Fit (5%)" value={score.riskFit} color="bg-rose-500" />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Confidence factor: {score.confidenceFactor}% | Raw score: {score.rawScore}
            </div>
          </div>

          {/* Top Evidence Signals */}
          {score.topSignals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Why this fits you</h4>
              <ul className="space-y-1">
                {score.topSignals.map((signal, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">+</span>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Typical Roles */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Typical landing roles</h4>
            <div className="flex flex-wrap gap-2">
              {pathway.typicalRoles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Salary Bands */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">
              Salary bands (AED/month)
            </h4>
            <div className="space-y-2">
              {pathway.salaryBands.map((band) => (
                <div
                  key={band.role}
                  className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-2"
                >
                  <span className="text-sm text-slate-300">{band.role}</span>
                  <span className="text-sm font-medium text-blue-300">
                    {band.minAED.toLocaleString()} – {band.maxAED.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Source: {pathway.salaryBands[0]?.source}. Figures are market estimates, not offers.
            </p>
          </div>

          {/* Recommended Credentials */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Recommended credentials</h4>
            <ul className="space-y-1">
              {pathway.recommendedCredentials.map((cred, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400">*</span>
                  {cred}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          {score.risks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Risks & unknowns</h4>
              <ul className="space-y-1">
                {score.risks.map((risk, i) => (
                  <li key={i} className="text-sm text-amber-300 flex items-start gap-2">
                    <span className="mt-0.5">!</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skill Signals */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Key skill signals</h4>
            <div className="flex flex-wrap gap-2">
              {pathway.skillSignals.map((signal) => (
                <span
                  key={signal}
                  className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const { state, dispatch } = useAppState();
  const [expandedId, setExpandedId] = useState<string | null>(
    state.pathwayScores[0]?.pathwayId || null
  );
  const [showAll, setShowAll] = useState(false);

  const displayScores = showAll
    ? state.pathwayScores
    : state.pathwayScores.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">
              CD
            </div>
            <h1 className="font-semibold">Your Career Pathways</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => dispatch({ type: "SET_STEP", step: "advisor" })}
              className="px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg text-sm transition"
            >
              Book advisor
            </button>
            <button
              onClick={() => {
                // Simple export - create a text summary
                const text = state.pathwayScores
                  .map((s, i) => {
                    const p = pathways.find((p) => p.id === s.pathwayId);
                    return `${i + 1}. ${p?.name} (Score: ${s.adjustedScore}/100)\n   ${p?.description}\n   Salary: ${p?.salaryBands.map((b) => `${b.role}: AED ${b.minAED.toLocaleString()}–${b.maxAED.toLocaleString()}`).join("; ")}`;
                  })
                  .join("\n\n");

                const blob = new Blob(
                  [
                    `CareerDev - Your Career Pathway Report\nGenerated: ${new Date().toISOString()}\n\n${text}\n\nDisclaimer: This report is informational only. Salary figures are market estimates from the Cooper Fitch UAE Salary Guide 2024. Verify all legal, visa, and salary information with official sources.`,
                  ],
                  { type: "text/plain" }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "careerdev-report.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition"
            >
              Export report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-2">Your top pathway</h2>
          {state.pathwayScores[0] && (
            <>
              <p className="text-xl text-blue-300 font-semibold">
                {pathways.find((p) => p.id === state.pathwayScores[0].pathwayId)?.name}
              </p>
              <p className="text-slate-400 mt-2 text-sm">
                Based on your answers across {Object.keys(state.answers).length} questions.
                Your confidence-adjusted score is{" "}
                <span className="text-white font-medium">
                  {state.pathwayScores[0].adjustedScore}/100
                </span>
                .
              </p>
            </>
          )}
        </div>

        {/* Pathway Rankings */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {showAll ? "All 8" : "Top 5"} pathways
          </h2>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-400 hover:text-blue-300 transition"
          >
            {showAll ? "Show top 5" : "Show all 8"}
          </button>
        </div>

        <div className="space-y-4">
          {displayScores.map((score, i) => (
            <PathwayCard
              key={score.pathwayId}
              score={score}
              rank={i + 1}
              expanded={expandedId === score.pathwayId}
              onToggle={() =>
                setExpandedId(
                  expandedId === score.pathwayId ? null : score.pathwayId
                )
              }
            />
          ))}
        </div>

        {/* Transition Timeline */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6">Suggested transition timeline</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-5">
              <div className="text-sm text-blue-400 font-medium mb-2">0–6 months</div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>Complete self-assessment and identify top pathway</li>
                <li>Begin recommended short course or certification</li>
                <li>Start networking in target industry</li>
                <li>Review notice period and EOSB entitlement</li>
              </ul>
            </div>
            <div className="bg-white/5 rounded-xl p-5">
              <div className="text-sm text-cyan-400 font-medium mb-2">6–24 months</div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>Complete primary credential</li>
                <li>Gain first role or project in target field</li>
                <li>Build portfolio of transferable achievements</li>
                <li>Assess green residency eligibility if self-sponsoring</li>
              </ul>
            </div>
            <div className="bg-white/5 rounded-xl p-5">
              <div className="text-sm text-green-400 font-medium mb-2">24+ months</div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>Advance to target mid-level role</li>
                <li>Consider postgraduate study (MBA / Aviation Mgmt)</li>
                <li>Evaluate relocation or expansion opportunities</li>
                <li>Re-run assessment to update pathway rankings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* UAE Feasibility Notes */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-4">UAE feasibility notes</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white mb-1">Notice period</h4>
              <p className="text-slate-400">
                UAE Labor Law: 30–90 days (Article 43). Check your contract for specifics.
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white mb-1">End-of-service benefits</h4>
              <p className="text-slate-400">
                21 days/year for first 5 years, 30 days/year after. Cap: 2 years&apos; wages. Paid within 14 days.
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white mb-1">Tax</h4>
              <p className="text-slate-400">
                UAE does not levy personal income tax. Home-country obligations still apply.
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white mb-1">Green residency</h4>
              <p className="text-slate-400">
                Self-sponsored option. Requires bachelor&apos;s degree + MOHRE skill levels 1–3 + min AED 15,000/month salary.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Sources: MOHRE, UAE official portal, Federal Authority for Identity. Last checked: 2024.
            Always verify with official sources.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 pb-12">
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: "questionnaire" })}
            className="flex-1 py-3 border border-white/10 hover:border-white/30 rounded-xl transition text-center"
          >
            Edit answers & re-run
          </button>
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: "advisor" })}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition shadow-lg shadow-blue-500/25 text-center"
          >
            Book advisor session
          </button>
        </div>
      </main>
    </div>
  );
}

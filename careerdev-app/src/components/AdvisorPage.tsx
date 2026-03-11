"use client";

import { useAppState } from "@/lib/store";
import { useState } from "react";
import { computePathwayScores } from "@/lib/scoring";

const advisors = [
  {
    id: "1",
    name: "Sarah Al-Rashid",
    specialty: "Aviation to Corporate L&D",
    languages: ["English", "Arabic"],
    bio: "Former Emirates cabin crew turned L&D Director. 8 years of experience helping flight crew transition to corporate roles.",
    available: true,
  },
  {
    id: "2",
    name: "James Wilson",
    specialty: "HR & People Operations",
    languages: ["English"],
    bio: "CIPD-certified HR professional who specializes in career changers entering the HR field in the UAE and GCC region.",
    available: true,
  },
  {
    id: "3",
    name: "Maria Petrova",
    specialty: "Safety & Compliance Careers",
    languages: ["English", "Russian"],
    bio: "NEBOSH-certified safety consultant with aviation background. Expert in HSE career pathways across UAE industries.",
    available: false,
  },
];

export default function AdvisorPage() {
  const { state, dispatch } = useAppState();
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);

  const hasResults = state.pathwayScores.length > 0;

  function handleRunAnalysis() {
    const scores = computePathwayScores(state.answers);
    dispatch({ type: "SET_PATHWAY_SCORES", scores });
    dispatch({ type: "SET_STEP", step: "results" });
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Session requested</h2>
          <p className="text-slate-400 mb-6">
            Your advisor session has been requested. In a full deployment, you would receive
            a confirmation email with calendar invite and preparation tips.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            This is a demo. In production, advisors would review your answers,
            provide annotations, and then trigger the analysis run.
          </p>
          <div className="flex gap-4">
            {hasResults ? (
              <button
                onClick={() => dispatch({ type: "SET_STEP", step: "results" })}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition"
              >
                View your report
              </button>
            ) : (
              <button
                onClick={handleRunAnalysis}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition"
              >
                Run analysis now
              </button>
            )}
            <button
              onClick={() => dispatch({ type: "SET_STEP", step: "landing" })}
              className="flex-1 py-3 border border-white/10 hover:border-white/30 rounded-xl transition"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                dispatch({
                  type: "SET_STEP",
                  step: hasResults ? "results" : "questionnaire",
                })
              }
              className="text-slate-400 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-semibold">Book an advisor session</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Career advisors</h2>
          <p className="text-slate-400">
            Choose an advisor to review your questionnaire answers and help refine your transition plan.
            Sessions are 30 minutes and include report refinement.
          </p>
        </div>

        {/* Advisor Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {advisors.map((advisor) => (
            <button
              key={advisor.id}
              onClick={() => advisor.available && setSelectedAdvisor(advisor.id)}
              disabled={!advisor.available}
              className={`text-left p-5 rounded-2xl border transition ${
                selectedAdvisor === advisor.id
                  ? "bg-blue-500/10 border-blue-500"
                  : advisor.available
                  ? "bg-white/5 border-white/10 hover:border-white/30"
                  : "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="w-12 h-12 bg-slate-700 rounded-full mb-3 flex items-center justify-center text-lg font-bold">
                {advisor.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="font-semibold text-white">{advisor.name}</h3>
              <p className="text-sm text-blue-300 mb-2">{advisor.specialty}</p>
              <p className="text-xs text-slate-400 mb-3">{advisor.bio}</p>
              <div className="flex gap-1 flex-wrap">
                {advisor.languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-2 py-0.5 bg-white/5 rounded text-xs text-slate-400"
                  >
                    {lang}
                  </span>
                ))}
              </div>
              {!advisor.available && (
                <p className="text-xs text-amber-400 mt-2">Currently unavailable</p>
              )}
            </button>
          ))}
        </div>

        {/* Time Slots */}
        {selectedAdvisor && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold mb-4">Select a time slot</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                "Tomorrow, 10:00 AM",
                "Tomorrow, 2:00 PM",
                "Wed, 11:00 AM",
                "Wed, 4:00 PM",
                "Thu, 9:00 AM",
                "Thu, 1:00 PM",
                "Fri, 10:00 AM",
                "Fri, 3:00 PM",
              ].map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-4 py-3 rounded-xl text-sm transition border ${
                    selectedSlot === slot
                      ? "bg-blue-500/20 border-blue-500 text-white"
                      : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Booking Summary */}
        {selectedAdvisor && selectedSlot && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Booking summary</h3>
            <div className="space-y-2 text-sm text-slate-300 mb-6">
              <p>
                Advisor:{" "}
                <span className="text-white">
                  {advisors.find((a) => a.id === selectedAdvisor)?.name}
                </span>
              </p>
              <p>
                Time: <span className="text-white">{selectedSlot}</span>
              </p>
              <p>
                Duration: <span className="text-white">30 minutes</span>
              </p>
              <p>
                Price:{" "}
                <span className="text-white">AED 299</span>
                <span className="text-slate-500"> (includes full report)</span>
              </p>
            </div>
            <button
              onClick={() => setBookingComplete(true)}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition shadow-lg shadow-blue-500/25"
            >
              Confirm booking (demo)
            </button>
            <p className="text-xs text-slate-500 mt-3 text-center">
              In production, this would connect to a payment gateway and calendar system.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

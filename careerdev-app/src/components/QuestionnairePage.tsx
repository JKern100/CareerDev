"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/lib/store";
import { questions, modules } from "@/data/questions";
import { computePathwayScores } from "@/lib/scoring";
import QuestionnaireField from "./QuestionnaireField";
import { Answer } from "@/lib/types";

export default function QuestionnairePage() {
  const { state, dispatch } = useAppState();
  const [activeModule, setActiveModule] = useState("A");
  const [showAdvisorToggle, setShowAdvisorToggle] = useState(false);

  const moduleQuestions = useMemo(
    () => questions.filter((q) => q.module === activeModule),
    [activeModule]
  );

  const currentModuleIndex = modules.findIndex((m) => m.id === activeModule);
  const isLastModule = currentModuleIndex === modules.length - 1;

  // Calculate progress
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(state.answers).length;
  const progress = Math.round((answeredQuestions / totalQuestions) * 100);

  // Module completion check
  const moduleComplete = useMemo(() => {
    const required = moduleQuestions.filter((q) => q.required);
    return required.every((q) => {
      const answer = state.answers[q.id];
      if (!answer) return false;
      if (Array.isArray(answer.value)) return answer.value.length > 0;
      if (typeof answer.value === "string") return answer.value.length > 0;
      if (typeof answer.value === "number") return true;
      return false;
    });
  }, [moduleQuestions, state.answers]);

  function handleAnswer(answer: Answer) {
    dispatch({ type: "SET_ANSWER", questionId: answer.questionId, answer });
  }

  function handleNextModule() {
    if (isLastModule) {
      setShowAdvisorToggle(true);
      return;
    }
    const nextModule = modules[currentModuleIndex + 1];
    setActiveModule(nextModule.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePrevModule() {
    if (currentModuleIndex === 0) {
      dispatch({ type: "SET_STEP", step: "consent" });
      return;
    }
    const prevModule = modules[currentModuleIndex - 1];
    setActiveModule(prevModule.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRunAnalysis() {
    const scores = computePathwayScores(state.answers);
    dispatch({ type: "SET_PATHWAY_SCORES", scores });
    dispatch({ type: "SET_STEP", step: "results" });
  }

  if (showAdvisorToggle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to analyze</h2>
          <p className="text-slate-400 mb-8">
            You&apos;ve completed all {modules.length} modules. You can run the analysis now or
            request an advisor to review your answers first.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="text-left">
                <span className="font-medium text-white block">Request advisor review</span>
                <span className="text-sm text-slate-400">
                  A career advisor will review your answers before generating the report
                </span>
              </div>
              <input
                type="checkbox"
                checked={state.advisorReview}
                onChange={(e) =>
                  dispatch({ type: "SET_ADVISOR_REVIEW", review: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowAdvisorToggle(false)}
              className="flex-1 py-3 border border-white/10 hover:border-white/30 rounded-xl transition"
            >
              Back to questions
            </button>
            <button
              onClick={
                state.advisorReview
                  ? () => dispatch({ type: "SET_STEP", step: "advisor" })
                  : handleRunAnalysis
              }
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition shadow-lg shadow-blue-500/25"
            >
              {state.advisorReview ? "Book advisor" : "Run analysis"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Module {currentModuleIndex + 1} of {modules.length}
            </span>
            <span className="text-sm text-slate-400">{progress}% complete</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Module Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {modules.map((mod, i) => {
              const modQuestions = questions.filter((q) => q.module === mod.id);
              const modAnswered = modQuestions.filter((q) => state.answers[q.id]).length;
              const isActive = mod.id === activeModule;

              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {mod.name}
                  <span className="ml-1 text-[10px] opacity-60">
                    {modAnswered}/{modQuestions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-1">
          {modules[currentModuleIndex].name}
        </h2>
        <p className="text-sm text-slate-400 mb-8">
          {moduleQuestions.length} questions in this module
        </p>

        <div className="space-y-8">
          {moduleQuestions.map((q) => (
            <div
              key={q.id}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
            >
              <span className="text-xs text-slate-500 mb-2 block">{q.id}</span>
              <QuestionnaireField
                question={q}
                answer={state.answers[q.id]}
                onAnswer={handleAnswer}
              />
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-8 pb-8">
          <button
            onClick={handlePrevModule}
            className="flex-1 py-3 border border-white/10 hover:border-white/30 rounded-xl transition"
          >
            {currentModuleIndex === 0 ? "Back" : "Previous module"}
          </button>
          <button
            onClick={handleNextModule}
            disabled={!moduleComplete && moduleQuestions.some((q) => q.required)}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              moduleComplete || !moduleQuestions.some((q) => q.required)
                ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isLastModule ? "Review & analyze" : "Next module"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modules } from "@/lib/questions";
import type { Question, QuestionType } from "@/lib/questions";

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | string[] | number | undefined;
  onChange: (val: string | string[] | number) => void;
}) {
  const type: QuestionType = question.type;

  if (type === "single_select" && question.options) {
    return (
      <div className="flex flex-wrap gap-3">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
              value === opt
                ? "bg-[#0c4a6e] text-white border-[#0c4a6e]"
                : "bg-white border-gray-300 hover:border-[#0c4a6e] hover:text-[#0c4a6e]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (type === "multi_select" && question.options) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-3">
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(
                  isSelected
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt]
                );
              }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                isSelected
                  ? "bg-[#0c4a6e] text-white border-[#0c4a6e]"
                  : "bg-white border-gray-300 hover:border-[#0c4a6e] hover:text-[#0c4a6e]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "likert_1_5") {
    const labels = [
      "Strongly Disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly Agree",
    ];
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-3 rounded-lg border text-sm font-medium transition flex flex-col items-center gap-1 ${
              value === n
                ? "bg-[#0c4a6e] text-white border-[#0c4a6e]"
                : "bg-white border-gray-300 hover:border-[#0c4a6e]"
            }`}
          >
            <span className="text-lg font-bold">{n}</span>
            <span className="text-xs opacity-75 hidden sm:block">
              {labels[n - 1]}
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (type === "slider_0_10") {
    const numVal = typeof value === "number" ? value : 5;
    return (
      <div>
        <input
          type="range"
          min={0}
          max={10}
          value={numVal}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full accent-[#0c4a6e]"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span className="text-lg font-bold text-[#0c4a6e]">{numVal}</span>
          <span>10</span>
        </div>
      </div>
    );
  }

  if (type === "numeric") {
    return (
      <input
        type="number"
        min={question.min}
        max={question.max}
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0c4a6e] focus:ring-2 focus:ring-[#0c4a6e]/20 outline-none"
        placeholder="Enter a number"
      />
    );
  }

  if (type === "text_long") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0c4a6e] focus:ring-2 focus:ring-[#0c4a6e]/20 outline-none resize-y"
        placeholder="Your answer..."
      />
    );
  }

  // text_short
  return (
    <input
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0c4a6e] focus:ring-2 focus:ring-[#0c4a6e]/20 outline-none"
      placeholder="Your answer..."
    />
  );
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [currentModule, setCurrentModule] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, string | string[] | number>
  >({});

  const mod = modules[currentModule];
  const totalModules = modules.length;
  const progress = ((currentModule + 1) / totalModules) * 100;

  function setAnswer(qId: string, val: string | string[] | number) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  function canProceed() {
    return mod.questions
      .filter((q) => q.required)
      .every((q) => {
        const val = answers[q.id];
        if (val === undefined || val === "") return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      });
  }

  function handleNext() {
    if (currentModule < totalModules - 1) {
      setCurrentModule(currentModule + 1);
      window.scrollTo(0, 0);
    } else {
      // Store answers and navigate to results
      sessionStorage.setItem("crewpath_answers", JSON.stringify(answers));
      router.push("/results");
    }
  }

  function handleBack() {
    if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      window.scrollTo(0, 0);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
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
          <span className="text-sm text-gray-500">
            Module {currentModule + 1} of {totalModules}
          </span>
        </div>
      </nav>

      {/* Progress */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0c4a6e] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-2 py-3 overflow-x-auto">
            {modules.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setCurrentModule(i)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition ${
                  i === currentModule
                    ? "bg-[#0c4a6e] text-white"
                    : i < currentModule
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {m.id}. {m.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {mod.title}
          </h1>
          <p className="text-gray-600">{mod.description}</p>
        </div>

        <div className="space-y-8">
          {mod.questions.map((q, qi) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <label className="block text-sm font-semibold text-gray-800 mb-4">
                <span className="text-gray-400 mr-2">
                  {qi + 1}/{mod.questions.length}
                </span>
                {q.prompt}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <QuestionInput
                question={q}
                value={answers[q.id]}
                onChange={(val) => setAnswer(q.id, val)}
              />
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-10 pb-10">
          <button
            onClick={handleBack}
            disabled={currentModule === 0}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-8 py-3 rounded-lg bg-[#0c4a6e] text-white font-semibold hover:bg-[#0ea5e9] transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {currentModule === totalModules - 1
              ? "Get My Results"
              : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}

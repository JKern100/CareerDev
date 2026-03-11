"use client";

import { useState } from "react";
import { Question, Answer } from "@/lib/types";

interface Props {
  question: Question;
  answer?: Answer;
  onAnswer: (answer: Answer) => void;
}

export default function QuestionnaireField({ question, answer, onAnswer }: Props) {
  const [value, setValue] = useState<string | string[] | number>(
    answer?.value ?? (question.type === "multi_select" ? [] : "")
  );
  const [confidence, setConfidence] = useState(answer?.confidence ?? 70);
  const [evidence, setEvidence] = useState(answer?.evidence ?? "");

  function emit(newValue: string | string[] | number) {
    setValue(newValue);
    onAnswer({
      questionId: question.id,
      value: newValue,
      confidence,
      evidence: evidence || undefined,
    });
  }

  function handleConfidenceChange(c: number) {
    setConfidence(c);
    onAnswer({
      questionId: question.id,
      value,
      confidence: c,
      evidence: evidence || undefined,
    });
  }

  function handleEvidenceChange(e: string) {
    setEvidence(e);
    onAnswer({
      questionId: question.id,
      value,
      confidence,
      evidence: e || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <h3 className="text-lg font-medium text-white">{question.prompt}</h3>
        {question.required && <span className="text-red-400 text-sm">*</span>}
      </div>

      {/* Single Select */}
      {question.type === "single_select" && question.options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => emit(opt)}
              className={`px-4 py-3 rounded-xl text-sm text-left transition border ${
                value === opt
                  ? "bg-blue-500/20 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Multi Select */}
      {question.type === "multi_select" && question.options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  const next = selected
                    ? current.filter((v) => v !== opt)
                    : [...current, opt];
                  emit(next);
                }}
                className={`px-4 py-3 rounded-xl text-sm text-left transition border ${
                  selected
                    ? "bg-blue-500/20 border-blue-500 text-white"
                    : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-blue-500 border-blue-500" : "border-slate-500"
                    }`}
                  >
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Likert 1-5 */}
      {question.type === "likert_1_5" && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => emit(n)}
              className={`flex-1 py-3 rounded-xl text-center transition border ${
                value === n
                  ? "bg-blue-500/20 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
              }`}
            >
              {n}
            </button>
          ))}
          <div className="flex justify-between text-xs text-slate-500 w-full absolute -bottom-5">
          </div>
        </div>
      )}
      {question.type === "likert_1_5" && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>Strongly disagree</span>
          <span>Strongly agree</span>
        </div>
      )}

      {/* Slider 0-10 */}
      {question.type === "slider_0_10" && (
        <div>
          <input
            type="range"
            min={0}
            max={10}
            value={typeof value === "number" ? value : 5}
            onChange={(e) => emit(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span className="text-blue-400 font-medium text-sm">
              {typeof value === "number" ? value : 5}
            </span>
            <span>10</span>
          </div>
        </div>
      )}

      {/* Numeric */}
      {question.type === "numeric" && (
        <input
          type="number"
          min={question.min ?? 0}
          max={question.max}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => emit(e.target.value ? parseFloat(e.target.value) : "")}
          placeholder={`Enter a number${question.min !== undefined ? ` (${question.min}–${question.max})` : ""}`}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
        />
      )}

      {/* Text Short */}
      {question.type === "text_short" && (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => emit(e.target.value)}
          placeholder="Type your answer..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
        />
      )}

      {/* Text Long */}
      {question.type === "text_long" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => emit(e.target.value)}
          placeholder="Share your experience in detail..."
          rows={4}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition resize-none"
        />
      )}

      {/* File Upload placeholder */}
      {question.type === "file_upload" && (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">
            File upload will be available in the full version.
            <br />
            For now, describe your evidence in the text box below.
          </p>
        </div>
      )}

      {/* Confidence Slider */}
      <div className="pt-4 border-t border-white/5">
        <label className="text-xs text-slate-400 block mb-2">
          How confident are you in this answer? ({confidence}%)
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={confidence}
          onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>Not sure</span>
          <span>Very confident</span>
        </div>
      </div>

      {/* Optional Evidence */}
      {(question.type === "likert_1_5" || question.type === "slider_0_10" || question.type === "single_select") && (
        <details className="text-sm">
          <summary className="text-slate-400 cursor-pointer hover:text-slate-300 transition">
            Add supporting evidence (optional)
          </summary>
          <textarea
            value={evidence}
            onChange={(e) => handleEvidenceChange(e.target.value)}
            placeholder="Share an example or story that supports your answer..."
            rows={2}
            className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none transition resize-none"
          />
        </details>
      )}
    </div>
  );
}

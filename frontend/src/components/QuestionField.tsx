"use client";

import { Question } from "@/lib/api";

interface Props {
  question: Question;
  value: string | number | string[];
  confidence: number;
  onChange: (value: string | number | string[]) => void;
  onConfidenceChange: (confidence: number) => void;
}

export default function QuestionField({
  question,
  value,
  confidence,
  onChange,
  onConfidenceChange,
}: Props) {
  const renderInput = () => {
    switch (question.question_type) {
      case "single_select":
        return (
          <div className="flex flex-col gap-1">
            {question.options?.map((opt) => (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  border: `1px solid ${value === opt ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: value === opt ? "#eff6ff" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name={question.question_id}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "multi_select":
        return (
          <div className="flex flex-col gap-1">
            {question.options?.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt);
              return (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: selected ? "#eff6ff" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = Array.isArray(value) ? value : [];
                      if (selected) {
                        onChange(current.filter((v) => v !== opt));
                      } else {
                        onChange([...current, opt]);
                      }
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );

      case "likert_1_5":
        return (
          <div className="flex gap-1" style={{ justifyContent: "space-between" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => onChange(n)}
                className="btn"
                style={{
                  flex: 1,
                  background: value === n ? "var(--primary)" : "transparent",
                  color: value === n ? "white" : "var(--fg)",
                  border: `1px solid ${value === n ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        );

      case "slider_0_10":
        return (
          <div>
            <input
              type="range"
              min={question.min_val ?? 0}
              max={question.max_val ?? 10}
              value={typeof value === "number" ? value : 5}
              onChange={(e) => onChange(parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
            <div className="flex justify-between text-sm text-muted">
              <span>{question.min_val ?? 0}</span>
              <span style={{ fontWeight: 600 }}>
                {typeof value === "number" ? value : 5}
              </span>
              <span>{question.max_val ?? 10}</span>
            </div>
          </div>
        );

      case "numeric":
        return (
          <input
            type="number"
            min={question.min_val ?? undefined}
            max={question.max_val ?? undefined}
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          />
        );

      case "text_short":
        return (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer..."
          />
        );

      case "text_long":
        return (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Share your experience..."
            rows={4}
          />
        );

      case "file_upload":
        return (
          <div style={{ padding: "1rem", border: "2px dashed var(--border)", borderRadius: "8px", textAlign: "center" }}>
            <p className="text-sm text-muted">File upload coming soon</p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div id={`q-${question.question_id}`} className="card">
      <div className="mb-2">
        <p style={{ fontWeight: 500 }}>
          {question.prompt}
          {question.required && <span style={{ color: "var(--error)" }}> *</span>}
        </p>
      </div>

      {renderInput()}

      <div className="mt-2">
        <label className="text-sm text-muted">
          Confidence: {confidence}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={confidence}
          onChange={(e) => onConfidenceChange(parseInt(e.target.value))}
          style={{ width: "100%", marginTop: "0.25rem" }}
        />
      </div>
    </div>
  );
}

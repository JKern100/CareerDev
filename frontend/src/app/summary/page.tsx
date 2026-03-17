"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateSummary, getSummary, SummaryReport, APP_VERSION } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";

export default function SummaryPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        // Try to get existing summary
        const data = await getSummary();
        setSummary(data);
      } catch {
        // No summary yet — generate one
        setGenerating(true);
        try {
          const data = await generateSummary();
          setSummary(data);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to generate summary");
        } finally {
          setGenerating(false);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleRegenerate() {
    setGenerating(true);
    setError("");
    try {
      const data = await generateSummary();
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate summary");
    } finally {
      setGenerating(false);
    }
  }

  if (loading || generating) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <FlowerSpinner size={56} />
        </div>
        <h2 style={{ marginBottom: "1rem" }}>
          {generating ? "Writing your personal summary..." : "Loading..."}
        </h2>
        <p className="text-muted">
          {generating
            ? "We're crafting a narrative based on everything you shared. This may take a moment."
            : "Retrieving your summary report..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "var(--error)" }}>{error}</p>
        <button className="btn btn-outline mt-2" onClick={() => router.push("/questionnaire")}>
          Back to Questionnaire
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <>
    <AppHeader />
    <div className="container" style={{ maxWidth: "720px" }}>
      <p className="text-sm text-muted" style={{ textAlign: "right", marginBottom: "0.25rem" }}>
        {APP_VERSION}
      </p>

      <h1 style={{ marginBottom: "0.25rem" }}>Your Career Profile Summary</h1>
      <p className="text-muted" style={{ marginBottom: "2rem" }}>
        A personalized reflection based on your questionnaire responses.
      </p>

      {/* Render the summary as formatted text */}
      <div
        style={{
          lineHeight: 1.8,
          fontSize: "1rem",
          color: "var(--foreground)",
        }}
      >
        {summary.summary_text.split("\n\n").map((paragraph, i) => {
          // Check if it's a heading (starts with **)
          if (paragraph.startsWith("**") && paragraph.indexOf("**", 2) > 2) {
            const headingEnd = paragraph.indexOf("**", 2);
            const heading = paragraph.slice(2, headingEnd);
            const rest = paragraph.slice(headingEnd + 2).trim();
            return (
              <div key={i} style={{ marginBottom: "1.5rem" }}>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    color: "var(--primary)",
                    marginBottom: "0.5rem",
                    marginTop: i > 0 ? "2rem" : "0",
                  }}
                >
                  {heading}
                </h2>
                {rest && <p style={{ marginBottom: "0.75rem" }}>{rest}</p>}
              </div>
            );
          }

          // Check if it contains numbered items (teaser questions)
          if (/^\d+\.\s/.test(paragraph.trim())) {
            const items = paragraph.trim().split(/\n/).filter(Boolean);
            return (
              <ol
                key={i}
                style={{
                  paddingLeft: "1.5rem",
                  marginBottom: "1.5rem",
                  listStyleType: "decimal",
                }}
              >
                {items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      marginBottom: "0.5rem",
                      color: "var(--primary)",
                      fontWeight: 500,
                    }}
                  >
                    {item.replace(/^\d+\.\s*/, "")}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <p key={i} style={{ marginBottom: "1rem" }}>
              {paragraph}
            </p>
          );
        })}
      </div>

      {/* Action buttons */}
      <div
        style={{
          marginTop: "3rem",
          padding: "1.5rem",
          background: "var(--card)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <h3 style={{ marginBottom: "0.5rem" }}>Ready for the next step?</h3>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          Your Career Analysis Report will score and rank specific career pathways
          based on your profile, with salary data, credential recommendations, and
          a realistic transition timeline.
        </p>
        <button
          className="btn btn-primary"
          style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
          onClick={() => router.push("/results")}
        >
          Generate Career Analysis
        </button>
      </div>

      {/* Human review recommendation */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "1.5rem",
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(139, 92, 246, 0.08))",
          borderRadius: "12px",
          border: "1px solid rgba(37, 99, 235, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", background: "var(--primary)", color: "white", padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: 600 }}>
            Recommended
          </span>
        </div>
        <h3 style={{ marginBottom: "0.5rem" }}>1-on-1 Human Career Review</h3>
        <p className="text-muted" style={{ marginBottom: "1rem", lineHeight: 1.6 }}>
          Get a personalized 45-minute session with a career advisor who will walk
          through your profile summary, validate the AI analysis, and help you
          build an actionable next-steps plan tailored to your situation.
        </p>
        <button
          className="btn btn-outline"
          style={{ fontSize: "0.95rem", padding: "0.65rem 1.5rem" }}
          onClick={() => router.push("/book")}
        >
          Book a review session
        </button>
        <p className="text-sm text-muted" style={{ marginTop: "0.75rem" }}>
          Available worldwide. Sessions conducted via Zoom.
        </p>
      </div>

      {/* Regenerate and back options */}
      <div
        className="mt-2"
        style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0" }}
      >
        <button className="btn btn-outline" onClick={() => router.push("/questionnaire")}>
          Back to Questionnaire
        </button>
        <button
          className="btn btn-outline"
          onClick={handleRegenerate}
          disabled={generating}
        >
          {generating ? "Regenerating..." : "Regenerate Summary"}
        </button>
      </div>

      <p
        className="text-sm text-muted"
        style={{ textAlign: "center", marginTop: "1rem", marginBottom: "2rem" }}
      >
        {summary.generated_with_ai
          ? "This summary was generated using AI based on your responses."
          : "This summary was generated from your responses."}
      </p>
    </div>
    </>
  );
}

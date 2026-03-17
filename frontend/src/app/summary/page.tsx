"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateSummary, getSummary, getMe, SummaryReport, APP_VERSION } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SummaryPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [canRegenerate, setCanRegenerate] = useState(false);
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
        // Check user's regeneration permission
        const me = await getMe();
        setCanRegenerate(me.can_regenerate_summary);

        // Try to get existing summary
        const data = await getSummary();

        if (me.can_regenerate_summary) {
          // Admin enabled regeneration — auto-regenerate
          setGenerating(true);
          setLoading(false);
          try {
            const fresh = await generateSummary();
            setSummary(fresh);
            setCanRegenerate(false); // Flag is reset after use
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to regenerate summary");
            setSummary(data); // Fall back to existing
          } finally {
            setGenerating(false);
          }
        } else {
          setSummary(data);
        }
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

      {/* Render the summary as formatted markdown */}
      <div
        className="markdown-report"
        style={{
          lineHeight: 1.8,
          fontSize: "1rem",
          color: "var(--foreground)",
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summary.summary_text}
        </ReactMarkdown>
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
        {canRegenerate && (
          <button
            className="btn btn-outline"
            onClick={handleRegenerate}
            disabled={generating}
          >
            {generating ? "Regenerating..." : "Regenerate Summary"}
          </button>
        )}
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

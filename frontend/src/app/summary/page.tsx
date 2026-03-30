"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateSummary, getSummary, getMe, getProgress, getCareerReport, SummaryReport, APP_VERSION } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "@/hooks/useTranslation";

export default function SummaryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const p = (key: string) => t("pages.summary." + key);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [canRegenerate, setCanRegenerate] = useState(false);
  const [tier2Complete, setTier2Complete] = useState(false);
  const [hasAnalysisReport, setHasAnalysisReport] = useState(false);
  const [questionnaireComplete, setQuestionnaireComplete] = useState(false);
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
        // Check user's permissions and questionnaire progress
        const [me, progress] = await Promise.all([getMe(), getProgress()]);
        setCanRegenerate(me.can_regenerate_summary);
        setTier2Complete(me.questionnaire_completed || progress.tier2_complete);
        setQuestionnaireComplete(me.questionnaire_completed);

        // Check if career analysis report already exists
        try {
          await getCareerReport();
          setHasAnalysisReport(true);
        } catch {
          setHasAnalysisReport(false);
        }

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
          {generating ? p("generating_title") : t("ui.loading_short")}
        </h2>
        <p className="text-muted">
          {generating ? p("generating_text") : p("loading_text")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "var(--error)" }}>{error}</p>
        <button className="btn btn-outline mt-2" onClick={() => router.push("/questionnaire")}>
          {p("back_to_questionnaire")}
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

      <h1 style={{ marginBottom: "0.25rem" }}>{p("title")}</h1>
      <p className="text-muted" style={{ marginBottom: "2rem" }}>
        {p("subtitle")}
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

      {/* Action buttons — depends on tier progress */}
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
        {tier2Complete ? (
          <>
            <h3 style={{ marginBottom: "0.5rem" }}>
              {hasAnalysisReport ? p("your_analysis") : p("next_step")}
            </h3>
            <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
              {hasAnalysisReport ? p("analysis_ready_text") : p("analysis_generate_text")}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
                onClick={() => router.push("/results")}
              >
                {hasAnalysisReport ? p("view_analysis") : p("generate_analysis")}
              </button>
              {!questionnaireComplete && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "0.9rem", padding: "0.75rem 1.5rem" }}
                  onClick={() => router.push("/questionnaire")}
                >
                  {p("continue_questionnaire")}
                </button>
              )}
            </div>
            {!questionnaireComplete && (
              <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "1rem" }}>
                {p("more_questions_note")}
              </p>
            )}
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: "0.5rem" }}>{p("want_more_accurate")}</h3>
            <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
              {p("sharpen_text")}
            </p>
            <button
              className="btn btn-primary"
              style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
              onClick={() => router.push("/questionnaire?start=tier2")}
            >
              {p("sharpen_cta")}
            </button>
          </>
        )}
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
            {p("recommended")}
          </span>
        </div>
        <h3 style={{ marginBottom: "0.5rem" }}>{p("human_review_title")}</h3>
        <p className="text-muted" style={{ marginBottom: "1rem", lineHeight: 1.6 }}>
          {p("human_review_text")}
        </p>
        <button
          className="btn btn-outline"
          style={{ fontSize: "0.95rem", padding: "0.65rem 1.5rem" }}
          onClick={() => router.push("/book")}
        >
          {p("book_session")}
        </button>
        <p className="text-sm text-muted" style={{ marginTop: "0.75rem" }}>
          {p("sessions_note")}
        </p>
      </div>

      {/* Coach CTA */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, rgba(234, 179, 8, 0.06), rgba(234, 179, 8, 0.02))",
          border: "1px solid rgba(234, 179, 8, 0.2)",
          borderRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "0.25rem" }}>{p("explore_further")}</h3>
          <p className="text-muted" style={{ fontSize: "0.875rem" }}>
            {p("explore_coach_text")}
          </p>
        </div>
        <button
          className="btn btn-outline"
          style={{ padding: "0.6rem 1.5rem", fontSize: "0.9rem", borderColor: "rgba(234, 179, 8, 0.4)", color: "#eab308", whiteSpace: "nowrap" }}
          onClick={() => router.push("/coach")}
        >
          {p("talk_to_coach")}
        </button>
      </div>

      {/* Regenerate and back options */}
      <div
        className="mt-2"
        style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0" }}
      >
        <button className="btn btn-outline" onClick={() => router.push("/questionnaire")}>
          {p("back_to_questionnaire")}
        </button>
        {canRegenerate && (
          <button
            className="btn btn-outline"
            onClick={handleRegenerate}
            disabled={generating}
          >
            {generating ? t("ui.regenerating") : p("regenerate")}
          </button>
        )}
      </div>

      <p
        className="text-sm text-muted"
        style={{ textAlign: "center", marginTop: "1rem", marginBottom: "2rem" }}
      >
        {summary.generated_with_ai
          ? p("generated_ai")
          : p("generated_plain")}
      </p>
    </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { runAnalysis, getCareerReport, getResults, getMe, CareerAnalysis, PathwayResult } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import AnalysisLoader from "@/components/AnalysisLoader";
import FlowerSpinner from "@/components/FlowerSpinner";
import InstagramShareModal from "@/components/InstagramShareModal";
import InstagramIcon from "@/components/InstagramIcon";
import ResourcesSection from "@/components/ResourcesSection";

export default function ResultsPage() {
  const router = useRouter();
  const [report, setReport] = useState<CareerAnalysis | null>(null);
  const [pathways, setPathways] = useState<PathwayResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [questionnaireComplete, setQuestionnaireComplete] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        // Check questionnaire completion status
        getMe().then(me => setQuestionnaireComplete(me.questionnaire_completed)).catch(() => {});

        // Try to get existing report first
        const data = await getCareerReport();

        if (data.can_regenerate) {
          // Admin enabled regeneration — auto-regenerate instead of showing stale report
          setGenerating(true);
          setLoading(false);
          try {
            await runAnalysis();
            const fresh = await getCareerReport();
            setReport(fresh);
            getResults().then(setPathways).catch(() => {});
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to regenerate report");
          } finally {
            setGenerating(false);
          }
        } else {
          setReport(data);
          getResults().then(setPathways).catch(() => {});
        }
      } catch {
        // No report yet — run analysis
        try {
          setGenerating(true);
          await runAnalysis();
          const data = await getCareerReport();
          setReport(data);
          getResults().then(setPathways).catch(() => {});
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to generate results");
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
      await runAnalysis();
      const data = await getCareerReport();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate report");
    } finally {
      setGenerating(false);
    }
  }

  if (loading || generating) {
    return (
      <>
        <AppHeader />
        {generating ? (
          <AnalysisLoader />
        ) : (
          <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
            <FlowerSpinner size={48} />
            <h2 style={{ marginTop: "1rem" }}>Loading...</h2>
          </div>
        )}
      </>
    );
  }

  if (error) {
    const isTierError = error.toLowerCase().includes("complete") || error.toLowerCase().includes("stage") || error.toLowerCase().includes("questionnaire");
    return (
      <>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
          <p style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            {isTierError ? (
              <button className="btn btn-primary" onClick={() => router.push("/questionnaire")}>
                Continue Questionnaire
              </button>
            ) : (
              <button className="btn btn-outline" onClick={() => router.push("/questionnaire")}>
                Back to Questionnaire
              </button>
            )}
            <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="container" style={{ maxWidth: "860px" }}>
        <div className="card" style={{ marginTop: "1rem", padding: "1.25rem" }}>
          <div className="markdown-report">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report?.markdown_report ?? ""}
            </ReactMarkdown>
          </div>
          <hr style={{ margin: "2rem 0 1rem" }} />
          <p className="text-sm text-muted" style={{ textAlign: "center" }}>
            Generated on {report?.created_at ? new Date(report.created_at).toLocaleDateString() : "—"}
            {" · "}Model: {report?.model_name ?? "—"}
          </p>
          <p className="text-sm text-muted" style={{ textAlign: "center" }}>
            This report is informational only. For visa/labor decisions, consult official sources in your country.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "1rem", flexWrap: "wrap" }}>
            {pathways.length > 0 && (
              <button
                onClick={() => setShareOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.625rem 1.25rem",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                  background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <InstagramIcon size={18} color="#fff" />
                Share on Instagram
              </button>
            )}
            {report?.can_regenerate && (
              <button
                className="btn btn-outline"
                onClick={handleRegenerate}
                disabled={generating}
              >
                {generating ? "Regenerating..." : "Regenerate Report"}
              </button>
            )}
          </div>
        </div>

        {pathways.length > 0 && <ResourcesSection pathways={pathways} />}

        {!questionnaireComplete && (
          <div style={{
            marginTop: "1.5rem",
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(139, 92, 246, 0.06))",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            borderRadius: "12px",
            textAlign: "center",
          }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Want a more detailed analysis?</h3>
            <p className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "1rem", lineHeight: 1.6 }}>
              Your report is based on partial questionnaire data. Answering more questions will make
              the recommendations more personalised and the analysis more confident.
              Your progress is saved &mdash; pick up where you left off.
            </p>
            <button
              className="btn btn-outline"
              style={{ padding: "0.6rem 1.5rem", fontSize: "0.9rem", borderColor: "var(--primary)", color: "var(--primary)" }}
              onClick={() => router.push("/questionnaire")}
            >
              Continue Questionnaire
            </button>
          </div>
        )}
      </div>

      {pathways.length > 0 && (
        <InstagramShareModal
          pathways={pathways}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

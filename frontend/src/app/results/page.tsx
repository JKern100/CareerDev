"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { runAnalysis, getCareerReport, CareerAnalysis } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import AnalysisLoader from "@/components/AnalysisLoader";

export default function ResultsPage() {
  const router = useRouter();
  const [report, setReport] = useState<CareerAnalysis | null>(null);
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
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to regenerate report");
          } finally {
            setGenerating(false);
          }
        } else {
          setReport(data);
        }
      } catch {
        // No report yet — run analysis
        try {
          setGenerating(true);
          await runAnalysis();
          const data = await getCareerReport();
          setReport(data);
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
            <h2>Loading...</h2>
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
          <p style={{ color: "var(--error)" }}>{error}</p>
          <button className="btn btn-outline mt-2" onClick={() => router.push("/questionnaire")}>
            Back to Questionnaire
          </button>
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
          {report?.can_regenerate && (
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                className="btn btn-outline"
                onClick={handleRegenerate}
                disabled={generating}
              >
                {generating ? "Regenerating..." : "Regenerate Report"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

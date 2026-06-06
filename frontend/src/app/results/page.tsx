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
import { useTranslation } from "@/hooks/useTranslation";

export default function ResultsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const p = (key: string) => t("pages.results." + key);
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
      <div style={{ flex: 1 }}>
        <AppHeader />
        {generating ? (
          <AnalysisLoader />
        ) : (
          <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
            <FlowerSpinner size={48} />
            <h2 style={{ marginTop: "1rem" }}>{t("ui.loading_short")}</h2>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    const isTierError = error.toLowerCase().includes("complete") || error.toLowerCase().includes("stage") || error.toLowerCase().includes("questionnaire");
    return (
      <div style={{ flex: 1 }}>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
          <p style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            {isTierError ? (
              <button className="btn btn-primary" onClick={() => router.push("/questionnaire")}>
                {p("continue_questionnaire")}
              </button>
            ) : (
              <button className="btn btn-outline" onClick={() => router.push("/questionnaire")}>
                {p("back_to_questionnaire")}
              </button>
            )}
            <button className="btn btn-outline" onClick={() => router.push("/dashboard")}>
              {p("back_to_dashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1 }}>
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
            Saved to your account — come back to it anytime, whenever you're ready.
          </p>
          <p className="text-sm text-muted" style={{ textAlign: "center" }}>
            {p("disclaimer")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "1rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-outline"
              onClick={() => window.print()}
              style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem" }}
            >
              Save a copy (print / PDF)
            </button>
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
                {p("share_instagram")}
              </button>
            )}
            {report?.can_regenerate && (
              <button
                className="btn btn-outline"
                onClick={handleRegenerate}
                disabled={generating}
              >
                {generating ? t("ui.regenerating") : p("regenerate")}
              </button>
            )}
          </div>
        </div>

        {pathways.length > 0 && <ResourcesSection pathways={pathways} />}

        {/* Single, pressure-free CTA — there's a plan here for whenever you want it */}
        <div style={{
          marginTop: "1.5rem",
          padding: "1.5rem",
          background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          borderRadius: "12px",
          textAlign: "center",
        }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>
            There&apos;s a step-by-step plan here — for whenever you&apos;re ready
          </h3>
          <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.1rem", lineHeight: 1.6 }}>
            No pressure and no timeline. Open it when you want to see exactly how to move on any
            pathway above — or just keep it for later.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: "0.7rem 1.75rem", fontSize: "0.95rem", whiteSpace: "nowrap" }}
            onClick={() => router.push("/plan")}
          >
            See my step-by-step plan
          </button>
          <div style={{ marginTop: "0.85rem" }}>
            <button
              onClick={() => router.push("/coach")}
              style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
            >
              {p("ask_coach")}
            </button>
          </div>
        </div>

        {!questionnaireComplete && (
          <div style={{
            marginTop: "1.5rem",
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(139, 92, 246, 0.06))",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            borderRadius: "12px",
            textAlign: "center",
          }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{p("want_detailed")}</h3>
            <p className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "1rem", lineHeight: 1.6 }}>
              {p("partial_data_text")}
            </p>
            <button
              className="btn btn-outline"
              style={{ padding: "0.6rem 1.5rem", fontSize: "0.9rem", borderColor: "var(--primary)", color: "var(--primary)" }}
              onClick={() => router.push("/questionnaire")}
            >
              {p("continue_questionnaire")}
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
    </div>
  );
}

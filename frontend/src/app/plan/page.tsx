"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  getActionPlan,
  generateActionPlan,
  updateActionStep,
  ActionPlan,
  ActionStepData,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";

const STATUS_COLORS: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#eab308",
  done: "#22c55e",
  skipped: "#475569",
};

function nextStatus(current: string): string {
  if (current === "todo") return "in_progress";
  if (current === "in_progress") return "done";
  return current;
}

export default function PlanPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const p = (key: string) => t("pages.plan." + key);
  const STATUS_LABELS: Record<string, string> = {
    todo: p("status_todo"),
    in_progress: p("status_in_progress"),
    done: p("status_done"),
    skipped: p("status_skipped"),
  };
  const CATEGORY_LABELS: Record<string, string> = {
    this_week: p("cat_this_week"),
    first_step: p("cat_first_step"),
    credential: p("cat_credential"),
  };
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        await getMe();
        const data = await getActionPlan();
        if (data.total > 0) setPlan(data);
      } catch {
        // No plan yet — that's fine
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const data = await generateActionPlan();
      setPlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate action plan");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(step: ActionStepData) {
    const newStatus = nextStatus(step.status);
    try {
      const updated = await updateActionStep(step.id, { status: newStatus });
      setPlan((prev) => {
        if (!prev) return prev;
        const steps = prev.steps.map((s) => (s.id === step.id ? updated : s));
        return {
          ...prev,
          steps,
          done: steps.filter((s) => s.status === "done").length,
          in_progress: steps.filter((s) => s.status === "in_progress").length,
          skipped: steps.filter((s) => s.status === "skipped").length,
        };
      });
    } catch {
      setError("Failed to update step");
    }
  }

  async function handleSkip(step: ActionStepData) {
    try {
      const updated = await updateActionStep(step.id, { status: "skipped" });
      setPlan((prev) => {
        if (!prev) return prev;
        const steps = prev.steps.map((s) => (s.id === step.id ? updated : s));
        return {
          ...prev,
          steps,
          done: steps.filter((s) => s.status === "done").length,
          in_progress: steps.filter((s) => s.status === "in_progress").length,
          skipped: steps.filter((s) => s.status === "skipped").length,
        };
      });
    } catch {
      setError("Failed to skip step");
    }
  }

  async function handleUnskip(step: ActionStepData) {
    try {
      const updated = await updateActionStep(step.id, { status: "todo" });
      setPlan((prev) => {
        if (!prev) return prev;
        const steps = prev.steps.map((s) => (s.id === step.id ? updated : s));
        return {
          ...prev,
          steps,
          done: steps.filter((s) => s.status === "done").length,
          in_progress: steps.filter((s) => s.status === "in_progress").length,
          skipped: steps.filter((s) => s.status === "skipped").length,
        };
      });
    } catch {}
  }

  function toggleNotes(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <AppHeader />
        <div style={styles.center}><FlowerSpinner size={48} /></div>
      </div>
    );
  }

  // No plan yet — show generate CTA
  if (!plan) {
    return (
      <div style={styles.page}>
        <AppHeader />
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>{p("title")}</h1>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem", maxWidth: "500px", lineHeight: 1.6 }}>
              {error ? error : p("generate_desc")}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{ ...styles.primaryBtn, opacity: generating ? 0.6 : 1 }}
            >
              {generating ? p("generating") : p("generate")}
            </button>
            {generating && (
              <div style={{ marginTop: "1rem" }}>
                <FlowerSpinner size={32} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Group steps by category
  const grouped: Record<string, ActionStepData[]> = {};
  for (const step of plan.steps) {
    if (filter !== "all" && step.status !== filter) continue;
    const key = step.category;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(step);
  }

  const progressPct = plan.total > 0 ? Math.round((plan.done / plan.total) * 100) : 0;
  const activePct = plan.total > 0 ? Math.round(((plan.done + plan.in_progress) / plan.total) * 100) : 0;

  return (
    <div style={styles.page}>
      <AppHeader />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{p("title")}</h1>
            <p style={styles.subtitle}>
              {t("pages.plan.completed_of", { done: String(plan.done), total: String(plan.total) })}
              {plan.in_progress > 0 && ` · ${plan.in_progress} ${p("status_in_progress").toLowerCase()}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/coach")} style={styles.headerBtn}>
              {p("ask_coach")}
            </button>
            <button onClick={handleGenerate} disabled={generating} style={styles.headerBtn}>
              {generating ? "..." : p("regenerate")}
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => setError("")} style={styles.errorDismiss}>{t("ui.dismiss")}</button>
          </div>
        )}

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progressPct}%`, background: "#22c55e" }} />
            <div style={{ ...styles.progressFill, width: `${activePct - progressPct}%`, background: "#eab308", left: `${progressPct}%` }} />
          </div>
          <div style={styles.progressStats}>
            <span style={{ color: "#22c55e", fontWeight: 600 }}>{t("pages.plan.percent_complete", { pct: String(progressPct) })}</span>
            <div style={{ display: "flex", gap: "1rem" }}>
              {(["all", "todo", "in_progress", "done", "skipped"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    ...styles.filterBtn,
                    color: filter === f ? "#f1f5f9" : "#64748b",
                    borderColor: filter === f ? "#475569" : "transparent",
                  }}
                >
                  {f === "all" ? p("filter_all") : STATUS_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Steps by category */}
        {(["this_week", "first_step", "credential"] as const).map((cat) => {
          const catSteps = grouped[cat];
          if (!catSteps || catSteps.length === 0) return null;

          // Sub-group first_step by pathway
          const subGroups: { label: string | null; steps: ActionStepData[] }[] = [];
          if (cat === "first_step") {
            const byPathway: Record<string, ActionStepData[]> = {};
            for (const s of catSteps) {
              const key = s.pathway_name || "General";
              if (!byPathway[key]) byPathway[key] = [];
              byPathway[key].push(s);
            }
            for (const [label, steps] of Object.entries(byPathway)) {
              subGroups.push({ label, steps });
            }
          } else {
            subGroups.push({ label: null, steps: catSteps });
          }

          return (
            <div key={cat} style={styles.categorySection}>
              <h2 style={styles.categoryTitle}>{CATEGORY_LABELS[cat]}</h2>

              {subGroups.map((group, gi) => (
                <div key={gi}>
                  {group.label && cat === "first_step" && (
                    <h3 style={styles.pathwayLabel}>{group.label}</h3>
                  )}
                  <div style={styles.stepsList}>
                    {group.steps.map((step) => (
                      <div
                        key={step.id}
                        style={{
                          ...styles.stepCard,
                          borderLeftColor: STATUS_COLORS[step.status],
                          opacity: step.status === "skipped" ? 0.5 : 1,
                        }}
                      >
                        <div style={styles.stepHeader}>
                          {step.status !== "done" && step.status !== "skipped" ? (
                            <button
                              onClick={() => handleStatusChange(step)}
                              style={{
                                ...styles.statusBtn,
                                borderColor: STATUS_COLORS[step.status],
                                background: step.status === "in_progress" ? "rgba(234,179,8,0.15)" : "transparent",
                              }}
                              aria-label={`Mark as ${STATUS_LABELS[nextStatus(step.status)]}`}
                            />
                          ) : (
                            <button
                              style={{
                                ...styles.statusBtn,
                                borderColor: STATUS_COLORS[step.status],
                                background: step.status === "done" ? "#22c55e" : "#334155",
                                cursor: "pointer",
                              }}
                              onClick={() => step.status === "skipped" ? handleUnskip(step) : handleUnskip(step)}
                              aria-label={step.status === "done" ? "Mark as not done" : "Restore step"}
                            >
                              {step.status === "done" && <span style={{ color: "#fff", fontSize: "0.7rem" }}>✓</span>}
                            </button>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              ...styles.stepTitle,
                              textDecoration: step.status === "done" ? "line-through" : "none",
                              color: step.status === "done" ? "#64748b" : "#e2e8f0",
                            }}>
                              {step.title}
                            </div>
                            {step.description && (
                              <div style={styles.stepDesc}>{step.description}</div>
                            )}
                            {step.duration && (
                              <span style={styles.stepDuration}>{step.duration}</span>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                            {step.url && (
                              <a
                                href={step.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.linkBtn}
                                aria-label={`Open ${step.title}`}
                              >
                                ↗
                              </a>
                            )}
                            <button onClick={() => toggleNotes(step.id)} style={styles.notesToggle}>
                              {step.notes ? "✎" : "+"}
                            </button>
                            {step.status !== "done" && step.status !== "skipped" && (
                              <button onClick={() => handleSkip(step)} style={styles.skipBtn}>
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {expandedNotes.has(step.id) && (
                          <div style={styles.notesArea}>
                            <textarea
                              defaultValue={step.notes || ""}
                              placeholder={p("add_notes")}
                              style={styles.notesInput}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val !== (step.notes || "")) {
                                  try {
                                    const updated = await updateActionStep(step.id, { notes: val || undefined });
                                    setPlan((prev) => {
                                      if (!prev) return prev;
                                      return { ...prev, steps: prev.steps.map((s) => (s.id === step.id ? updated : s)) };
                                    });
                                  } catch {}
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" },
  container: { maxWidth: "900px", margin: "0 auto", padding: "0 1rem 3rem" },
  emptyState: { textAlign: "center", paddingTop: "4rem" },
  primaryBtn: {
    background: "#2563eb", border: "none", color: "white",
    padding: "0.75rem 2rem", borderRadius: "10px", cursor: "pointer",
    fontSize: "1rem", fontWeight: 600,
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "1.5rem 0 1rem", flexWrap: "wrap", gap: "0.75rem",
  },
  title: { fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" },
  subtitle: { color: "#94a3b8", fontSize: "0.9rem" },
  headerBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid #334155",
    color: "#94a3b8", padding: "0.4rem 0.9rem", borderRadius: "8px",
    cursor: "pointer", fontSize: "0.82rem",
  },
  errorBanner: {
    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "8px", padding: "0.6rem 1rem", marginBottom: "0.75rem",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    color: "#fca5a5", fontSize: "0.85rem",
  },
  errorDismiss: { background: "none", border: "none", color: "#fca5a5", cursor: "pointer", textDecoration: "underline", fontSize: "0.82rem" },
  // Progress
  progressContainer: { marginBottom: "1.5rem" },
  progressBar: {
    height: "8px", background: "#1e293b", borderRadius: "4px",
    overflow: "hidden", position: "relative",
  },
  progressFill: {
    height: "100%", borderRadius: "4px",
    position: "absolute", top: 0, transition: "width 0.3s",
  },
  progressStats: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: "0.5rem", fontSize: "0.82rem", flexWrap: "wrap", gap: "0.5rem",
  },
  filterBtn: {
    background: "none", border: "1px solid transparent", color: "#64748b",
    cursor: "pointer", fontSize: "0.78rem", padding: "0.2rem 0.5rem",
    borderRadius: "6px",
  },
  // Categories
  categorySection: { marginBottom: "2rem" },
  categoryTitle: {
    fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem",
    paddingBottom: "0.5rem", borderBottom: "1px solid #1e293b",
  },
  pathwayLabel: {
    fontSize: "0.88rem", fontWeight: 500, color: "#94a3b8",
    marginTop: "1rem", marginBottom: "0.5rem",
  },
  stepsList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  // Step card
  stepCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b",
    borderLeft: "3px solid #64748b", borderRadius: "8px",
    padding: "0.75rem 1rem", transition: "border-color 0.15s",
  },
  stepHeader: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  statusBtn: {
    width: "22px", height: "22px", minWidth: "22px", borderRadius: "6px",
    border: "2px solid #475569", background: "transparent",
    cursor: "pointer", marginTop: "1px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  stepTitle: { fontSize: "0.9rem", lineHeight: 1.5, wordBreak: "break-word" },
  stepDesc: { fontSize: "0.8rem", color: "#64748b", marginTop: "2px" },
  stepDuration: {
    fontSize: "0.75rem", color: "#475569", background: "rgba(255,255,255,0.04)",
    padding: "0.15rem 0.5rem", borderRadius: "4px", display: "inline-block", marginTop: "4px",
  },
  linkBtn: {
    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
    color: "#60a5fa", width: "28px", height: "28px", borderRadius: "6px",
    display: "flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none", fontSize: "0.85rem", cursor: "pointer",
  },
  notesToggle: {
    background: "rgba(255,255,255,0.04)", border: "1px solid #334155",
    color: "#94a3b8", width: "28px", height: "28px", borderRadius: "6px",
    cursor: "pointer", fontSize: "0.85rem",
  },
  skipBtn: {
    background: "none", border: "1px solid #334155",
    color: "#475569", width: "28px", height: "28px", borderRadius: "6px",
    cursor: "pointer", fontSize: "1rem",
  },
  notesArea: { marginTop: "0.5rem", marginLeft: "2.25rem" },
  notesInput: {
    width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid #334155",
    borderRadius: "8px", padding: "0.5rem 0.75rem", color: "#e2e8f0",
    fontSize: "0.82rem", resize: "vertical", minHeight: "60px",
    outline: "none", fontFamily: "inherit",
  },
};

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSummary, getCareerReport, getProgress } from "@/lib/api";
import FlowerSpinner from "@/components/FlowerSpinner";

interface UserState {
  fullName: string | null;
  role: string;
  questionnaireCompleted: boolean;
  tier1Complete: boolean;
  tier2Complete: boolean;
  progressPct: number;
  hasSummary: boolean;
  hasAnalysis: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [me, progress] = await Promise.all([getMe(), getProgress()]);

        // Load summary and analysis checks in parallel
        const [summaryResult, analysisResult] = await Promise.allSettled([
          getSummary(),
          getCareerReport(),
        ]);

        setUser({
          fullName: me.full_name,
          role: me.role,
          questionnaireCompleted: me.questionnaire_completed,
          tier1Complete: progress.tier1_complete,
          tier2Complete: progress.tier2_complete,
          progressPct: progress.progress_pct,
          hasSummary: summaryResult.status === "fulfilled",
          hasAnalysis: analysisResult.status === "fulfilled",
        });
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading || !user) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <FlowerSpinner size={48} />
        </div>
      </div>
    );
  }

  const greeting = user.fullName
    ? (user.progressPct > 0 ? `Welcome back, ${user.fullName.split(" ")[0]}` : `Welcome, ${user.fullName.split(" ")[0]}`)
    : (user.progressPct > 0 ? "Welcome back" : "Welcome");

  const qStatus = user.questionnaireCompleted ? "Completed"
    : user.tier2Complete ? "Tier 2 done"
    : user.tier1Complete ? "Tier 1 done"
    : user.progressPct > 0 ? "In Progress" : "Not Started";

  const cards = [
    {
      id: "questionnaire",
      title: "Questionnaire",
      description: user.questionnaireCompleted
        ? "You've completed all modules. Review or update your answers."
        : user.tier2Complete
        ? `${Math.round(user.progressPct)}% complete. You can personalise your report with the optional deep-dive.`
        : user.tier1Complete
        ? `${Math.round(user.progressPct)}% complete. Answer ~20 more questions to unlock full career analysis.`
        : "Answer a few quick questions to discover your best career pathways.",
      cta: user.questionnaireCompleted ? "Review Answers" : user.progressPct > 0 ? "Continue Questionnaire" : "Start Questionnaire",
      enabled: true,
      href: user.tier1Complete && !user.tier2Complete ? "/questionnaire?start=tier2" : "/questionnaire",
      accent: "#3b82f6",
      step: "STEP 1",
      status: qStatus,
      statusColor: user.questionnaireCompleted ? "#22c55e" : user.progressPct > 0 ? "#f59e0b" : "#64748b",
    },
    {
      id: "summary",
      title: "Profile Report",
      description: user.hasSummary
        ? "Your personal narrative summary is ready."
        : user.tier1Complete
        ? "Your profile summary is ready to generate."
        : "Complete the quick assessment to unlock your profile summary.",
      cta: user.hasSummary ? "View Profile Report" : user.tier1Complete ? "Generate Profile Report" : "Locked",
      enabled: user.hasSummary || user.tier1Complete,
      href: "/summary",
      accent: "#8b5cf6",
      step: "STEP 2",
      status: user.hasSummary ? "Ready" : user.tier1Complete ? "Ready to Generate" : "Locked",
      statusColor: user.hasSummary ? "#22c55e" : user.tier1Complete ? "#f59e0b" : "#64748b",
    },
    {
      id: "analysis",
      title: "Career Analysis",
      description: user.hasAnalysis
        ? "Your full career analysis is ready — ranked pathways, salary data, credentials, and a transition plan."
        : user.tier2Complete
        ? "Your career analysis is ready to generate — pathway rankings, salary benchmarks, and a transition plan."
        : "Complete the questionnaire (Stages 1 & 2) to unlock your full AI-powered career analysis.",
      cta: user.hasAnalysis ? "View Career Analysis" : user.tier2Complete ? "Generate Analysis" : "Locked",
      enabled: user.hasAnalysis || user.tier2Complete,
      href: "/results",
      accent: "#2563eb",
      step: "YOUR GOAL",
      status: user.hasAnalysis ? "Ready" : user.tier2Complete ? "Ready to Generate" : "Locked",
      statusColor: user.hasAnalysis ? "#22c55e" : user.tier2Complete ? "#f59e0b" : "#64748b",
      featured: true,
    },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <nav style={styles.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/logo.svg" alt="CareerDev" width={36} height={36} />
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>CareerDev</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}>
            Home
          </a>
          {(user.role === "admin" || user.role === "auditor") && (
            <button
              style={{ ...styles.logoutBtn, borderColor: "#f59e0b", color: "#fbbf24" }}
              onClick={() => router.push("/admin")}
            >
              Admin Panel
            </button>
          )}
          {user.role === "advisor" && (
            <button
              style={{ ...styles.logoutBtn, borderColor: "#3b82f6", color: "#60a5fa" }}
              onClick={() => router.push("/advisor")}
            >
              Advisor Dashboard
            </button>
          )}
          <button
            style={styles.logoutBtn}
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("admin_token");
              localStorage.removeItem("impersonating");
              router.push("/");
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={styles.container}>
        <div style={styles.heroSection}>
          <h1 style={styles.greeting}>{greeting}</h1>
          <p style={styles.subtitle}>
            {user.progressPct > 0 ? "Your career journey at a glance. Pick up where you left off." : "Your career transition starts here."}
          </p>
        </div>

        <div style={styles.grid}>
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => card.enabled && router.push(card.href)}
              disabled={!card.enabled}
              style={{
                ...styles.card,
                ...(card.featured ? styles.featuredCard : {}),
                ...(card.enabled ? {} : styles.disabledCard),
                cursor: card.enabled ? "pointer" : "not-allowed",
              }}
            >
              {/* Step label & status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: card.featured ? "#60a5fa" : card.accent,
                }}>
                  {card.step}
                </span>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "20px",
                  background: `${card.statusColor}18`,
                  color: card.statusColor,
                }}>
                  {card.status}
                </span>
              </div>

              {/* Title */}
              <h2 style={{
                fontSize: card.featured ? "1.35rem" : "1.15rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                color: card.enabled ? "#f1f5f9" : "#475569",
              }}>
                {card.title}
              </h2>

              {/* Description */}
              <p style={{
                fontSize: "0.88rem",
                color: card.enabled ? "#94a3b8" : "#334155",
                lineHeight: 1.6,
                marginBottom: "1.25rem",
                flex: 1,
              }}>
                {card.description}
              </p>

              {/* CTA */}
              <div style={{
                display: "inline-block",
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.88rem",
                fontWeight: 600,
                ...(card.featured && card.enabled
                  ? { background: "#2563eb", color: "white" }
                  : card.enabled
                    ? { background: "rgba(255,255,255,0.06)", color: "#f1f5f9", border: "1px solid #334155" }
                    : { background: "rgba(255,255,255,0.02)", color: "#475569", border: "1px solid #1e293b" }
                ),
              }}>
                {card.cta}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#0a0e1a",
    color: "#f1f5f9",
    minHeight: "100vh",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
  },
  muted: { color: "#64748b" },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #334155",
    color: "#f1f5f9",
    padding: "0.4rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 1rem 3rem",
  },
  heroSection: {
    textAlign: "center",
    padding: "2.5rem 0 2rem",
  },
  greeting: {
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
    fontWeight: 700,
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "1.05rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "1.5rem",
    textAlign: "left" as const,
    display: "flex",
    flexDirection: "column" as const,
    transition: "border-color 0.15s, transform 0.15s",
  },
  featuredCard: {
    background: "linear-gradient(160deg, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.03) 100%)",
    border: "1.5px solid rgba(37,99,235,0.5)",
    gridColumn: "1 / -1",
  },
  disabledCard: {
    opacity: 0.55,
  },
};

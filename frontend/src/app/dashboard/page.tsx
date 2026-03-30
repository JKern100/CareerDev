"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSummary, getCareerReport, getProgress } from "@/lib/api";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";

interface UserState {
  fullName: string | null;
  role: string;
  questionnaireCompleted: boolean;
  tier1Complete: boolean;
  tier2Complete: boolean;
  tier3Complete: boolean;
  progressPct: number;
  hasSummary: boolean;
  hasAnalysis: boolean;
  isPremium: boolean;
  plan: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
          tier3Complete: progress.tier3_complete,
          progressPct: progress.progress_pct,
          hasSummary: summaryResult.status === "fulfilled",
          hasAnalysis: analysisResult.status === "fulfilled",
          isPremium: me.is_premium,
          plan: me.plan,
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

  const d = (key: string) => t(`pages.dashboard.${key}`);
  const firstName = user.fullName?.split(" ")[0] || "";
  const greeting = user.progressPct > 0
    ? d("welcome_back").replace("{name}", firstName || "")
    : d("welcome").replace("{name}", firstName || "");

  const qStatus = user.tier3Complete || user.questionnaireCompleted ? d("all_stages_complete")
    : user.tier2Complete ? d("stage2_complete")
    : user.tier1Complete ? d("stage1_complete")
    : user.progressPct > 0 ? d("in_progress") : d("not_started");

  const pro = user.isPremium;

  const cards = [
    {
      id: "questionnaire",
      title: d("questionnaire"),
      description: user.tier3Complete || user.questionnaireCompleted
        ? d("q_all_done")
        : user.tier2Complete
        ? pro ? d("q_t2_done_pro") : d("q_t2_done_free")
        : user.tier1Complete
        ? pro ? d("q_t1_done_pro") : d("q_t1_done_free")
        : d("q_not_started"),
      cta: user.tier3Complete || user.questionnaireCompleted
        ? d("q_cta_review")
        : user.tier1Complete && !pro
        ? d("q_cta_upgrade")
        : user.progressPct > 0 ? d("q_cta_continue") : d("q_cta_start"),
      enabled: true,
      href: user.tier1Complete && !pro
        ? "/pricing"
        : user.tier1Complete && !user.tier2Complete ? "/questionnaire?start=tier2" : "/questionnaire",
      accent: "#3b82f6",
      step: d("step1"),
      status: qStatus,
      statusColor: user.tier3Complete || user.questionnaireCompleted ? "#22c55e" : user.progressPct > 0 ? "#f59e0b" : "#64748b",
    },
    {
      id: "summary",
      title: d("profile_report"),
      description: user.hasSummary
        ? d("summary_ready")
        : user.tier1Complete
        ? d("summary_generate")
        : d("summary_locked"),
      cta: user.hasSummary ? d("summary_cta_view") : user.tier1Complete ? d("summary_cta_gen") : d("locked"),
      enabled: user.hasSummary || user.tier1Complete,
      href: "/summary",
      accent: "#8b5cf6",
      step: d("step2"),
      status: user.hasSummary ? d("ready") : user.tier1Complete ? d("ready_to_generate") : d("locked"),
      statusColor: user.hasSummary ? "#22c55e" : user.tier1Complete ? "#f59e0b" : "#64748b",
    },
    {
      id: "analysis",
      title: d("career_analysis"),
      description: !pro
        ? d("analysis_upgrade")
        : user.hasAnalysis
        ? d("analysis_ready")
        : user.tier2Complete
        ? d("analysis_generate")
        : d("analysis_locked"),
      cta: !pro ? t("ui.upgrade_to_pro") : user.hasAnalysis ? d("analysis_cta_view") : user.tier2Complete ? d("analysis_cta_gen") : d("locked"),
      enabled: !pro ? true : (user.hasAnalysis || user.tier2Complete),
      href: !pro ? "/pricing" : "/results",
      accent: "#2563eb",
      step: d("step3"),
      status: !pro ? d("pro") : user.hasAnalysis ? d("ready") : user.tier2Complete ? d("ready_to_generate") : d("locked"),
      statusColor: !pro ? "#3b82f6" : user.hasAnalysis ? "#22c55e" : user.tier2Complete ? "#f59e0b" : "#64748b",
      featured: true,
    },
    {
      id: "plan",
      title: d("action_plan"),
      description: !pro
        ? d("plan_upgrade")
        : user.hasAnalysis
        ? d("plan_ready")
        : d("plan_locked"),
      cta: !pro ? t("ui.upgrade_to_pro") : user.hasAnalysis ? d("plan_cta_view") : d("locked"),
      enabled: !pro ? true : user.hasAnalysis,
      href: !pro ? "/pricing" : "/plan",
      accent: "#22c55e",
      step: d("step4"),
      status: !pro ? d("pro") : user.hasAnalysis ? d("available") : d("locked"),
      statusColor: !pro ? "#3b82f6" : user.hasAnalysis ? "#22c55e" : "#64748b",
    },
    {
      id: "coach",
      title: d("career_coach"),
      description: !pro ? d("coach_upgrade") : d("coach_ready"),
      cta: !pro ? t("ui.upgrade_to_pro") : d("coach_cta"),
      enabled: !pro ? true : user.tier1Complete,
      href: !pro ? "/pricing" : "/coach",
      accent: "#eab308",
      step: d("anytime"),
      status: !pro ? d("pro") : user.tier1Complete ? d("available") : d("locked"),
      statusColor: !pro ? "#3b82f6" : user.tier1Complete ? "#22c55e" : "#64748b",
    },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <nav style={styles.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/logo.svg" alt="CrewTransition" width={36} height={36} />
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span></span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}>
            {d("home")}
          </a>
          {(user.role === "admin" || user.role === "auditor") && (
            <button
              style={{ ...styles.logoutBtn, borderColor: "#f59e0b", color: "#fbbf24" }}
              onClick={() => router.push("/admin")}
            >
              {t("nav.admin_panel")}
            </button>
          )}
          {user.role === "advisor" && (
            <button
              style={{ ...styles.logoutBtn, borderColor: "#3b82f6", color: "#60a5fa" }}
              onClick={() => router.push("/advisor")}
            >
              {d("advisor_dashboard")}
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
            {t("nav.log_out")}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={styles.container}>
        <div style={styles.heroSection}>
          <h1 style={styles.greeting}>{greeting}</h1>
          <p style={styles.subtitle}>
            {user.progressPct > 0 ? d("subtitle_returning") : d("subtitle_new")}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSummary, getCareerReport } from "@/lib/api";

interface UserState {
  fullName: string | null;
  role: string;
  questionnaireCompleted: boolean;
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
        const me = await getMe();

        let hasSummary = false;
        let hasAnalysis = false;

        try {
          await getSummary();
          hasSummary = true;
        } catch {
          /* no summary yet */
        }

        try {
          await getCareerReport();
          hasAnalysis = true;
        } catch {
          /* no analysis yet */
        }

        setUser({
          fullName: me.full_name,
          role: me.role,
          questionnaireCompleted: me.questionnaire_completed,
          hasSummary,
          hasAnalysis,
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
          <p style={styles.muted}>Loading...</p>
        </div>
      </div>
    );
  }

  const greeting = user.fullName
    ? `Welcome back, ${user.fullName.split(" ")[0]}`
    : "Welcome back";

  const cards = [
    {
      id: "questionnaire",
      title: "Questionnaire",
      description: user.questionnaireCompleted
        ? "You've completed all 8 modules. Review or update your answers."
        : "Continue answering questions across 8 modules to build your career profile.",
      cta: user.questionnaireCompleted ? "Review Answers" : "Continue Questionnaire",
      enabled: true,
      href: "/questionnaire",
      accent: "#3b82f6",
      step: "STEP 1",
      status: user.questionnaireCompleted ? "Completed" : "In Progress",
      statusColor: user.questionnaireCompleted ? "#22c55e" : "#f59e0b",
    },
    {
      id: "summary",
      title: "Profile Report",
      description: user.hasSummary
        ? "Your personal narrative summary is ready. See who you are, what you bring, and what matters to you."
        : "Complete the questionnaire to unlock your AI-generated personal profile summary.",
      cta: "View Profile Report",
      enabled: user.hasSummary,
      href: "/summary",
      accent: "#8b5cf6",
      step: "STEP 2",
      status: user.hasSummary ? "Ready" : "Locked",
      statusColor: user.hasSummary ? "#22c55e" : "#64748b",
    },
    {
      id: "advisor",
      title: "Schedule with Advisor",
      description: "Book a 1-on-1 session with a career advisor to discuss your profile and explore your options.",
      cta: "Coming Soon",
      enabled: false,
      href: "/book",
      accent: "#06b6d4",
      step: "STEP 3",
      status: "Coming Soon",
      statusColor: "#64748b",
    },
    {
      id: "analysis",
      title: "Career Analysis",
      description: user.hasAnalysis
        ? "Your full career analysis is ready — ranked pathways, salary data, credentials, and a transition plan."
        : "Your AI-powered career analysis with ranked pathways, salary benchmarks, and an actionable transition plan.",
      cta: user.hasAnalysis ? "View Career Analysis" : "Generate Analysis",
      enabled: user.hasAnalysis || user.questionnaireCompleted,
      href: "/results",
      accent: "#2563eb",
      step: "YOUR GOAL",
      status: user.hasAnalysis ? "Ready" : user.questionnaireCompleted ? "Ready to Generate" : "Locked",
      statusColor: user.hasAnalysis ? "#22c55e" : user.questionnaireCompleted ? "#f59e0b" : "#64748b",
      featured: true,
    },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <nav style={styles.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={styles.logo}>CD</div>
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
            Your career journey at a glance. Pick up where you left off.
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
  logo: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.8rem",
    color: "white",
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

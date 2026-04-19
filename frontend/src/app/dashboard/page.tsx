"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe, getSummary, getCareerReport, getProgress, syncSubscription } from "@/lib/api";
import FlowerSpinner from "@/components/FlowerSpinner";
import ReferralCard from "@/components/ReferralCard";
import { useTranslation, LANGUAGES, LangCode } from "@/hooks/useTranslation";

interface UserState {
  email: string;
  fullName: string | null;
  role: string;
  emailVerified: boolean;
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
  return (
    <Suspense fallback={<div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><FlowerSpinner size={48} /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang, t } = useTranslation();
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [meInitial, progress] = await Promise.all([getMe(), getProgress()]);
        let me = meInitial;

        // If returning from payment, sync with Paddle to activate plan
        if (searchParams.get("payment") === "success" && !me.is_premium) {
          try {
            const sub = await syncSubscription();
            if (sub.is_premium) {
              me = await getMe();
              setPaymentSuccess(true);
            }
          } catch { /* continue with current state */ }
        } else if (searchParams.get("payment") === "success" && me.is_premium) {
          setPaymentSuccess(true);
        }
        const [summaryResult, analysisResult] = await Promise.allSettled([
          getSummary(),
          getCareerReport(),
        ]);

        setUser({
          email: me.email,
          fullName: me.full_name,
          role: me.role,
          emailVerified: me.email_verified,
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

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = () => setLangOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [langOpen]);

  if (loading || !user) {
    return (
      <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <FlowerSpinner size={48} />
      </div>
    );
  }

  const d = (key: string) => t(`pages.dashboard.${key}`);
  const firstName = user.fullName?.split(" ")[0] || "";
  const greeting = user.progressPct > 0
    ? d("welcome_back").replace("{name}", firstName || "")
    : d("welcome").replace("{name}", firstName || "");

  const pro = user.isPremium;

  // For legacy users who completed before new questions were added,
  // treat tiers as complete if they have the downstream outputs
  const effectiveTier1 = user.tier1Complete || user.hasSummary || user.questionnaireCompleted;
  const effectiveTier2 = user.tier2Complete || user.hasAnalysis || user.questionnaireCompleted;

  // Determine which step the user is currently on
  const currentStep = user.hasAnalysis ? 5
    : user.hasSummary && pro ? 3
    : effectiveTier1 ? 2
    : 1;

  // Progress through the journey (0–100)
  const journeyPct = user.hasAnalysis ? 100
    : user.hasSummary && effectiveTier2 ? 70
    : user.hasSummary ? 50
    : effectiveTier1 ? 30
    : Math.max(user.progressPct * 0.3, 0);

  return (
    <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem", maxWidth: "900px", margin: "0 auto",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none", color: "inherit" }}>
          <img src="/logo.svg" alt="CrewTransition" width={32} height={32} />
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span></span>
        </a>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Language selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label="Select language"
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid #334155",
                color: "#f1f5f9", padding: "0.4rem 0.75rem", borderRadius: "8px",
                cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, minWidth: "3rem",
              }}
            >
              {LANGUAGES.find((l) => l.code === lang)?.flag || "EN"}
            </button>
            {langOpen && (
              <div role="listbox" aria-label="Language options" style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0,
                background: "#1e293b", border: "1px solid #334155", borderRadius: "8px",
                overflow: "hidden", zIndex: 100, minWidth: "140px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={lang === l.code}
                    onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                    style={{
                      display: "block", width: "100%", padding: "0.5rem 0.75rem",
                      background: lang === l.code ? "rgba(59,130,246,0.15)" : "transparent",
                      border: "none", color: lang === l.code ? "#60a5fa" : "#e2e8f0",
                      fontSize: "0.85rem", cursor: "pointer", textAlign: "start",
                    }}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(user.role === "admin" || user.role === "auditor") && (
            <button onClick={() => router.push("/admin")} style={navBtn("#f59e0b", "#fbbf24")}>
              {t("nav.admin_panel")}
            </button>
          )}
          {user.role === "advisor" && (
            <button onClick={() => router.push("/advisor")} style={navBtn("#3b82f6", "#60a5fa")}>
              {d("advisor_dashboard")}
            </button>
          )}
          <button onClick={() => router.push("/pricing")} style={navBtn("#6366f1", "#818cf8")}>
            {pro ? "Manage Subscription" : "Upgrade"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("admin_token");
              localStorage.removeItem("impersonating");
              router.push("/");
            }}
            style={navBtn("#334155", "#f1f5f9")}
          >
            {t("nav.log_out")}
          </button>
        </div>
      </nav>

      {/* Payment success banner */}
      {paymentSuccess && (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1rem" }}>
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "10px", padding: "0.75rem 1rem", display: "flex",
            alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem",
            marginBottom: "0.5rem",
          }}>
            <span style={{ color: "#4ade80" }}>
              Payment successful! Your Pro plan is now active.
            </span>
            <button onClick={() => setPaymentSuccess(false)} style={{
              background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1rem",
            }}>&times;</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1rem 3rem" }}>
        {/* Greeting */}
        <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, marginBottom: "0.5rem" }}>
            {greeting}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
            {user.progressPct > 0 ? d("subtitle_returning") : d("subtitle_new")}
          </p>
          {pro && (
            <span style={{
              display: "inline-block", marginTop: "0.5rem",
              padding: "3px 12px", borderRadius: "999px",
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8", fontSize: "0.75rem", fontWeight: 700,
              letterSpacing: "0.05em",
            }}>
              PRO
            </span>
          )}
        </div>

        {/* Journey progress bar */}
        <div style={{ margin: "0 auto 2.5rem", maxWidth: "600px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "0.5rem", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600,
          }}>
            <span>{d("step1")}</span>
            <span>{d("step2")}</span>
            <span>{d("step3")}</span>
            <span>{d("step4")}</span>
          </div>
          <div style={{
            height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${journeyPct}%`,
              background: "linear-gradient(90deg, #3b82f6, #2563eb)",
              borderRadius: "3px", transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Step 1 & 2 — side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          {/* Step 1: Questionnaire */}
          <StepCard
            step={d("step1")}
            title={d("questionnaire")}
            description={
              user.tier3Complete || user.questionnaireCompleted ? d("q_all_done")
              : effectiveTier2 ? (pro ? d("q_t2_done_pro") : d("q_t2_done_free"))
              : effectiveTier1 ? (pro ? d("q_t1_done_pro") : d("q_t1_done_free"))
              : d("q_not_started")
            }
            cta={
              user.tier3Complete || user.questionnaireCompleted ? d("q_cta_review")
              : effectiveTier1 && !pro ? d("q_cta_upgrade")
              : user.progressPct > 0 ? d("q_cta_continue") : d("q_cta_start")
            }
            done={effectiveTier1}
            partial={effectiveTier1 && !user.tier3Complete && !user.questionnaireCompleted}
            active={currentStep === 1}
            locked={false}
            accent="#3b82f6"
            onClick={() => router.push(
              effectiveTier1 && !pro ? "/pricing"
              : effectiveTier1 && !effectiveTier2 ? "/questionnaire"
              : "/questionnaire"
            )}
          />

          {/* Step 2: Profile Report */}
          <StepCard
            step={d("step2")}
            title={d("profile_report")}
            description={
              user.hasSummary ? d("summary_ready")
              : effectiveTier1 ? d("summary_generate")
              : d("summary_locked")
            }
            cta={user.hasSummary ? d("summary_cta_view") : effectiveTier1 ? d("summary_cta_gen") : d("q_cta_start")}
            done={user.hasSummary}
            active={currentStep === 2}
            locked={!effectiveTier1 && !user.hasSummary}
            accent="#8b5cf6"
            onClick={() => router.push(
              user.hasSummary || effectiveTier1 ? "/summary" : "/questionnaire"
            )}
          />
        </div>

        {/* Step 3: Career Analysis — featured */}
        <div style={{ marginBottom: "1rem" }}>
          <StepCard
            step={d("step3")}
            title={d("career_analysis")}
            description={
              !pro ? d("analysis_upgrade")
              : user.hasAnalysis ? d("analysis_ready")
              : effectiveTier2 ? d("analysis_generate")
              : d("analysis_locked")
            }
            cta={!pro ? t("ui.upgrade_to_pro") : user.hasAnalysis ? d("analysis_cta_view") : effectiveTier2 ? d("analysis_cta_gen") : "Complete Stage 2 first"}
            done={user.hasAnalysis}
            active={currentStep === 3}
            locked={pro ? (!effectiveTier2 && !user.hasAnalysis) : false}
            accent="#2563eb"
            featured
            proTag={!pro}
            onClick={() => router.push(!pro ? "/pricing" : effectiveTier2 || user.hasAnalysis ? "/results" : "/questionnaire")}
          />
        </div>

        {/* Step 4 & Coach — side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {/* Step 4: Action Plan */}
          <StepCard
            step={d("step4")}
            title={d("action_plan")}
            description={!pro ? d("plan_upgrade") : user.hasAnalysis ? d("plan_ready") : d("plan_locked")}
            cta={!pro ? t("ui.upgrade_to_pro") : user.hasAnalysis ? d("plan_cta_view") : "Complete Career Analysis first"}
            done={false}
            active={currentStep >= 4 && pro && user.hasAnalysis}
            locked={pro ? !user.hasAnalysis : false}
            accent="#22c55e"
            proTag={!pro}
            onClick={() => router.push(!pro ? "/pricing" : user.hasAnalysis ? "/plan" : "/results")}
          />

          {/* Anytime: Career Coach */}
          <StepCard
            step={d("anytime")}
            title={d("career_coach")}
            description={!pro ? d("coach_upgrade") : d("coach_ready")}
            cta={!pro ? t("ui.upgrade_to_pro") : effectiveTier1 ? d("coach_cta") : "Complete Stage 1 first"}
            done={false}
            active={pro && effectiveTier1}
            locked={pro ? !effectiveTier1 : false}
            accent="#eab308"
            proTag={!pro}
            onClick={() => router.push(!pro ? "/pricing" : effectiveTier1 ? "/coach" : "/questionnaire")}
          />
        </div>

        {/* Referral card */}
        <ReferralCard />
      </div>
    </div>
  );
}

/* Reusable step card component */
function StepCard({ step, title, description, cta, done, partial, active, locked, accent, featured, proTag, onClick }: {
  step: string;
  title: string;
  description: string;
  cta: string;
  done: boolean;
  partial?: boolean;
  active: boolean;
  locked: boolean;
  accent: string;
  featured?: boolean;
  proTag?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => onClick()}
      style={{
        background: featured
          ? "linear-gradient(160deg, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.03) 100%)"
          : done && !partial
          ? "rgba(34,197,94,0.04)"
          : "rgba(255,255,255,0.03)",
        border: featured
          ? "1.5px solid rgba(37,99,235,0.4)"
          : active
          ? `1.5px solid ${accent}55`
          : done && !partial
          ? "1.5px solid rgba(34,197,94,0.25)"
          : "1px solid #1e293b",
        borderRadius: "14px",
        padding: "1.5rem",
        textAlign: "start" as const,
        display: "flex",
        flexDirection: "column" as const,
        cursor: "pointer",
        opacity: locked && !proTag ? 0.6 : 1,
        transition: "border-color 0.15s, transform 0.15s",
        width: "100%",
        color: "inherit",
        font: "inherit",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: accent }}>
          {step}
        </span>
        <span style={{
          fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "20px",
          background: done && !partial ? "rgba(34,197,94,0.15)" : partial ? "rgba(59,130,246,0.15)" : proTag ? "rgba(59,130,246,0.15)" : active ? `${accent}18` : "rgba(100,116,139,0.15)",
          color: done && !partial ? "#22c55e" : partial ? "#3b82f6" : proTag ? "#3b82f6" : active ? accent : "#94a3b8",
        }}>
          {done && !partial ? "\u2713" : partial ? "In Progress" : proTag ? "Pro" : active ? "\u2022 Active" : locked ? "\uD83D\uDD12" : "\u2014"}
        </span>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: featured ? "1.3rem" : "1.1rem",
        fontWeight: 700, marginBottom: "0.5rem",
        color: locked && !proTag ? "#475569" : "#f1f5f9",
      }}>
        {title}
      </h2>

      {/* Description */}
      <p style={{
        fontSize: "0.88rem", color: locked && !proTag ? "#334155" : "#94a3b8",
        lineHeight: 1.6, marginBottom: "1.25rem", flex: 1,
      }}>
        {description}
      </p>

      {/* CTA */}
      <div style={{
        display: "inline-block", padding: "0.55rem 1.25rem", borderRadius: "8px",
        fontSize: "0.88rem", fontWeight: 600,
        ...(featured && !locked
          ? { background: "#2563eb", color: "white" }
          : proTag
            ? { background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)" }
            : !locked
              ? { background: "rgba(255,255,255,0.06)", color: "#f1f5f9", border: "1px solid #334155" }
              : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #1e293b" }),
      }}>
        {cta}
      </div>
    </button>
  );
}

function navBtn(borderColor: string, textColor: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${borderColor}`,
    color: textColor,
    padding: "0.4rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
  };
}

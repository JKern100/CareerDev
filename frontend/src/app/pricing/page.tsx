"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, createCheckout } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with your career assessment",
    features: [
      "Career questionnaire (Tier 1 & 2)",
      "Profile summary report",
      "Basic career analysis",
    ],
    cta: "Current Plan",
    disabled: true,
    accent: "#64748b",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$29",
    period: "one-time",
    description: "Full analysis with actionable next steps",
    features: [
      "Everything in Free",
      "AI Career Coach (unlimited)",
      "Structured Action Plan with tracking",
      "Credential recommendations with links",
      "Priority report generation",
    ],
    cta: "Get Pro",
    disabled: false,
    accent: "#3b82f6",
    popular: true,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "$49",
    period: "one-time",
    description: "Complete career transition package",
    features: [
      "Everything in Pro",
      "Report regeneration (unlimited)",
      "1-on-1 advisor session (45 min)",
      "Resume review by AI Coach",
      "Priority support",
    ],
    cta: "Get Premium",
    disabled: false,
    accent: "#8b5cf6",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    getMe()
      .then((me) => {
        setLoggedIn(true);
        setCurrentPlan(me.plan);
        setIsPremium(me.is_premium);
      })
      .catch(() => {});
  }, []);

  async function handleCheckout(plan: "pro" | "premium" | "monthly") {
    if (!loggedIn) {
      router.push("/register");
      return;
    }
    setLoading(plan);
    try {
      const { checkout_url } = await createCheckout(plan);
      window.location.href = checkout_url;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={styles.page}>
      {loggedIn && <AppHeader />}
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Choose Your Plan</h1>
          <p style={styles.subtitle}>
            Start free. Upgrade when you're ready to take action on your career transition.
          </p>
        </div>

        <div style={styles.grid}>
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isUpgrade = !isCurrent && isPremium && plan.id === "free";

            return (
              <div
                key={plan.id}
                style={{
                  ...styles.card,
                  ...(plan.popular ? styles.popularCard : {}),
                  borderColor: plan.popular ? plan.accent : "#1e293b",
                }}
              >
                {plan.popular && <div style={styles.popularBadge}>Most Popular</div>}

                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  {plan.name}
                </h2>
                <div style={styles.priceRow}>
                  <span style={{ fontSize: "2rem", fontWeight: 800 }}>{plan.price}</span>
                  {plan.period && (
                    <span style={{ color: "#64748b", fontSize: "0.9rem", marginLeft: "0.25rem" }}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  {plan.description}
                </p>

                <ul style={styles.featureList}>
                  {plan.features.map((f) => (
                    <li key={f} style={styles.featureItem}>
                      <span style={{ color: plan.accent, marginRight: "0.5rem" }}>+</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (plan.id !== "free" && !isCurrent) {
                      handleCheckout(plan.id);
                    }
                  }}
                  disabled={plan.disabled || isCurrent || loading !== null}
                  style={{
                    ...styles.ctaBtn,
                    background: plan.popular ? plan.accent : "rgba(255,255,255,0.06)",
                    color: plan.popular ? "white" : "#e2e8f0",
                    border: plan.popular ? "none" : "1px solid #334155",
                    opacity: plan.disabled || isCurrent || loading !== null ? 0.5 : 1,
                    cursor: plan.disabled || isCurrent ? "default" : "pointer",
                  }}
                >
                  {loading === plan.id ? "Redirecting..." : isCurrent ? "Current Plan" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Monthly option */}
        <div style={styles.monthlySection}>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Prefer monthly payments?
          </p>
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={isPremium || loading !== null}
            style={{
              ...styles.monthlyBtn,
              opacity: isPremium ? 0.5 : 1,
              cursor: isPremium ? "default" : "pointer",
            }}
          >
            {isPremium ? "You already have a plan" : "$15/month — Cancel anytime"}
          </button>
          <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.5rem" }}>
            Includes everything in Pro. Billed monthly via LemonSqueezy.
          </p>
        </div>

        {/* Trust signals */}
        <div style={styles.trustSection}>
          <div style={styles.trustItem}>
            <strong>Secure Payment</strong>
            <span>Processed by LemonSqueezy. We never see your card details.</span>
          </div>
          <div style={styles.trustItem}>
            <strong>Instant Access</strong>
            <span>Features unlock immediately after payment.</span>
          </div>
          <div style={styles.trustItem}>
            <strong>UAE Friendly</strong>
            <span>Accepts all major credit cards. No local trade license needed.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" },
  container: { maxWidth: "1000px", margin: "0 auto", padding: "0 1rem 4rem" },
  hero: { textAlign: "center", padding: "2.5rem 0 2rem" },
  title: { fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, marginBottom: "0.5rem" },
  subtitle: { color: "#94a3b8", fontSize: "1.05rem", maxWidth: "500px", margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1.5px solid #1e293b",
    borderRadius: "16px",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  popularCard: {
    background: "linear-gradient(160deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)",
  },
  popularBadge: {
    position: "absolute",
    top: "-12px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#3b82f6",
    color: "white",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "0.25rem 0.9rem",
    borderRadius: "20px",
    whiteSpace: "nowrap",
  },
  priceRow: { display: "flex", alignItems: "baseline", marginBottom: "0.5rem" },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 1.5rem",
    flex: 1,
  },
  featureItem: {
    fontSize: "0.85rem",
    color: "#cbd5e1",
    padding: "0.35rem 0",
    lineHeight: 1.4,
  },
  ctaBtn: {
    width: "100%",
    padding: "0.7rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "opacity 0.15s",
  },
  monthlySection: {
    textAlign: "center",
    padding: "1.5rem",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    marginBottom: "2rem",
  },
  monthlyBtn: {
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    color: "#facc15",
    padding: "0.6rem 2rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  trustSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    textAlign: "center",
  },
  trustItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    fontSize: "0.82rem",
    color: "#64748b",
  },
};

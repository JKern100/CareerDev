"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, createCheckout, validatePromo, redeemPromo, PromoValidation } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

export default function PricingPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidation | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState("");

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

  async function handleCheckout(plan: "pro" | "monthly") {
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

  async function handlePromoValidate() {
    if (!promoInput.trim()) return;
    if (!loggedIn) { router.push("/register"); return; }
    setPromoLoading(true);
    setPromoError("");
    setPromoResult(null);
    setPromoSuccess("");
    try {
      const result = await validatePromo(promoInput.trim(), "pro");
      setPromoResult(result);
      if (result.is_free) {
        // Auto-redeem full unlock codes
        const redeem = await redeemPromo(promoInput.trim(), "pro");
        if (redeem.redeemed) {
          setPromoSuccess(redeem.message);
          setCurrentPlan(redeem.plan);
          setIsPremium(true);
          setPromoResult(null);
        }
      }
    } catch (err: unknown) {
      setPromoError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setPromoLoading(false);
    }
  }

  const alreadyPro = isPremium || currentPlan === "pro" || currentPlan === "premium" || currentPlan === "monthly";

  return (
    <div style={styles.page}>
      {loggedIn && <AppHeader />}
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Simple pricing, full career clarity</h1>
          <p style={styles.subtitle}>
            Start free to see your top pathways. Upgrade to Pro for the complete career transition toolkit.
          </p>
        </div>

        <div style={styles.grid}>
          {/* Free tier */}
          <div style={{ ...styles.card, borderColor: "#1e293b" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>Free</h2>
            <div style={styles.priceRow}>
              <span style={{ fontSize: "2rem", fontWeight: 800 }}>$0</span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Discover your best career pathways in 5 minutes
            </p>

            <ul style={styles.featureList}>
              <li style={styles.featureItem}><span style={styles.checkMark}>+</span> Stage 1 questionnaire (18 questions)</li>
              <li style={styles.featureItem}><span style={styles.checkMark}>+</span> Teaser profile report</li>
              <li style={styles.featureItem}><span style={styles.checkMark}>+</span> Top pathway matches (preview)</li>
              <li style={styles.featureLocked}><span style={styles.lockIcon}>-</span> Full career analysis</li>
              <li style={styles.featureLocked}><span style={styles.lockIcon}>-</span> AI Career Coach</li>
              <li style={styles.featureLocked}><span style={styles.lockIcon}>-</span> Action Plan</li>
            </ul>

            <button
              disabled
              style={{
                ...styles.ctaBtn,
                background: "rgba(255,255,255,0.06)",
                color: "#64748b",
                border: "1px solid #1e293b",
                opacity: 0.6,
                cursor: "default",
              }}
            >
              {alreadyPro ? "Included" : "Current Plan"}
            </button>
          </div>

          {/* Pro tier */}
          <div style={{ ...styles.card, ...styles.popularCard, borderColor: "#3b82f6" }}>
            <div style={styles.popularBadge}>Full Access</div>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>Pro</h2>
            <div style={styles.priceRow}>
              <span style={{ fontSize: "2rem", fontWeight: 800 }}>$9</span>
              <span style={{ color: "#64748b", fontSize: "0.9rem", marginLeft: "0.25rem" }}>/month</span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Your complete career transition toolkit
            </p>

            <ul style={styles.featureList}>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> Everything in Free</li>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> Full questionnaire (Stages 2 & 3)</li>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> Complete career analysis with salary data</li>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> AI Career Coach (unlimited)</li>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> Structured Action Plan with tracking</li>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> Report regeneration</li>
              <li style={styles.featureItem}><span style={styles.checkBlue}>+</span> Credential recommendations with links</li>
            </ul>

            <button
              onClick={() => !alreadyPro && handleCheckout("monthly")}
              disabled={alreadyPro || loading !== null}
              style={{
                ...styles.ctaBtn,
                background: alreadyPro ? "rgba(34,197,94,0.15)" : "#3b82f6",
                color: alreadyPro ? "#4ade80" : "white",
                border: alreadyPro ? "1px solid rgba(34,197,94,0.3)" : "none",
                opacity: loading !== null ? 0.5 : 1,
                cursor: alreadyPro ? "default" : "pointer",
              }}
            >
              {loading === "monthly" ? "Redirecting..." : alreadyPro ? "Current Plan" : "Start Pro — $9/month"}
            </button>
            {!alreadyPro && (
              <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.5rem", textAlign: "center" }}>
                Cancel anytime. Processed securely by LemonSqueezy.
              </p>
            )}
          </div>
        </div>

        {/* Promo Code */}
        <div style={styles.promoSection}>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Have a discount or access code?
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", maxWidth: "400px", margin: "0 auto" }}>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handlePromoValidate()}
              placeholder="Enter code"
              style={styles.promoInput}
            />
            <button
              onClick={handlePromoValidate}
              disabled={promoLoading || !promoInput.trim()}
              style={{ ...styles.promoBtn, opacity: promoLoading || !promoInput.trim() ? 0.5 : 1 }}
            >
              {promoLoading ? "..." : "Apply"}
            </button>
          </div>
          {promoError && (
            <p style={{ color: "#f87171", fontSize: "0.82rem", marginTop: "0.5rem" }}>{promoError}</p>
          )}
          {promoResult && !promoResult.is_free && (
            <p style={{ color: "#4ade80", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {promoResult.description} applied! Use this code at checkout.
            </p>
          )}
          {promoSuccess && (
            <p style={{ color: "#4ade80", fontSize: "0.95rem", fontWeight: 600, marginTop: "0.75rem" }}>
              {promoSuccess}
            </p>
          )}
        </div>

        {/* Trust signals */}
        <div style={styles.trustSection}>
          <div style={styles.trustItem}>
            <strong>Secure Payment</strong>
            <span>Processed by LemonSqueezy. We never see your card details.</span>
          </div>
          <div style={styles.trustItem}>
            <strong>Instant Access</strong>
            <span>All Pro features unlock immediately after payment.</span>
          </div>
          <div style={styles.trustItem}>
            <strong>Cancel Anytime</strong>
            <span>No lock-in. Cancel your subscription whenever you want.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" },
  container: { maxWidth: "780px", margin: "0 auto", padding: "0 1rem 4rem" },
  hero: { textAlign: "center", padding: "2.5rem 0 2rem" },
  title: { fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, marginBottom: "0.5rem" },
  subtitle: { color: "#94a3b8", fontSize: "1.05rem", maxWidth: "500px", margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
  featureLocked: {
    fontSize: "0.85rem",
    color: "#475569",
    padding: "0.35rem 0",
    lineHeight: 1.4,
    textDecoration: "line-through",
  },
  checkMark: { color: "#64748b", marginRight: "0.5rem" },
  checkBlue: { color: "#3b82f6", marginRight: "0.5rem" },
  lockIcon: { color: "#334155", marginRight: "0.5rem" },
  ctaBtn: {
    width: "100%",
    padding: "0.7rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "opacity 0.15s",
  },
  promoSection: {
    textAlign: "center",
    padding: "1.5rem",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    marginBottom: "2rem",
  },
  promoInput: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "0.55rem 0.9rem",
    color: "#f1f5f9",
    fontSize: "0.9rem",
    outline: "none",
    fontFamily: "monospace",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  promoBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid #334155",
    color: "#e2e8f0",
    padding: "0.55rem 1.25rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
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

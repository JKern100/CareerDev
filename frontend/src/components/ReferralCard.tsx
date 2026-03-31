"use client";

import { useEffect, useState } from "react";
import { getReferralStats, claimReferralReward, ReferralStats, ReferralRewardResult } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

export default function ReferralCard() {
  const { t } = useTranslation();
  const r = (key: string) => t(`referral.${key}`);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState<ReferralRewardResult | null>(null);

  useEffect(() => {
    getReferralStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${stats.referral_code}`
    : "";

  const progress = stats.total_referrals % 3;
  const progressPct = (progress / 3) * 100;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const result = await claimReferralReward();
      setReward(result);
      if (result.rewarded) {
        const updated = await getReferralStats();
        setStats(updated);
      }
    } catch {
      // ignore
    } finally {
      setClaiming(false);
    }
  }

  const canClaim = stats.total_referrals >= 3 && stats.rewards_earned > 0;

  return (
    <div style={{
      background: "linear-gradient(160deg, rgba(59,130,246,0.08) 0%, rgba(168,85,247,0.06) 100%)",
      border: "1px solid rgba(59,130,246,0.25)",
      borderRadius: "14px",
      padding: "1.5rem",
      marginTop: "1.5rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.3rem" }}>&#127873;</span>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#f1f5f9" }}>
          {r("title")}
        </h3>
      </div>

      <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "1rem" }}>
        {r("subtitle")}
      </p>

      {/* Progress toward next reward */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.35rem" }}>
          <span>{stats.total_referrals} {r("referrals_count")}</span>
          <span>{stats.next_reward_in} {r("more_needed")}</span>
        </div>
        <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            borderRadius: "3px",
            transition: "width 0.4s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>
          <span>0</span>
          <span>3 = 1 {r("free_month")}</span>
        </div>
      </div>

      {/* Referral code + share */}
      <div style={{
        display: "flex", gap: "0.5rem", alignItems: "center",
        background: "rgba(0,0,0,0.2)", borderRadius: "8px",
        padding: "0.5rem 0.75rem", marginBottom: "0.75rem",
      }}>
        <code style={{ flex: 1, fontSize: "0.88rem", color: "#60a5fa", letterSpacing: "0.05em", fontWeight: 600 }}>
          {stats.referral_code}
        </code>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
            border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
            color: copied ? "#22c55e" : "#60a5fa",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
            whiteSpace: "nowrap" as const,
          }}
        >
          {copied ? r("copied") : r("copy_link")}
        </button>
      </div>

      {/* Share message */}
      <p style={{ color: "#64748b", fontSize: "0.78rem", lineHeight: 1.5, margin: 0 }}>
        {r("share_hint")}
      </p>

      {/* Claim reward button */}
      {canClaim && !reward && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          style={{
            marginTop: "0.75rem",
            width: "100%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            color: "white",
            border: "none",
            padding: "0.6rem",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.88rem",
            cursor: claiming ? "wait" : "pointer",
          }}
        >
          {claiming ? "..." : r("claim_reward")}
        </button>
      )}

      {/* Reward result */}
      {reward && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.75rem",
          background: reward.rewarded ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
          border: `1px solid ${reward.rewarded ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
          borderRadius: "8px",
          color: reward.rewarded ? "#22c55e" : "#eab308",
          fontSize: "0.85rem",
        }}>
          {reward.message}
        </div>
      )}

      {/* Stats summary */}
      {stats.rewards_earned > 0 && (
        <div style={{
          marginTop: "0.75rem",
          fontSize: "0.78rem",
          color: "#22c55e",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
        }}>
          <span>&#10003;</span>
          <span>{stats.rewards_earned} {r("months_earned")}</span>
        </div>
      )}
    </div>
  );
}

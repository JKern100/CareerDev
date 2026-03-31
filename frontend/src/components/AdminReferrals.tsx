"use client";

import { useEffect, useState } from "react";
import { getAdminReferralOverview, AdminReferralOverview } from "@/lib/api";

export default function AdminReferrals() {
  const [data, setData] = useState<AdminReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminReferralOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading referral data...</p>;
  if (error) return <p style={{ color: "#ef4444" }}>{error}</p>;
  if (!data) return null;

  return (
    <div>
      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        <StatBox label="Total Referrals" value={data.total_referrals} />
        <StatBox label="Rewards Granted" value={data.total_rewards_granted} accent="#22c55e" />
        <StatBox label="Active Referrers" value={data.top_referrers.length} accent="#3b82f6" />
      </div>

      {/* Top Referrers */}
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.75rem" }}>
        Top Referrers
      </h3>
      {data.top_referrers.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: "0.88rem" }}>No referrals yet.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Code</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Referrals</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Rewards</th>
              </tr>
            </thead>
            <tbody>
              {data.top_referrers.map((r) => (
                <tr key={r.user_id} style={{ borderBottom: "1px solid #1e293b22" }}>
                  <td style={tdStyle}>{r.email}</td>
                  <td style={tdStyle}>{r.full_name || "—"}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", color: "#60a5fa" }}>{r.referral_code}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{r.referral_count}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#22c55e" }}>{r.rewards_earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Referrals */}
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.75rem" }}>
        Recent Referred Sign-ups
      </h3>
      {data.recent_referrals.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: "0.88rem" }}>No referred users yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <th style={thStyle}>New User</th>
                <th style={thStyle}>Signed Up</th>
                <th style={thStyle}>Referred By</th>
                <th style={thStyle}>Code</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_referrals.map((r) => (
                <tr key={r.user_id} style={{ borderBottom: "1px solid #1e293b22" }}>
                  <td style={tdStyle}>{r.email}</td>
                  <td style={tdStyle}>{r.signed_up_at ? new Date(r.signed_up_at).toLocaleDateString() : "—"}</td>
                  <td style={tdStyle}>{r.referrer_email}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", color: "#60a5fa" }}>{r.referrer_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid #1e293b",
      borderRadius: "10px",
      padding: "1rem",
    }}>
      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent || "#f1f5f9" }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "start",
  padding: "0.5rem 0.75rem",
  color: "#94a3b8",
  fontWeight: 600,
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  color: "#e2e8f0",
};

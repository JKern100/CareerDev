"use client";

import { useEffect, useState } from "react";
import {
  getCoachUsageOverview,
  getCoachUserUsage,
  CoachUsageOverview,
  CoachUserUsage,
} from "@/lib/api";

export default function AdminCoachUsage() {
  const [overview, setOverview] = useState<CoachUsageOverview | null>(null);
  const [selectedUser, setSelectedUser] = useState<CoachUserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const data = await getCoachUsageOverview();
      setOverview(data);
    } catch {
      setError("Failed to load coach usage data");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewUser(userId: string) {
    setUserLoading(true);
    try {
      const data = await getCoachUserUsage(userId);
      setSelectedUser(data);
    } catch {
      setError("Failed to load user data");
    } finally {
      setUserLoading(false);
    }
  }

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading coach usage...</p>;
  if (error && !overview) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (!overview) return null;

  return (
    <div>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem" }}>
        AI Coach Usage Analytics
      </h2>

      {/* Overview Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}>
        {[
          { label: "Total Messages", value: overview.total_messages.toLocaleString() },
          { label: "User Messages", value: overview.total_user_messages.toLocaleString() },
          { label: "AI Responses", value: overview.total_assistant_messages.toLocaleString() },
          { label: "Unique Users", value: overview.unique_users },
          { label: "Today", value: overview.messages_today },
          { label: "Last 7 Days", value: overview.messages_7d },
          { label: "Last 30 Days", value: overview.messages_30d },
          { label: "Avg/User", value: overview.avg_messages_per_user },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Top Users Table */}
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Top 10 Users by Message Count
      </h3>

      <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ textAlign: "start", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Email</th>
              <th style={{ textAlign: "end", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Messages Sent</th>
              <th style={{ textAlign: "end", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {overview.top_users.map((u, i) => (
              <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>{u.email}</td>
                <td style={{ padding: "0.5rem 0.75rem", textAlign: "end", fontWeight: 600 }}>{u.messages}</td>
                <td style={{ padding: "0.5rem 0.75rem", textAlign: "end" }}>
                  <button
                    onClick={() => handleViewUser(u.user_id)}
                    disabled={userLoading}
                    style={{
                      background: "var(--primary)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.3rem 0.7rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
            {overview.top_users.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
                  No coach usage yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected User Detail */}
      {selectedUser && (
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--primary)",
          borderRadius: "12px",
          padding: "1.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              {selectedUser.user_email}
            </h3>
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.25rem 0.6rem",
                cursor: "pointer",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Close
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}>
            {[
              { label: "Total Messages", value: selectedUser.total_messages },
              { label: "User Sent", value: selectedUser.user_messages },
              { label: "AI Replies", value: selectedUser.assistant_messages },
              { label: "Today", value: selectedUser.messages_today },
              { label: "Last 7 Days", value: selectedUser.messages_7d },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)" }}>{stat.value}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--muted)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {selectedUser.first_message_at && (
              <span>First message: {new Date(selectedUser.first_message_at).toLocaleDateString()}</span>
            )}
            {selectedUser.last_message_at && (
              <span>Last message: {new Date(selectedUser.last_message_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}

      {error && <p style={{ color: "#f87171", marginTop: "0.75rem", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}

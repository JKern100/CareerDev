"use client";

import { useEffect, useState } from "react";
import { getEmailLogs, sendTestEmail, EmailLogEntry } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  verification: "Verification",
  password_reset: "Password Reset",
  stage1_results: "Stage 1 Results",
  pro_welcome: "Pro Welcome",
  unknown: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "#22c55e",
  failed: "#ef4444",
  error: "#ef4444",
  skipped: "#f59e0b",
};

export default function AdminEmailLogs() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [days, setDays] = useState(30);
  const [testMsg, setTestMsg] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getEmailLogs({
        email_type: filterType || undefined,
        status: filterStatus || undefined,
        days,
      });
      setLogs(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterType, filterStatus, days]);

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed" || l.status === "error").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatBox label="Total" value={stats.total} />
        <StatBox label="Sent" value={stats.sent} accent="#22c55e" />
        <StatBox label="Failed" value={stats.failed} accent="#ef4444" />
        <StatBox label="Skipped" value={stats.skipped} accent="#f59e0b" />
      </div>

      {/* Test email */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          disabled={sendingTest}
          onClick={async () => {
            setSendingTest(true);
            setTestMsg("");
            try {
              const res = await sendTestEmail();
              setTestMsg(res.detail);
              load();
            } catch (e: unknown) {
              setTestMsg(e instanceof Error ? e.message : "Failed");
            } finally {
              setSendingTest(false);
            }
          }}
          style={{
            background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px",
            padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
            opacity: sendingTest ? 0.6 : 1,
          }}
        >
          {sendingTest ? "Sending..." : "Send Test Email"}
        </button>
        {testMsg && <span style={{ color: testMsg.includes("fail") || testMsg.includes("error") ? "#ef4444" : "#22c55e", fontSize: "0.85rem" }}>{testMsg}</span>}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="error">Error</option>
          <option value="skipped">Skipped</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={selectStyle}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}
      {loading && <p style={{ color: "#94a3b8" }}>Loading...</p>}

      {!loading && logs.length === 0 && (
        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem 0" }}>No emails found.</p>
      )}

      {!loading && logs.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                {["Time", "To", "Type", "Subject", "Status", "Details"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={tdStyle}>{formatTime(log.created_at)}</td>
                  <td style={tdStyle}>{log.to_email}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: "#334155" }}>
                      {TYPE_LABELS[log.email_type] || log.email_type}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.subject}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: STATUS_COLORS[log.status] || "#64748b", color: "#fff" }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#94a3b8" }}>
                    {log.error_detail || log.resend_id || "—"}
                  </td>
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
    <div style={{ background: "#1e293b", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
      <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: accent || "#f1f5f9" }}>{value}</p>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const selectStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
  border: "1px solid #334155",
  borderRadius: "6px",
  padding: "0.4rem 0.75rem",
  fontSize: "0.85rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  color: "#94a3b8",
  fontWeight: 600,
  borderBottom: "2px solid #334155",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  color: "#e2e8f0",
  whiteSpace: "nowrap",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 600,
};

"use client";

import { useEffect, useState } from "react";
import {
  getEmailLogs, sendTestEmail, getAdminUsers, sendBulkEmail,
  EmailLogEntry, AdminUser, BulkEmailResult,
} from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  verification: "Verification",
  password_reset: "Password Reset",
  stage1_results: "Stage 1 Results",
  pro_welcome: "Pro Welcome",
  coach_invite: "Coach Invite",
  come_back: "Come Back",
  complete_questionnaire: "Complete Questionnaire",
  custom: "Custom",
  test: "Test",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "#22c55e",
  failed: "#ef4444",
  error: "#ef4444",
  skipped: "#f59e0b",
};

type SubTab = "send" | "log";

const TEMPLATES = [
  {
    id: "coach_invite",
    label: "Try the AI Coach",
    desc: "Invite users who haven't used the coach yet. Explains how it's personalised to their profile.",
    filter: (u: AdminUser) => u.coach_message_count === 0 && u.questionnaire_completed && u.is_premium,
    filterLabel: "Pro users with 0 coach messages",
  },
  {
    id: "complete_questionnaire",
    label: "Finish Questionnaire",
    desc: "Nudge users who started but haven't completed the questionnaire.",
    filter: (u: AdminUser) => !u.questionnaire_completed && u.answers_count > 0,
    filterLabel: "Started but not completed",
  },
  {
    id: "come_back",
    label: "We Miss You",
    desc: "Re-engage users who haven't visited in 7+ days.",
    filter: (u: AdminUser) => {
      if (!u.last_active_at) return u.login_count > 0;
      const days = (Date.now() - new Date(u.last_active_at).getTime()) / 86400000;
      return days >= 7;
    },
    filterLabel: "Inactive 7+ days",
  },
  {
    id: "stage1_results",
    label: "Stage 1 Results",
    desc: "Send top career match results to users who completed Stage 1.",
    filter: (u: AdminUser) => u.questionnaire_completed,
    filterLabel: "Completed questionnaire",
  },
  {
    id: "custom",
    label: "Custom Email",
    desc: "Write a custom subject and body. Sent in the branded CrewTransition template.",
    filter: () => true,
    filterLabel: "All users",
  },
];

export default function AdminEmailManager() {
  const [subTab, setSubTab] = useState<SubTab>("send");

  return (
    <div>
      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {([["send", "Send Emails"], ["log", "Email Log"]] as [SubTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600,
              border: "1px solid", cursor: "pointer",
              ...(subTab === id
                ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" }
                : { background: "transparent", color: "#94a3b8", borderColor: "#334155" }),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "send" && <SendEmailsView />}
      {subTab === "log" && <EmailLogView />}
    </div>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Send Emails View                                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SendEmailsView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkEmailResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate)!;
  const matchingUsers = users.filter((u) => u.role === "user" && tmpl.filter(u));
  const nonMatchingUsers = users.filter((u) => u.role === "user" && !tmpl.filter(u));

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllMatching() {
    setSelectedIds(new Set(matchingUsers.map((u) => u.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // When template changes, auto-select matching users
  useEffect(() => {
    setSelectedIds(new Set(matchingUsers.map((u) => u.id)));
    setResult(null);
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, users]);

  async function handleSend() {
    if (selectedIds.size === 0) return;
    if (selectedTemplate === "custom" && (!customSubject.trim() || !customBody.trim())) {
      setError("Custom emails require a subject and body.");
      return;
    }
    if (!confirm(`Send "${tmpl.label}" email to ${selectedIds.size} user(s)?`)) return;

    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await sendBulkEmail(
        Array.from(selectedIds),
        selectedTemplate,
        selectedTemplate === "custom" ? customSubject : undefined,
        selectedTemplate === "custom" ? customBody : undefined,
      );
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading users...</p>;

  return (
    <div>
      {/* Template selector */}
      <h4 style={{ color: "#e2e8f0", marginBottom: "0.75rem" }}>Choose Template</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {TEMPLATES.map((t) => {
          const count = users.filter((u) => u.role === "user" && t.filter(u)).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              style={{
                background: selectedTemplate === t.id ? "#1e3a5f" : "#1e293b",
                border: selectedTemplate === t.id ? "2px solid #3b82f6" : "1px solid #334155",
                borderRadius: "8px", padding: "0.75rem", textAlign: "left", cursor: "pointer",
              }}
            >
              <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.85rem", margin: "0 0 4px" }}>{t.label}</p>
              <p style={{ color: "#94a3b8", fontSize: "0.75rem", margin: "0 0 6px", lineHeight: 1.4 }}>{t.desc}</p>
              <span style={{ ...badge, background: count > 0 ? "rgba(59,130,246,0.15)" : "#334155", color: count > 0 ? "#60a5fa" : "#64748b" }}>
                {count} matching
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom email fields */}
      {selectedTemplate === "custom" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="text"
            placeholder="Email subject..."
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            style={{ ...inputStyle, marginBottom: "0.5rem", width: "100%" }}
          />
          <textarea
            placeholder="Email body (plain text — will be wrapped in the branded template)..."
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            rows={5}
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
        </div>
      )}

      {/* User selection */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h4 style={{ color: "#e2e8f0", margin: 0 }}>
          Recipients ({selectedIds.size} selected of {matchingUsers.length + nonMatchingUsers.length})
        </h4>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={selectAllMatching} style={smallBtn}>Select matching ({matchingUsers.length})</button>
          <button onClick={clearSelection} style={smallBtn}>Clear</button>
        </div>
      </div>

      {/* Matching users */}
      {matchingUsers.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
            Matching: {tmpl.filterLabel}
          </p>
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #334155", borderRadius: "8px" }}>
            {matchingUsers.map((u) => (
              <UserRow key={u.id} user={u} selected={selectedIds.has(u.id)} onToggle={() => toggleUser(u.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Non-matching users (collapsed) */}
      {nonMatchingUsers.length > 0 && (
        <details style={{ marginBottom: "1rem" }}>
          <summary style={{ color: "#64748b", fontSize: "0.8rem", cursor: "pointer", marginBottom: "0.5rem" }}>
            Show {nonMatchingUsers.length} other users (don&apos;t match filter)
          </summary>
          <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #334155", borderRadius: "8px" }}>
            {nonMatchingUsers.map((u) => (
              <UserRow key={u.id} user={u} selected={selectedIds.has(u.id)} onToggle={() => toggleUser(u.id)} dimmed />
            ))}
          </div>
        </details>
      )}

      {/* Send button */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
        <button
          disabled={sending || selectedIds.size === 0}
          onClick={handleSend}
          style={{
            background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px",
            padding: "0.6rem 1.5rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
            opacity: (sending || selectedIds.size === 0) ? 0.5 : 1,
          }}
        >
          {sending ? "Sending..." : `Send to ${selectedIds.size} user${selectedIds.size !== 1 ? "s" : ""}`}
        </button>
        {error && <span style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error}</span>}
      </div>

      {/* Results */}
      {result && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "#1e293b", borderRadius: "8px" }}>
          <p style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: "0.5rem" }}>
            Sent: <span style={{ color: "#22c55e" }}>{result.sent}</span>
            {result.failed > 0 && <> | Failed: <span style={{ color: "#ef4444" }}>{result.failed}</span></>}
          </p>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {result.details.map((d, i) => (
              <p key={i} style={{ fontSize: "0.8rem", color: d.status === "sent" ? "#94a3b8" : "#ef4444", margin: "2px 0" }}>
                {d.email}: {d.status}{d.error ? ` — ${d.error}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function UserRow({ user, selected, onToggle, dimmed }: { user: AdminUser; selected: boolean; onToggle: () => void; dimmed?: boolean }) {
  const daysAgo = user.last_active_at
    ? Math.floor((Date.now() - new Date(user.last_active_at).getTime()) / 86400000)
    : null;

  return (
    <label
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.5rem 0.75rem", cursor: "pointer",
        borderBottom: "1px solid #1e293b",
        opacity: dimmed ? 0.5 : 1,
        background: selected ? "rgba(37,99,235,0.08)" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        style={{ accentColor: "#3b82f6", width: "16px", height: "16px" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
          {user.full_name || user.email}
        </span>
        {user.full_name && (
          <span style={{ color: "#64748b", fontSize: "0.75rem", marginLeft: "0.5rem" }}>{user.email}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        {user.is_premium && <span style={{ ...badge, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Pro</span>}
        <span style={{ ...badge, background: "#334155" }}>
          {user.coach_message_count} msgs
        </span>
        <span style={{ ...badge, background: "#334155" }}>
          {user.questionnaire_completed ? "Complete" : `Mod ${user.current_module || "A"}`}
        </span>
        <span style={{ ...badge, background: "#334155" }}>
          {daysAgo !== null ? (daysAgo === 0 ? "Today" : `${daysAgo}d ago`) : "Never"}
        </span>
      </div>
    </label>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Email Log View (migrated from old AdminEmailLogs)                      */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function EmailLogView() {
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
      setLogs(await getEmailLogs({
        email_type: filterType || undefined,
        status: filterStatus || undefined,
        days,
      }));
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatBox label="Total" value={stats.total} />
        <StatBox label="Sent" value={stats.sent} accent="#22c55e" />
        <StatBox label="Failed" value={stats.failed} accent="#ef4444" />
        <StatBox label="Skipped" value={stats.skipped} accent="#f59e0b" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          disabled={sendingTest}
          onClick={async () => {
            setSendingTest(true); setTestMsg("");
            try { const res = await sendTestEmail(); setTestMsg(res.detail); load(); }
            catch (e: unknown) { setTestMsg(e instanceof Error ? e.message : "Failed"); }
            finally { setSendingTest(false); }
          }}
          style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", opacity: sendingTest ? 0.6 : 1 }}
        >
          {sendingTest ? "Sending..." : "Send Test Email"}
        </button>
        {testMsg && <span style={{ color: testMsg.includes("fail") || testMsg.includes("error") ? "#ef4444" : "#22c55e", fontSize: "0.85rem" }}>{testMsg}</span>}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="error">Error</option>
          <option value="skipped">Skipped</option>
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStyle}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}
      {loading && <p style={{ color: "#94a3b8" }}>Loading...</p>}
      {!loading && logs.length === 0 && <p style={{ color: "#64748b", textAlign: "center", padding: "2rem 0" }}>No emails found.</p>}

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
                    <span style={{ ...badge, background: "#334155" }}>{TYPE_LABELS[log.email_type] || log.email_type}</span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.subject}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: STATUS_COLORS[log.status] || "#64748b", color: "#fff" }}>{log.status}</span>
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


/* ── Shared Components & Styles ──────────────────────────────────────── */

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
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const selectStyle: React.CSSProperties = { background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", padding: "0.4rem 0.75rem", fontSize: "0.85rem" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.5rem 0.75rem", color: "#94a3b8", fontWeight: 600, borderBottom: "2px solid #334155", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "0.5rem 0.75rem", color: "#e2e8f0", whiteSpace: "nowrap" };
const badge: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 };
const inputStyle: React.CSSProperties = { background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.85rem" };
const smallBtn: React.CSSProperties = { background: "#334155", color: "#e2e8f0", border: "none", borderRadius: "4px", padding: "0.3rem 0.75rem", fontSize: "0.75rem", cursor: "pointer" };

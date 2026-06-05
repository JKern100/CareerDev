"use client";

import { useEffect, useState } from "react";
import {
  getEmailLogs, sendTestEmail, getAdminUsers, sendBulkEmail,
  getEmailTemplates, updateEmailTemplate, resetEmailTemplate,
  getCustomEmailEngagement,
  EmailLogEntry, AdminUser, BulkEmailResult, EmailTemplateData,
  CustomEmailEngagement, CustomEmailCampaign, CustomEmailRecipient,
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

type SubTab = "send" | "templates" | "log" | "engagement";

const TEMPLATE_LABELS: Record<string, string> = {
  coach_invite: "Try the AI Coach",
  come_back: "We Miss You",
  complete_questionnaire: "Finish Questionnaire",
};

const TEMPLATE_VARS: Record<string, string[]> = {
  coach_invite: ["{{name}}", "{{coach_url}}", "{{dashboard_url}}", "{{unsubscribe_html}}"],
  come_back: ["{{name}}", "{{away_line}}", "{{dashboard_url}}", "{{unsubscribe_html}}"],
  complete_questionnaire: ["{{name}}", "{{current_module}}", "{{questionnaire_url}}", "{{unsubscribe_html}}"],
};

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
        {([["send", "Send Emails"], ["templates", "Edit Templates"], ["log", "Email Log"], ["engagement", "Engagement"]] as [SubTab, string][]).map(([id, label]) => (
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
      {subTab === "templates" && <TemplateEditorView />}
      {subTab === "log" && <EmailLogView />}
      {subTab === "engagement" && <EngagementView />}
    </div>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Send Emails View                                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type EmailedFilter = "all" | "never" | "7" | "14" | "30";

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
  const [emailedFilter, setEmailedFilter] = useState<EmailedFilter>("all");

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate)!;

  function passesEmailedFilter(u: AdminUser): boolean {
    if (emailedFilter === "all") return true;
    if (emailedFilter === "never") return !u.last_emailed_at;
    const days = parseInt(emailedFilter);
    if (!u.last_emailed_at) return true;
    const ago = (Date.now() - new Date(u.last_emailed_at).getTime()) / 86400000;
    return ago >= days;
  }

  const filteredUsers = users.filter(passesEmailedFilter);
  const matchingUsers = filteredUsers.filter((u) => tmpl.filter(u));
  const nonMatchingUsers = filteredUsers.filter((u) => !tmpl.filter(u));

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

  // When template or filter changes, auto-select matching users
  useEffect(() => {
    setSelectedIds(new Set(matchingUsers.map((u) => u.id)));
    setResult(null);
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, users, emailedFilter]);

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
          const count = users.filter((u) => t.filter(u)).length;
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
          <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Tip: use{" "}
            <code style={{ background: "#334155", color: "#60a5fa", padding: "2px 6px", borderRadius: "3px" }}>{"{{name}}"}</code>{" "}
            in the subject or body to insert the recipient&apos;s first name (falls back to &ldquo;there&rdquo; if unknown).
          </p>
        </div>
      )}

      {/* Last emailed filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>Last emailed:</label>
        <select
          value={emailedFilter}
          onChange={(e) => setEmailedFilter(e.target.value as EmailedFilter)}
          style={{ ...inputStyle, padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
        >
          <option value="all">Show all</option>
          <option value="never">Never emailed</option>
          <option value="7">Not emailed in 7+ days</option>
          <option value="14">Not emailed in 14+ days</option>
          <option value="30">Not emailed in 30+ days</option>
        </select>
        {emailedFilter !== "all" && (
          <span style={{ color: "#60a5fa", fontSize: "0.75rem" }}>
            {filteredUsers.length} of {users.length} users shown
          </span>
        )}
      </div>

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
  const emailedDaysAgo = user.last_emailed_at
    ? Math.floor((Date.now() - new Date(user.last_emailed_at).getTime()) / 86400000)
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
        <span
          style={{
            ...badge,
            background: emailedDaysAgo !== null && emailedDaysAgo < 3 ? "rgba(245,158,11,0.15)" : "#334155",
            color: emailedDaysAgo !== null && emailedDaysAgo < 3 ? "#fbbf24" : undefined,
          }}
          title={user.last_emailed_at ? `Last emailed: ${new Date(user.last_emailed_at).toLocaleString()}` : "Never emailed"}
        >
          {emailedDaysAgo !== null
            ? `${TYPE_LABELS[user.last_email_type || ""] || user.last_email_type || "Email"} ${emailedDaysAgo === 0 ? "today" : `${emailedDaysAgo}d ago`}`
            : "No email"}
        </span>
      </div>
    </label>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Template Editor View                                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TemplateEditorView() {
  const [templates, setTemplates] = useState<EmailTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [previewing, setPreviewing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTemplates(await getEmailTemplates());
    } catch {
      setMsg("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: EmailTemplateData) {
    setEditing(t.id);
    setEditSubject(t.subject);
    setEditBody(t.body_html);
    setMsg("");
    setPreviewing(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await updateEmailTemplate(editing, editSubject, editBody);
      setMsg(res.detail);
      setEditing(null);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(id: string) {
    if (!confirm("Reset this template to its default? Your customizations will be lost.")) return;
    try {
      const res = await resetEmailTemplate(id);
      setMsg(res.detail);
      setEditing(null);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to reset");
    }
  }

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading templates...</p>;

  if (editing) {
    const vars = TEMPLATE_VARS[editing] || [];
    return (
      <div>
        <button onClick={() => setEditing(null)} style={{ ...smallBtn, marginBottom: "1rem" }}>&larr; Back to list</button>
        <h4 style={{ color: "#e2e8f0", marginBottom: "1rem" }}>Editing: {TEMPLATE_LABELS[editing] || editing}</h4>

        {vars.length > 0 && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: "0.25rem", fontWeight: 600 }}>Available variables (automatically replaced when sending):</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {vars.map((v) => (
                <code key={v} style={{ background: "#334155", color: "#60a5fa", padding: "2px 6px", borderRadius: "3px", fontSize: "0.75rem" }}>{v}</code>
              ))}
            </div>
          </div>
        )}

        <label style={{ display: "block", color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Subject</label>
        <input
          value={editSubject}
          onChange={(e) => setEditSubject(e.target.value)}
          style={{ ...inputStyle, width: "100%", marginBottom: "0.75rem" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Body HTML</label>
          <button onClick={() => setPreviewing(!previewing)} style={smallBtn}>
            {previewing ? "Edit" : "Preview"}
          </button>
        </div>

        {previewing ? (
          <div
            style={{ background: "#fff", color: "#1e293b", padding: "1.5rem", borderRadius: "8px", fontSize: "15px", lineHeight: 1.6, minHeight: "200px" }}
            dangerouslySetInnerHTML={{ __html: editBody }}
          />
        ) : (
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={18}
            style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.5 }}
          />
        )}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
          <button onClick={() => setEditing(null)} style={smallBtn}>Cancel</button>
          {msg && <span style={{ color: msg.includes("fail") || msg.includes("error") ? "#ef4444" : "#22c55e", fontSize: "0.85rem" }}>{msg}</span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {msg && <p style={{ color: "#22c55e", fontSize: "0.85rem", marginBottom: "1rem" }}>{msg}</p>}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {templates.map((t) => (
          <div key={t.id} style={{ background: "#1e293b", borderRadius: "8px", padding: "1rem", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.9rem", margin: "0 0 4px" }}>
                  {TEMPLATE_LABELS[t.id] || t.id}
                </p>
                <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: 0 }}>Subject: {t.subject}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {t.is_customized && (
                  <>
                    <span style={{ ...badge, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>customized</span>
                    <button onClick={() => handleReset(t.id)} style={{ ...smallBtn, color: "#f87171" }}>Reset</button>
                  </>
                )}
                <button onClick={() => startEdit(t)} style={{ ...smallBtn, background: "#2563eb", color: "#fff" }}>Edit</button>
              </div>
            </div>
            <div
              style={{ background: "#0f172a", borderRadius: "6px", padding: "0.75rem", maxHeight: "120px", overflow: "auto", fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace", lineHeight: 1.4 }}
              dangerouslySetInnerHTML={{ __html: t.body_html.slice(0, 500) + (t.body_html.length > 500 ? "..." : "") }}
            />
          </div>
        ))}
      </div>
    </div>
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


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Engagement View — open/click tracking for custom broadcast emails       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function EngagementView() {
  const [data, setData] = useState<CustomEmailEngagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getCustomEmailEngagement(90);
      setData(res);
      // Auto-open the most recent campaign for convenience.
      if (res.campaigns.length > 0) setExpanded(res.campaigns[0].subject);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading engagement…</p>;
  if (error) return <p style={{ color: "#ef4444" }}>{error}</p>;
  if (!data) return null;

  return (
    <div>
      {!data.tracking_configured && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <p style={{ color: "#fbbf24", fontSize: "0.8rem", margin: 0 }}>
            Open/click tracking isn&apos;t fully configured (no <code>RESEND_WEBHOOK_SECRET</code>). Counts will stay at zero until the Resend webhook is wired up — check the Newsletter → Tracking Diagnostic.
          </p>
        </div>
      )}

      <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "1rem" }}>
        Custom broadcast emails from the last 90 days, grouped by subject. Opens can be under-reported (Apple Mail Privacy, image blocking) — clicks are the reliable signal.
      </p>

      {data.campaigns.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem 0" }}>No custom emails sent in the last 90 days.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {data.campaigns.map((c) => (
            <CampaignCard
              key={c.subject}
              campaign={c}
              open={expanded === c.subject}
              onToggle={() => setExpanded(expanded === c.subject ? null : c.subject)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign: c, open, onToggle }: { campaign: CustomEmailCampaign; open: boolean; onToggle: () => void }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div style={{ background: "#1e293b", borderRadius: "8px", border: "1px solid #334155", overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", background: "transparent", border: "none", padding: "1rem", textAlign: "left", cursor: "pointer" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.9rem", margin: "0 0 4px" }}>{c.subject}</p>
            <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>
              {c.last_sent_at ? new Date(c.last_sent_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
              {" · "}{open ? "Hide recipients ▲" : "Show recipients ▼"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", flexShrink: 0 }}>
            <Metric label="Sent" value={String(c.sent)} />
            <Metric label="Delivered" value={String(c.delivered)} accent="#22c55e" />
            <Metric label="Opened" value={`${c.opened} (${pct(c.open_rate)})`} accent="#60a5fa" />
            <Metric label="Clicked" value={`${c.clicked} (${pct(c.click_rate)})`} accent="#a78bfa" />
            {c.bounced > 0 && <Metric label="Bounced" value={String(c.bounced)} accent="#ef4444" />}
          </div>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #334155", padding: "0.5rem 0" }}>
          {c.recipients.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.8rem", padding: "0.75rem 1rem" }}>No recipients.</p>
          ) : (
            c.recipients.map((r) => <RecipientRow key={r.email} r={r} />)
          )}
        </div>
      )}
    </div>
  );
}

function RecipientRow({ r }: { r: CustomEmailRecipient }) {
  const clicked = !!r.first_clicked_at;
  const opened = !!r.first_opened_at;
  const status = clicked ? "Clicked" : opened ? "Opened" : r.bounced_at ? "Bounced" : r.delivered_at ? "Delivered" : "Sent";
  const statusColor = clicked ? "#a78bfa" : opened ? "#60a5fa" : r.bounced_at ? "#ef4444" : r.delivered_at ? "#22c55e" : "#64748b";

  return (
    <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>{r.email}</span>
        {clicked && r.clicked_urls.length > 0 && (
          <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: 2, wordBreak: "break-all" }}>
            ↳ {r.clicked_urls.join(", ")}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
        {r.first_clicked_at && (
          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
            {new Date(r.first_clicked_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <span style={{ ...badge, background: statusColor, color: "#fff" }}>{status}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "0.95rem", fontWeight: 700, color: accent || "#f1f5f9", margin: 0 }}>{value}</p>
      <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</p>
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

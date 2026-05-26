"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getAdminIssues,
  createAdminIssue,
  updateAdminIssue,
  publishAdminIssue,
  sendAdminIssue,
  getAdminSubscribers,
  getAdminNewsletterStats,
  NewsletterIssueAdmin,
  NewsletterSubscriber,
  NewsletterStats,
} from "@/lib/api";

type SubTab = "issues" | "subscribers";

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748b",
  published: "#3b82f6",
  sent: "#22c55e",
  pending: "#f59e0b",
  active: "#22c55e",
  unsubscribed: "#ef4444",
};

export default function AdminNewsletterManager() {
  const [subTab, setSubTab] = useState<SubTab>("issues");

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {([["issues", "Issues"], ["subscribers", "Subscribers"]] as [SubTab, string][]).map(([id, label]) => (
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

      {subTab === "issues" && <IssuesView />}
      {subTab === "subscribers" && <SubscribersView />}
    </div>
  );
}


function IssuesView() {
  const [issues, setIssues] = useState<NewsletterIssueAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NewsletterIssueAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setIssues(await getAdminIssues());
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (editing || creating) {
    return (
      <IssueEditor
        issue={editing}
        onClose={() => { setEditing(null); setCreating(false); load(); }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>All issues</h3>
        <button onClick={() => setCreating(true)} style={primaryBtn}>+ New issue</button>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}
      {loading && <p style={{ color: "#94a3b8" }}>Loading…</p>}
      {!loading && issues.length === 0 && (
        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem 0" }}>
          No issues yet. Create one to get started.
        </p>
      )}

      {!loading && issues.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                {["Slug", "Subject", "Status", "Published", "Sent", "Actions"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} onEdit={() => setEditing(issue)} onChanged={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function IssueRow({ issue, onEdit, onChanged }: { issue: NewsletterIssueAdmin; onEdit: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function publish() {
    setBusy(true); setMsg("");
    try { await publishAdminIssue(issue.id); onChanged(); }
    catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function send() {
    const ok = confirm(`Send "${issue.subject}" to all active subscribers? This cannot be undone.`);
    if (!ok) return;
    setBusy(true); setMsg("");
    try {
      const res = await sendAdminIssue(issue.id);
      setMsg(`Sent: ${res.sent}, failed: ${res.failed}, skipped: ${res.skipped}`);
      onChanged();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr style={{ borderBottom: "1px solid #1e293b" }}>
      <td style={tdStyle}>
        <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>{issue.slug}</code>
      </td>
      <td style={{ ...tdStyle, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{issue.subject}</td>
      <td style={tdStyle}>
        <span style={{ ...badge, background: STATUS_COLORS[issue.status] || "#64748b", color: "#fff" }}>{issue.status}</span>
      </td>
      <td style={tdStyle}>{issue.published_at ? new Date(issue.published_at).toLocaleDateString() : "—"}</td>
      <td style={tdStyle}>{issue.sent_at ? new Date(issue.sent_at).toLocaleDateString() : "—"}</td>
      <td style={tdStyle}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={onEdit} style={smallBtn}>Edit</button>
          {issue.status === "draft" && (
            <button onClick={publish} disabled={busy} style={smallBtn}>Publish</button>
          )}
          {(issue.status === "published" || issue.status === "sent") && (
            <button onClick={send} disabled={busy} style={{ ...smallBtn, background: "#2563eb", color: "#fff" }}>
              {issue.status === "sent" ? "Re-send" : "Send"}
            </button>
          )}
          {msg && <span style={{ color: msg.startsWith("Sent") ? "#22c55e" : "#ef4444", fontSize: 12 }}>{msg}</span>}
        </div>
      </td>
    </tr>
  );
}


function IssueEditor({ issue, onClose }: { issue: NewsletterIssueAdmin | null; onClose: () => void }) {
  const [slug, setSlug] = useState(issue?.slug || new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState(issue?.subject || "");
  const [teaserMd, setTeaserMd] = useState(issue?.teaser_md || "");
  const [bodyMd, setBodyMd] = useState(issue?.body_md || "");
  const [preview, setPreview] = useState<"body" | "teaser">("body");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true); setError("");
    try {
      if (issue) {
        await updateAdminIssue(issue.id, { slug, subject, teaser_md: teaserMd, body_md: bodyMd });
      } else {
        await createAdminIssue({ slug, subject, teaser_md: teaserMd, body_md: bodyMd });
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "1rem" }}>
          {issue ? `Edit issue: ${issue.slug}` : "New issue"}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={smallBtn}>Cancel</button>
          <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Slug (URL path)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} placeholder="2026-05-25" />

          <label style={labelStyle}>Subject (email subject)</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} placeholder="[Week of 25 May] ..." />

          <div style={{ display: "flex", gap: 8, marginBottom: 4, marginTop: 12 }}>
            <button onClick={() => setPreview("teaser")} style={{ ...smallBtn, background: preview === "teaser" ? "#2563eb" : "#334155", color: "#fff" }}>Teaser</button>
            <button onClick={() => setPreview("body")} style={{ ...smallBtn, background: preview === "body" ? "#2563eb" : "#334155", color: "#fff" }}>Body</button>
          </div>

          {preview === "teaser" ? (
            <>
              <label style={labelStyle}>Teaser markdown (email body, ~150 words)</label>
              <textarea
                value={teaserMd}
                onChange={(e) => setTeaserMd(e.target.value)}
                rows={20}
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13 }}
              />
            </>
          ) : (
            <>
              <label style={labelStyle}>Body markdown (full issue page)</label>
              <textarea
                value={bodyMd}
                onChange={(e) => setBodyMd(e.target.value)}
                rows={30}
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13 }}
              />
            </>
          )}
        </div>

        <div>
          <label style={labelStyle}>Preview ({preview})</label>
          <div style={{
            background: "#fff",
            color: "#1e293b",
            padding: "1.5rem",
            borderRadius: 8,
            minHeight: 400,
            fontSize: 14,
            lineHeight: 1.6,
            maxHeight: 700,
            overflowY: "auto",
          }} className="newsletter-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {preview === "teaser" ? teaserMd : bodyMd}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .newsletter-body h1 { font-size: 1.3rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
        .newsletter-body h2 { font-size: 1.15rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
        .newsletter-body h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .newsletter-body p { margin: 0 0 0.75rem; }
        .newsletter-body ul, .newsletter-body ol { margin: 0 0 0.75rem; padding-left: 1.25rem; }
        .newsletter-body li { margin-bottom: 0.3rem; }
        .newsletter-body a { color: #2563eb; }
        .newsletter-body strong { color: #0f172a; }
        .newsletter-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.25rem 0; }
      `}</style>
    </div>
  );
}


function SubscribersView() {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        getAdminSubscribers(filter || undefined),
        getAdminNewsletterStats(),
      ]);
      setSubs(s);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatBox label="Total" value={stats.total} />
          <StatBox label="Active" value={stats.active} accent="#22c55e" />
          <StatBox label="Pending" value={stats.pending} accent="#f59e0b" />
          <StatBox label="Unsubscribed" value={stats.unsubscribed} accent="#ef4444" />
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      {loading && <p style={{ color: "#94a3b8" }}>Loading…</p>}
      {!loading && subs.length === 0 && (
        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem 0" }}>No subscribers found.</p>
      )}
      {!loading && subs.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                {["Email", "Status", "Source", "Joined", "Confirmed", "Unsubscribed"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={tdStyle}>{s.email}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: STATUS_COLORS[s.status] || "#64748b", color: "#fff" }}>{s.status}</span>
                  </td>
                  <td style={tdStyle}>{s.source || "—"}</td>
                  <td style={tdStyle}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>{s.confirmed_at ? new Date(s.confirmed_at).toLocaleDateString() : "—"}</td>
                  <td style={tdStyle}>{s.unsubscribed_at ? new Date(s.unsubscribed_at).toLocaleDateString() : "—"}</td>
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
    <div style={{ background: "#1e293b", borderRadius: 8, padding: "1rem", textAlign: "center" }}>
      <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: accent || "#f1f5f9" }}>{value}</p>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, marginTop: 12 };
const inputStyle: React.CSSProperties = { background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 6, padding: "0.5rem 0.75rem", fontSize: "0.85rem", width: "100%", boxSizing: "border-box" };
const selectStyle: React.CSSProperties = { background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 6, padding: "0.4rem 0.75rem", fontSize: "0.85rem" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.5rem 0.75rem", color: "#94a3b8", fontWeight: 600, borderBottom: "2px solid #334155", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "0.5rem 0.75rem", color: "#e2e8f0" };
const badge: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 };
const smallBtn: React.CSSProperties = { background: "#334155", color: "#e2e8f0", border: "none", borderRadius: 4, padding: "0.3rem 0.75rem", fontSize: "0.75rem", cursor: "pointer" };
const primaryBtn: React.CSSProperties = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" };

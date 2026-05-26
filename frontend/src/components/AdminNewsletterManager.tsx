"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  getAdminIssues,
  createAdminIssue,
  updateAdminIssue,
  publishAdminIssue,
  sendAdminIssue,
  getAdminSubscribers,
  getAdminNewsletterStats,
  getNewsletterRecipients,
  getIssueStats,
  getIssueRecipientEvents,
  getTrackingDiagnostic,
  NewsletterIssueAdmin,
  NewsletterSubscriber,
  NewsletterStats,
  NewsletterRecipient,
  NewsletterIssueStats,
  NewsletterRecipientEvent,
  TrackingDiagnostic,
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
                {["Slug", "Subject", "Status", "Engagement", "Sent", "Actions"].map((h) => (
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
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [stats, setStats] = useState<NewsletterIssueStats | null>(null);

  async function publish() {
    setBusy(true); setMsg("");
    try { await publishAdminIssue(issue.id); onChanged(); }
    catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  // Lazy-load stats only for sent issues (no point fetching for drafts)
  useEffect(() => {
    if (issue.status !== "sent") return;
    let cancelled = false;
    getIssueStats(issue.id)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [issue.id, issue.status, issue.sent_at]);

  return (
    <>
      <tr style={{ borderBottom: "1px solid #1e293b" }}>
        <td style={tdStyle}>
          <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>{issue.slug}</code>
        </td>
        <td style={{ ...tdStyle, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{issue.subject}</td>
        <td style={tdStyle}>
          <span style={{ ...badge, background: STATUS_COLORS[issue.status] || "#64748b", color: "#fff" }}>{issue.status}</span>
        </td>
        <td style={tdStyle}>
          {stats && stats.sent > 0 ? (
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#cbd5e1", whiteSpace: "nowrap" }}>
              <span title="Sent">📧 {stats.sent}</span>
              <span title="Opened (unique recipients)" style={{ color: "#3b82f6" }}>
                👁 {stats.opened}{stats.delivered ? ` · ${Math.round(stats.open_rate * 100)}%` : ""}
              </span>
              <span title="Clicked (unique recipients)" style={{ color: "#22c55e" }}>
                🔗 {stats.clicked}{stats.delivered ? ` · ${Math.round(stats.click_rate * 100)}%` : ""}
              </span>
              {stats.bounced > 0 && <span style={{ color: "#ef4444" }} title="Bounced">⚠ {stats.bounced}</span>}
            </div>
          ) : (
            <span style={{ color: "#475569", fontSize: 12 }}>—</span>
          )}
        </td>
        <td style={tdStyle}>{issue.sent_at ? new Date(issue.sent_at).toLocaleDateString() : "—"}</td>
        <td style={tdStyle}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={onEdit} style={smallBtn}>Edit</button>
            {issue.status === "draft" && (
              <button onClick={publish} disabled={busy} style={smallBtn}>Publish</button>
            )}
            {(issue.status === "published" || issue.status === "sent") && (
              <button onClick={() => setSendModalOpen(true)} disabled={busy} style={{ ...smallBtn, background: "#2563eb", color: "#fff" }}>
                {issue.status === "sent" ? "Re-send…" : "Send…"}
              </button>
            )}
            {issue.status === "sent" && (
              <button onClick={() => setTrackingOpen(true)} style={smallBtn}>Tracking</button>
            )}
            {msg && <span style={{ color: msg.startsWith("Sent") ? "#22c55e" : "#ef4444", fontSize: 12 }}>{msg}</span>}
          </div>
        </td>
      </tr>
      {sendModalOpen && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <SendModal
              issue={issue}
              onClose={() => setSendModalOpen(false)}
              onSent={(summary) => { setMsg(summary); onChanged(); }}
            />
          </td>
        </tr>
      )}
      {trackingOpen && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <TrackingModal issue={issue} stats={stats} onClose={() => setTrackingOpen(false)} />
          </td>
        </tr>
      )}
    </>
  );
}


function TrackingModal({
  issue,
  stats,
  onClose,
}: {
  issue: NewsletterIssueAdmin;
  stats: NewsletterIssueStats | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<NewsletterRecipientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [diag, setDiag] = useState<TrackingDiagnostic | null>(null);

  useEffect(() => {
    getIssueRecipientEvents(issue.id)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
    // Always fetch diagnostic — cheap and helps when stats look empty
    getTrackingDiagnostic().then(setDiag).catch(() => {});
  }, [issue.id]);

  // Show the diagnostic prominently when this issue has no events yet
  const showDiagnosis = stats && stats.sent > 0 && stats.delivered === 0 && diag;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "1.25rem", margin: "0.5rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#f1f5f9" }}>
          Tracking: <span style={{ color: "#94a3b8", fontWeight: 400 }}>{issue.subject}</span>
        </h4>
        <button onClick={onClose} style={smallBtn}>Close</button>
      </div>

      {showDiagnosis && diag && (
        <div style={{ background: "#1e293b", border: "1px solid #f59e0b", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: 12, fontSize: 12 }}>
          <p style={{ color: "#f59e0b", margin: 0, fontWeight: 600 }}>⚠ No tracking events received for this issue</p>
          {diag.diagnosis.map((d, i) => (
            <p key={i} style={{ color: "#cbd5e1", marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>{d}</p>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: 8, color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>
            <span>Secret set:</span><span>{diag.webhook_secret_set ? "yes" : "no"}</span>
            <span>Webhook URL:</span><span>{diag.expected_webhook_url}</span>
            <span>Total events:</span><span>{diag.total_events_received}</span>
            <span>Latest event:</span><span>{diag.latest_event_type ? `${diag.latest_event_type} @ ${diag.latest_event_at}` : "—"}</span>
          </div>
        </div>
      )}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          <StatBox label="Sent" value={stats.sent} />
          <StatBox label="Delivered" value={stats.delivered} accent="#cbd5e1" />
          <StatBox label="Opened" value={stats.opened} accent="#3b82f6" />
          <StatBox label="Open rate" value={`${Math.round(stats.open_rate * 100)}%`} accent="#3b82f6" />
          <StatBox label="Clicked" value={stats.clicked} accent="#22c55e" />
          <StatBox label="Click rate" value={`${Math.round(stats.click_rate * 100)}%`} accent="#22c55e" />
          {stats.bounced > 0 && <StatBox label="Bounced" value={stats.bounced} accent="#ef4444" />}
          {stats.complained > 0 && <StatBox label="Complaints" value={stats.complained} accent="#ef4444" />}
        </div>
      )}

      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>
        Open tracking is unreliable: Apple Mail Privacy Protection auto-opens emails to fetch the tracking pixel,
        and Gmail&rsquo;s image proxy can prefetch. Treat clicks as the real engagement signal.
      </p>

      {loading && <p style={{ color: "#94a3b8" }}>Loading…</p>}
      {error && <p style={{ color: "#ef4444" }}>{error}</p>}
      {!loading && rows.length === 0 && !error && (
        <p style={{ color: "#64748b", padding: "1rem 0", textAlign: "center" }}>No recipient events yet.</p>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto", border: "1px solid #334155", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead style={{ position: "sticky", top: 0, background: "#0f172a" }}>
              <tr>
                {["Recipient", "Delivered", "Opened", "Opens", "Clicked", "Clicks", "Links", "Issues"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={tdStyle}>{r.email}</td>
                  <td style={tdStyle}>{r.delivered_at ? "✓" : "—"}</td>
                  <td style={tdStyle}>{r.first_opened_at ? new Date(r.first_opened_at).toLocaleString() : "—"}</td>
                  <td style={tdStyle}>{r.open_count || "—"}</td>
                  <td style={tdStyle}>{r.first_clicked_at ? new Date(r.first_clicked_at).toLocaleString() : "—"}</td>
                  <td style={tdStyle}>{r.click_count || "—"}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.clicked_urls.length > 0 ? r.clicked_urls.join(", ") : "—"}
                  </td>
                  <td style={tdStyle}>
                    {r.bounced_at && <span style={{ color: "#ef4444" }}>bounced </span>}
                    {r.complained_at && <span style={{ color: "#ef4444" }}>complaint</span>}
                    {!r.bounced_at && !r.complained_at && "—"}
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


function SendModal({
  issue,
  onClose,
  onSent,
}: {
  issue: NewsletterIssueAdmin;
  onClose: () => void;
  onSent: (summary: string) => void;
}) {
  const [recipients, setRecipients] = useState<NewsletterRecipient[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "user" | "subscriber">("all");
  const [mode, setMode] = useState<"all" | "pick">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // For already-sent issues, default to force re-send so clicking Send actually does something.
  const [force, setForce] = useState(issue.status === "sent");

  useEffect(() => {
    getNewsletterRecipients()
      .then((rs) => {
        setRecipients(rs);
        setSelected(new Set(rs.map((r) => r.email))); // default: all selected
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load recipients"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = recipients.filter((r) => {
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.email.toLowerCase().includes(q) && !(r.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((r) => r.email)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function send() {
    setBusy(true); setError("");
    try {
      const emails = mode === "all" ? undefined : Array.from(selected);
      if (mode === "pick" && (!emails || emails.length === 0)) {
        setError("Pick at least one recipient");
        setBusy(false);
        return;
      }
      const res = await sendAdminIssue(issue.id, { emails, force });
      onSent(`Sent: ${res.sent}, failed: ${res.failed}, skipped: ${res.skipped} (of ${res.total_eligible} eligible)`);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  const allCount = recipients.length;
  const selectedCount = selected.size;
  const sendCount = mode === "all" ? allCount : selectedCount;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "1.25rem", margin: "0.5rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#f1f5f9" }}>
          Send: <span style={{ color: "#94a3b8", fontWeight: 400 }}>{issue.subject}</span>
        </h4>
        <button onClick={onClose} style={smallBtn}>Cancel</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setMode("all")}
          style={{ ...smallBtn, background: mode === "all" ? "#2563eb" : "#334155", color: "#fff" }}
        >
          Send to all eligible ({allCount})
        </button>
        <button
          onClick={() => setMode("pick")}
          style={{ ...smallBtn, background: mode === "pick" ? "#2563eb" : "#334155", color: "#fff" }}
        >
          Pick recipients
        </button>
      </div>

      {mode === "pick" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, flex: "1 1 200px" }}
            />
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)} style={selectStyle}>
              <option value="all">All sources</option>
              <option value="user">App users</option>
              <option value="subscriber">Standalone signups</option>
            </select>
            <button onClick={selectAll} style={smallBtn}>Select shown</button>
            <button onClick={selectNone} style={smallBtn}>Clear</button>
            <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: "auto" }}>
              {selectedCount} selected · {filtered.length} shown
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#94a3b8" }}>Loading recipients…</p>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #334155", borderRadius: 6 }}>
              {filtered.length === 0 ? (
                <p style={{ color: "#64748b", padding: "1rem", textAlign: "center" }}>No matches.</p>
              ) : (
                filtered.map((r) => (
                  <label
                    key={r.email}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "6px 12px", borderBottom: "1px solid #1e293b", cursor: "pointer",
                      background: selected.has(r.email) ? "#1e293b" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(r.email)}
                      onChange={() => toggle(r.email)}
                    />
                    <span style={{ color: "#e2e8f0", fontSize: 13, flex: 1 }}>{r.email}</span>
                    {r.name && <span style={{ color: "#94a3b8", fontSize: 12 }}>{r.name}</span>}
                    <span style={{ ...badge, background: r.source === "user" ? "#334155" : "#475569", color: "#cbd5e1", fontSize: 10 }}>
                      {r.source === "user" ? "user" : "signup"}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingTop: 12, borderTop: "1px solid #334155", flexWrap: "wrap" }}>
        <label style={{ color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Re-send to recipients already sent this issue
        </label>
        {issue.status === "sent" && !force && (
          <span style={{ color: "#f59e0b", fontSize: 12 }}>
            ⚠ Without this, all recipients will be skipped (already sent).
          </span>
        )}
        {error && <span style={{ color: "#ef4444", fontSize: 12 }}>{error}</span>}
        <button
          onClick={send}
          disabled={busy || (mode === "pick" && selectedCount === 0)}
          style={{ ...primaryBtn, marginLeft: "auto", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Sending…" : `${issue.status === "sent" && force ? "Re-send" : "Send"} to ${sendCount} recipient${sendCount === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
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

          <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            Macros (subject + teaser only): <code>{"{{first_name}}"}</code> falls back to &quot;there&quot;.{" "}
            <code>{"{{full_name}}"}</code> falls back to empty. The body is the public page and is not personalized.
          </p>

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
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
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
                {["Email", "Name", "Status", "Source", "Joined", "Unsubscribed"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.email} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={tdStyle}>{s.email}</td>
                  <td style={{ ...tdStyle, color: "#94a3b8" }}>{s.name || "—"}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: STATUS_COLORS[s.status] || "#64748b", color: "#fff" }}>{s.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: "#334155", color: "#cbd5e1", fontSize: 10 }}>{s.source}</span>
                  </td>
                  <td style={tdStyle}>{new Date(s.joined_at).toLocaleDateString()}</td>
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


function StatBox({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
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

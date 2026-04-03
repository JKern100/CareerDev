"use client";

import { useEffect, useState } from "react";
import {
  getAdminResources,
  getAdminResource,
  updateAdminResource,
  ResourceListItem,
} from "@/lib/api";

export default function AdminResources() {
  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Editor state
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editUsedBy, setEditUsedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminResources();
      setResources(data);
    } catch {
      setError("Failed to load resources");
    } finally {
      setLoading(false);
    }
  }

  async function openEditor(filename: string) {
    setLoadingContent(true);
    setError("");
    try {
      const data = await getAdminResource(filename);
      setEditing(filename);
      setEditContent(data.content);
      setEditLabel(data.label);
      setEditUsedBy(data.used_by);
    } catch {
      setError(`Failed to load ${filename}`);
    } finally {
      setLoadingContent(false);
    }
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const result = await updateAdminResource(editing, editContent);
      setMsg(`Saved ${editing} (${result.word_count} words, ${Math.round(result.size_bytes / 1024)}KB). System prompt cache cleared.`);
      setEditing(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  const usedByColors: Record<string, string> = {
    career_analysis: "#3b82f6",
    "career_analysis + scoring": "#8b5cf6",
    reference: "#64748b",
    unknown: "#94a3b8",
  };

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading resources...</p>;

  // ── Editor view ──
  if (editing) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ color: "#f1f5f9", fontSize: "1.1rem", margin: 0 }}>{editLabel}</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {editing} · Used by: {editUsedBy}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setEditing(null)}
              style={{
                padding: "0.4rem 1rem", borderRadius: "6px", border: "1px solid #475569",
                background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "0.4rem 1rem", borderRadius: "6px", border: "none",
                background: "#3b82f6", color: "white", cursor: saving ? "not-allowed" : "pointer",
                fontSize: "0.85rem", fontWeight: 600, opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save & Clear Cache"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: "8px", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", color: "#fca5a5", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <div style={{ position: "relative" }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: "100%",
              minHeight: "60vh",
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "1rem",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              lineHeight: 1.6,
              resize: "vertical",
            }}
          />
          <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.25rem", textAlign: "right" }}>
            {editContent.split(/\s+/).filter(Boolean).length} words · {formatBytes(new Blob([editContent]).size)}
          </p>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ color: "#f1f5f9", fontSize: "1.1rem", margin: 0 }}>AI Resource Files</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          These files are assembled into the system prompt for AI career analysis.
          Editing a file clears the prompt cache — the next analysis will use your changes.
        </p>
      </div>

      {error && (
        <div style={{ background: "#7f1d1d", border: "1px solid #ef4444", borderRadius: "8px", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", color: "#fca5a5", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
      {msg && (
        <div style={{ background: "#14532d", border: "1px solid #22c55e", borderRadius: "8px", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", color: "#86efac", fontSize: "0.85rem" }}>
          {msg}
        </div>
      )}

      {loadingContent && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem", color: "#94a3b8", fontSize: "0.85rem", textAlign: "center" }}>
          Loading file content...
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8", textAlign: "left" }}>
            <th style={{ padding: "0.5rem 0.75rem" }}>File</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Label</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Used By</th>
            <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Size</th>
            <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Words</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.filename} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "0.5rem 0.75rem", color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.8rem" }}>
                {r.filename}
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#cbd5e1" }}>
                {r.label}
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <span style={{
                  background: usedByColors[r.used_by] || usedByColors.unknown,
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}>
                  {r.used_by}
                </span>
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", textAlign: "right", fontFamily: "monospace" }}>
                {formatBytes(r.size_bytes)}
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", textAlign: "right", fontFamily: "monospace" }}>
                {r.word_count.toLocaleString()}
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <button
                  onClick={() => openEditor(r.filename)}
                  style={{
                    padding: "0.25rem 0.75rem", borderRadius: "4px", border: "1px solid #475569",
                    background: "transparent", color: "#93c5fd", cursor: "pointer", fontSize: "0.8rem",
                  }}
                >
                  View / Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total prompt size */}
      <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#1e293b", borderRadius: "8px", display: "flex", gap: "2rem", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Total Files</p>
          <p style={{ color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 600 }}>{resources.length}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Total Size</p>
          <p style={{ color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 600 }}>
            {formatBytes(resources.reduce((sum, r) => sum + r.size_bytes, 0))}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Total Words</p>
          <p style={{ color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 600 }}>
            {resources.reduce((sum, r) => sum + r.word_count, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

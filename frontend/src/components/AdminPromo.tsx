"use client";

import { useEffect, useState } from "react";
import {
  getAdminPromoCodes,
  createAdminPromoCode,
  updateAdminPromoCode,
  deleteAdminPromoCode,
  PromoCodeData,
} from "@/lib/api";

const DISCOUNT_TYPES = ["percent", "fixed", "full_unlock"] as const;
const APPLIES_TO = ["all", "pro", "premium", "monthly"] as const;

export default function AdminPromo() {
  const [codes, setCodes] = useState<PromoCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<string>("percent");
  const [newValue, setNewValue] = useState(0);
  const [newAppliesTo, setNewAppliesTo] = useState("all");
  const [newUnlocksPlan, setNewUnlocksPlan] = useState("pro");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newMaxPerUser, setNewMaxPerUser] = useState(1);
  const [newExpires, setNewExpires] = useState("");
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminPromoCodes();
      setCodes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCode.trim()) return;
    setCreating(true);
    setError("");
    try {
      const code = await createAdminPromoCode({
        code: newCode.trim().toUpperCase(),
        discount_type: newType,
        discount_value: newType === "full_unlock" ? 0 : newValue,
        applies_to: newAppliesTo,
        unlocks_plan: newType === "full_unlock" ? newUnlocksPlan : null,
        max_uses: newMaxUses ? parseInt(newMaxUses) : null,
        max_uses_per_user: newMaxPerUser,
        expires_at: newExpires || null,
        note: newNote || null,
        is_active: true,
      });
      setCodes((prev) => [code, ...prev]);
      setShowCreate(false);
      setNewCode("");
      setNewValue(0);
      setNewNote("");
      setNewMaxUses("");
      setNewExpires("");
      setMsg(`Created code: ${code.code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(code: PromoCodeData) {
    try {
      const updated = await updateAdminPromoCode(code.id, { is_active: !code.is_active });
      setCodes((prev) => prev.map((c) => (c.id === code.id ? updated : c)));
    } catch {
      setError("Failed to update code");
    }
  }

  async function handleDelete(code: PromoCodeData) {
    if (!confirm(`Delete code "${code.code}"? This cannot be undone.`)) return;
    try {
      await deleteAdminPromoCode(code.id);
      setCodes((prev) => prev.filter((c) => c.id !== code.id));
      setMsg(`Deleted code: ${code.code}`);
    } catch {
      setError("Failed to delete code");
    }
  }

  function describeDiscount(c: PromoCodeData): string {
    if (c.discount_type === "full_unlock") return `Full unlock → ${c.unlocks_plan || "pro"}`;
    if (c.discount_type === "percent") return `${c.discount_value}% off`;
    if (c.discount_type === "fixed") return `$${(c.discount_value / 100).toFixed(2)} off`;
    return c.discount_type;
  }

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading promo codes...</p>;

  return (
    <div>
      {error && <p style={{ color: "#f87171", marginBottom: "0.75rem" }}>{error}</p>}
      {msg && <p style={{ color: "#4ade80", marginBottom: "0.75rem" }}>{msg}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>Promo Codes ({codes.length})</h3>
        <button onClick={() => setShowCreate(!showCreate)} style={s.createBtn}>
          {showCreate ? "Cancel" : "+ New Code"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={s.createForm}>
          <div style={s.formGrid}>
            <div>
              <label style={s.label}>Code *</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH50"
                style={s.input}
              />
            </div>
            <div>
              <label style={s.label}>Type *</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} style={s.select}>
                {DISCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "percent" ? "Percentage off" : t === "fixed" ? "Fixed amount off" : "Full unlock (free)"}
                  </option>
                ))}
              </select>
            </div>
            {newType !== "full_unlock" && (
              <div>
                <label style={s.label}>{newType === "percent" ? "Percent (0-100)" : "Amount (cents)"}</label>
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(parseInt(e.target.value) || 0)}
                  style={s.input}
                />
              </div>
            )}
            {newType === "full_unlock" && (
              <div>
                <label style={s.label}>Unlocks plan</label>
                <select value={newUnlocksPlan} onChange={(e) => setNewUnlocksPlan(e.target.value)} style={s.select}>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
            <div>
              <label style={s.label}>Applies to</label>
              <select value={newAppliesTo} onChange={(e) => setNewAppliesTo(e.target.value)} style={s.select}>
                {APPLIES_TO.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Max total uses</label>
              <input
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="Unlimited"
                style={s.input}
              />
            </div>
            <div>
              <label style={s.label}>Max per user</label>
              <input
                type="number"
                value={newMaxPerUser}
                onChange={(e) => setNewMaxPerUser(parseInt(e.target.value) || 1)}
                style={s.input}
              />
            </div>
            <div>
              <label style={s.label}>Expires at</label>
              <input
                type="datetime-local"
                value={newExpires}
                onChange={(e) => setNewExpires(e.target.value)}
                style={{ ...s.input, colorScheme: "dark" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={s.label}>Note (internal)</label>
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="e.g. Influencer campaign, beta tester"
                style={s.input}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newCode.trim()}
            style={{ ...s.createBtn, marginTop: "0.75rem", opacity: creating ? 0.5 : 1 }}
          >
            {creating ? "Creating..." : "Create Code"}
          </button>
        </div>
      )}

      {/* Codes table */}
      {codes.length === 0 ? (
        <p style={{ color: "#475569", textAlign: "center", padding: "2rem 0" }}>No promo codes yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Code</th>
                <th style={s.th}>Discount</th>
                <th style={s.th}>Applies To</th>
                <th style={s.th}>Used</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Expires</th>
                <th style={s.th}>Note</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={s.td}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e2e8f0" }}>{c.code}</span>
                  </td>
                  <td style={s.td}>{describeDiscount(c)}</td>
                  <td style={s.td}>{c.applies_to}</td>
                  <td style={s.td}>
                    {c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: c.is_active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: c.is_active ? "#4ade80" : "#f87171",
                    }}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={s.td}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                  </td>
                  <td style={{ ...s.td, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.note || "—"}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button onClick={() => handleToggleActive(c)} style={s.actionBtn}>
                        {c.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(c)} style={{ ...s.actionBtn, color: "#f87171" }}>
                        Delete
                      </button>
                    </div>
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

const s: Record<string, React.CSSProperties> = {
  createBtn: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#60a5fa",
    padding: "0.4rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  createForm: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b",
    borderRadius: "10px",
    padding: "1rem",
    marginBottom: "1.5rem",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "0.75rem",
  },
  label: {
    display: "block",
    fontSize: "0.78rem",
    color: "#94a3b8",
    marginBottom: "0.25rem",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "0.45rem 0.6rem",
    color: "#f1f5f9",
    fontSize: "0.85rem",
    outline: "none",
  },
  select: {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "0.45rem 0.6rem",
    color: "#f1f5f9",
    fontSize: "0.85rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
  },
  th: {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    color: "#64748b",
    fontSize: "0.78rem",
    fontWeight: 600,
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "0.6rem 0.75rem",
    color: "#94a3b8",
    whiteSpace: "nowrap",
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#60a5fa",
    cursor: "pointer",
    fontSize: "0.78rem",
    padding: "0.2rem 0.4rem",
  },
};

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  getMe,
  getMyAdvisorProfile,
  updateMyAdvisorProfile,
  getMyAvailability,
  setMyAvailability,
  getMyAdvisorBookings,
  cancelBooking,
  AdvisorProfile,
  AvailabilitySlotData,
  BookingData,
} from "@/lib/api";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdvisorDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlotData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"calendar" | "availability" | "profile">("calendar");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Availability editing state
  const [editSlots, setEditSlots] = useState<{ day_of_week: number; start_time: string; end_time: string }[]>([]);

  // Profile editing state
  const [editBio, setEditBio] = useState("");
  const [editCredentials, setEditCredentials] = useState("");
  const [editTimezone, setEditTimezone] = useState("Asia/Dubai");
  const [editDuration, setEditDuration] = useState(60);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const user = await getMe();
        if (user.role !== "advisor" && user.role !== "admin") {
          router.push("/");
          return;
        }
        const p = await getMyAdvisorProfile();
        setProfile(p);
        setEditBio(p.bio || "");
        setEditCredentials(p.credentials || "");
        setEditTimezone(p.timezone || "Asia/Dubai");
        setEditDuration(p.session_duration_minutes);

        const [avail, bk] = await Promise.all([getMyAvailability(), getMyAdvisorBookings()]);
        setAvailability(avail);
        setEditSlots(avail.map((s) => ({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time })));
        setBookings(bk);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSaveAvailability() {
    setSaving(true);
    setMsg("");
    try {
      await setMyAvailability(editSlots);
      const avail = await getMyAvailability();
      setAvailability(avail);
      setEditSlots(avail.map((s) => ({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time })));
      setMsg("Availability saved");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    setMsg("");
    try {
      const updated = await updateMyAdvisorProfile({
        bio: editBio,
        credentials: editCredentials,
        timezone: editTimezone,
        session_duration_minutes: editDuration,
      });
      setProfile(updated);
      setMsg("Profile saved");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  function addSlot() {
    setEditSlots([...editSlots, { day_of_week: 0, start_time: "09:00", end_time: "17:00" }]);
  }

  function removeSlot(index: number) {
    setEditSlots(editSlots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: string, value: string | number) {
    setEditSlots(editSlots.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p>Loading advisor dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "var(--error)" }}>{error}</p>
      </div>
    );
  }

  const tabStyle = (active: boolean) => ({
    padding: "0.6rem 1.2rem",
    borderRadius: "8px 8px 0 0",
    border: "1px solid var(--border)",
    borderBottom: active ? "none" : "1px solid var(--border)",
    background: active ? "var(--card)" : "transparent",
    color: active ? "var(--primary)" : "var(--foreground)",
    cursor: "pointer" as const,
    fontWeight: active ? 600 : 400,
    fontSize: "0.9rem",
  });

  return (
    <>
      <AppHeader />
      <div className="container" style={{ maxWidth: "900px" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Advisor Dashboard</h1>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          Manage your availability and view booked sessions.
        </p>

        {msg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: msg.includes("fail") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
              border: `1px solid ${msg.includes("fail") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "-1px" }}>
          <button style={tabStyle(tab === "calendar")} onClick={() => setTab("calendar")}>
            Upcoming Bookings
          </button>
          <button style={tabStyle(tab === "availability")} onClick={() => setTab("availability")}>
            Set Availability
          </button>
          <button style={tabStyle(tab === "profile")} onClick={() => setTab("profile")}>
            Profile
          </button>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0 12px 12px 12px",
            padding: "1.5rem",
            background: "var(--card)",
            minHeight: "300px",
          }}
        >
          {/* ── Calendar Tab ── */}
          {tab === "calendar" && (
            <>
              {bookings.length === 0 ? (
                <p className="text-muted">No upcoming bookings.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "1rem",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        background: "var(--background)",
                      }}
                    >
                      <div>
                        <strong>{b.date}</strong>{" "}
                        <span className="text-muted">
                          {b.start_time} - {b.end_time}
                        </span>
                        <br />
                        <span style={{ fontSize: "0.85rem" }}>
                          {b.user_name || b.user_email || "Unknown user"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "20px",
                            background:
                              b.status === "confirmed"
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(239,68,68,0.15)",
                            color: b.status === "confirmed" ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {b.status}
                        </span>
                        {b.status === "confirmed" && (
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                            onClick={() => handleCancel(b.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Availability Tab ── */}
          {tab === "availability" && (
            <>
              <p className="text-muted" style={{ marginBottom: "1rem" }}>
                Set your weekly recurring availability. Users can book sessions during these windows.
              </p>

              {editSlots.map((slot, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={slot.day_of_week}
                    onChange={(e) => updateSlot(i, "day_of_week", parseInt(e.target.value))}
                    className="input"
                    style={{ width: "140px" }}
                  >
                    {DAY_NAMES.map((d, idx) => (
                      <option key={idx} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlot(i, "start_time", e.target.value)}
                    className="input"
                    style={{ width: "120px" }}
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlot(i, "end_time", e.target.value)}
                    className="input"
                    style={{ width: "120px" }}
                  />
                  <button
                    onClick={() => removeSlot(i)}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button className="btn btn-outline" onClick={addSlot}>
                  + Add time slot
                </button>
                <button className="btn btn-primary" onClick={handleSaveAvailability} disabled={saving}>
                  {saving ? "Saving..." : "Save Availability"}
                </button>
              </div>
            </>
          )}

          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="text-sm" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                    Bio
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="A short bio visible to users..."
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                    Credentials
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={editCredentials}
                    onChange={(e) => setEditCredentials(e.target.value)}
                    placeholder="Certifications, experience, etc."
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div>
                    <label className="text-sm" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                      Timezone
                    </label>
                    <select
                      className="input"
                      value={editTimezone}
                      onChange={(e) => setEditTimezone(e.target.value)}
                    >
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                      Session duration (min)
                    </label>
                    <select
                      className="input"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value))}
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ alignSelf: "flex-start" }}>
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  listAdvisors,
  getAdvisorSlots,
  bookSession,
  getMyUserBookings,
  cancelBooking,
  AdvisorProfile,
  TimeSlot,
  BookingData,
} from "@/lib/api";

export default function BookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorProfile | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [myBookings, setMyBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Group slots by date
  const slotsByDate: Record<string, TimeSlot[]> = {};
  for (const s of slots) {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const [advs, bk] = await Promise.all([listAdvisors(), getMyUserBookings()]);
        setAdvisors(advs);
        setMyBookings(bk);

        // Auto-select advisor from query param
        const advisorId = searchParams.get("advisor");
        if (advisorId) {
          const found = advs.find((a) => a.id === advisorId);
          if (found) {
            setSelectedAdvisor(found);
            await loadSlots(found.id);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadSlots(advisorId: string) {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const s = await getAdvisorSlots(advisorId);
      setSlots(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSelectAdvisor(advisor: AdvisorProfile) {
    setSelectedAdvisor(advisor);
    setSuccess("");
    setError("");
    await loadSlots(advisor.id);
  }

  async function handleBook(slot: TimeSlot) {
    if (!selectedAdvisor) return;
    setBooking(true);
    setError("");
    setSuccess("");
    try {
      const b = await bookSession(selectedAdvisor.id, slot.date, slot.start_time);
      setSuccess(`Booked! ${b.date} at ${b.start_time} - ${b.end_time} with ${b.advisor_name || "advisor"}.`);
      setMyBookings((prev) => [...prev, b]);
      // Refresh slots to remove the booked one
      await loadSlots(selectedAdvisor.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      setMyBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (selectedAdvisor) await loadSlots(selectedAdvisor.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="container" style={{ maxWidth: "900px" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Book a Session</h1>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          Schedule a 1-on-1 career review with an advisor.
        </p>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", color: "#ef4444" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "0.75rem 1rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", color: "#22c55e" }}>
            {success}
          </div>
        )}

        {/* Existing bookings */}
        {myBookings.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Your upcoming sessions</h3>
            {myBookings.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  marginBottom: "0.5rem",
                  background: "var(--card)",
                }}
              >
                <div>
                  <strong>{formatDate(b.date)}</strong>{" "}
                  {b.start_time} - {b.end_time}{" "}
                  <span className="text-muted">with {b.advisor_name || "Advisor"}</span>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                  onClick={() => handleCancel(b.id)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Advisor list */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }}>
          <div>
            <h3 style={{ marginBottom: "0.75rem" }}>Advisors</h3>
            {advisors.length === 0 ? (
              <p className="text-muted">No advisors available yet.</p>
            ) : (
              advisors.map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleSelectAdvisor(a)}
                  style={{
                    padding: "0.75rem 1rem",
                    border: `1px solid ${selectedAdvisor?.id === a.id ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "8px",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                    background: selectedAdvisor?.id === a.id ? "rgba(37,99,235,0.08)" : "var(--card)",
                    transition: "all 0.15s",
                  }}
                >
                  <strong style={{ fontSize: "0.95rem" }}>{a.name || "Advisor"}</strong>
                  {a.bio && (
                    <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem", lineHeight: 1.4 }}>
                      {a.bio.length > 80 ? a.bio.slice(0, 80) + "..." : a.bio}
                    </p>
                  )}
                  <p style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "0.25rem" }}>
                    {a.session_duration_minutes} min sessions
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Available slots */}
          <div>
            {!selectedAdvisor ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <p className="text-muted">Select an advisor to see available times.</p>
              </div>
            ) : loadingSlots ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <p className="text-muted">Loading available times...</p>
              </div>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <p className="text-muted">No available slots in the next 2 weeks.</p>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: "0.75rem" }}>
                  Available times with {selectedAdvisor.name || "Advisor"}
                </h3>
                {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                  <div key={date} style={{ marginBottom: "1rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      {formatDate(date)}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {dateSlots.map((s) => (
                        <button
                          key={`${s.date}-${s.start_time}`}
                          className="btn btn-outline"
                          style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
                          onClick={() => handleBook(s)}
                          disabled={booking}
                        >
                          {s.start_time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <button className="btn btn-outline" onClick={() => router.push("/summary")}>
            Back to Summary
          </button>
        </div>
      </div>
    </>
  );
}

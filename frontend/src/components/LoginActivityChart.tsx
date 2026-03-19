"use client";

import { useEffect, useState, useMemo } from "react";
import { getUserActivity, ActivityEvent, AdminUser } from "@/lib/api";

interface LoginActivityChartProps {
  user: AdminUser;
  onClose: () => void;
}

export default function LoginActivityChart({ user, onClose }: LoginActivityChartProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    setLoading(true);
    getUserActivity(user.id, { action: "login", days })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [user.id, days]);

  // Group logins by date
  const { buckets, maxCount, dateLabels } = useMemo(() => {
    const map = new Map<string, number>();

    // Create all date buckets in range
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      map.set(d.toISOString().slice(0, 10), 0);
    }

    for (const e of events) {
      const key = e.created_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    const counts = sorted.map(([, c]) => c);
    const labels = sorted.map(([d]) => d);
    return { buckets: counts, maxCount: Math.max(...counts, 1), dateLabels: labels };
  }, [events, days]);

  // SVG dimensions
  const W = 560;
  const H = 200;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Build bar chart
  const barWidth = Math.max(1, Math.min(8, chartW / buckets.length - 1));
  const gap = (chartW - barWidth * buckets.length) / Math.max(buckets.length - 1, 1);

  // Y-axis ticks
  const yTicks = maxCount <= 5
    ? Array.from({ length: maxCount + 1 }, (_, i) => i)
    : [0, Math.round(maxCount / 2), maxCount];

  // X-axis labels — show ~6 evenly spaced
  const labelCount = Math.min(6, dateLabels.length);
  const labelStep = Math.max(1, Math.floor(dateLabels.length / labelCount));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--card, #1e293b)",
          borderRadius: "16px",
          border: "1px solid var(--border, #334155)",
          padding: "24px",
          maxWidth: "640px",
          width: "calc(100% - 32px)",
          position: "relative",
          color: "var(--fg, #f1f5f9)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "var(--muted, #94a3b8)",
            padding: "4px 8px",
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 600 }}>
          Login Activity
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "var(--muted, #94a3b8)" }}>
          {user.full_name || user.email} &middot; {events.length} login{events.length !== 1 ? "s" : ""} in last {days} days
        </p>

        {/* Period toggle */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "4px 12px",
                border: "1px solid var(--border, #334155)",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                background: days === d ? "var(--primary, #2563eb)" : "transparent",
                color: days === d ? "#fff" : "var(--muted, #94a3b8)",
                transition: "all 0.15s",
              }}
            >
              {d}d
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted, #94a3b8)" }}>
            Loading...
          </div>
        ) : buckets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted, #94a3b8)" }}>
            No login data
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto" }}
            role="img"
            aria-label="Login activity bar chart"
          >
            {/* Y-axis grid lines & labels */}
            {yTicks.map((tick) => {
              const y = PAD_T + chartH - (tick / maxCount) * chartH;
              return (
                <g key={tick}>
                  <line
                    x1={PAD_L}
                    x2={W - PAD_R}
                    y1={y}
                    y2={y}
                    stroke="var(--border, #334155)"
                    strokeWidth={0.5}
                    strokeDasharray={tick === 0 ? "none" : "4 3"}
                  />
                  <text
                    x={PAD_L - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--muted, #64748b)"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {buckets.map((count, i) => {
              const x = PAD_L + i * (barWidth + gap);
              const barH = (count / maxCount) * chartH;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={PAD_T + chartH - barH}
                    width={barWidth}
                    height={Math.max(barH, count > 0 ? 2 : 0)}
                    rx={Math.min(barWidth / 2, 3)}
                    fill={count > 0 ? "#2563eb" : "transparent"}
                    opacity={0.85}
                  >
                    <title>{dateLabels[i]}: {count} login{count !== 1 ? "s" : ""}</title>
                  </rect>
                </g>
              );
            })}

            {/* X-axis labels */}
            {dateLabels.map((label, i) => {
              if (i % labelStep !== 0 && i !== dateLabels.length - 1) return null;
              const x = PAD_L + i * (barWidth + gap) + barWidth / 2;
              const d = new Date(label + "T00:00:00");
              const fmt = `${d.getDate()}/${d.getMonth() + 1}`;
              return (
                <text
                  key={label}
                  x={x}
                  y={H - PAD_B + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted, #64748b)"
                >
                  {fmt}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

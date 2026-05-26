"use client";

import Link from "next/link";

/**
 * Lightweight header for public/marketing pages (newsletter landing, single
 * issue, confirm/unsubscribe). Matches the email header gradient and the
 * site's home-page brand mark.
 */
export default function PublicHeader() {
  return (
    <header
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
            color: "#fff",
          }}
        >
          <img src="/logo.svg" alt="" width={28} height={28} />
          <span style={{ fontWeight: 600, fontSize: "1.05rem", letterSpacing: 0.2 }}>
            Crew<span style={{ color: "#60a5fa", fontWeight: 700 }}>Transition</span>
          </span>
        </Link>
        <Link
          href="/"
          style={{
            color: "#cbd5e1",
            textDecoration: "none",
            fontSize: "0.85rem",
            padding: "6px 12px",
            border: "1px solid #334155",
            borderRadius: 6,
          }}
        >
          Try CrewTransition →
        </Link>
      </div>
    </header>
  );
}

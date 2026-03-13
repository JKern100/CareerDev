"use client";

import { useRouter } from "next/navigation";

export default function AppHeader() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid var(--border)",
        marginBottom: "1.5rem",
      }}
    >
      <a
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            background: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.7rem",
            color: "white",
          }}
        >
          CD
        </div>
        <span style={{ fontWeight: 600, fontSize: "1rem" }}>CareerDev</span>
      </a>
      <button
        onClick={handleLogout}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          padding: "0.4rem 1rem",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        Log out
      </button>
    </nav>
  );
}

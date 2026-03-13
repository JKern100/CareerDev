"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function AppHeader() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    const imp = localStorage.getItem("impersonating");
    if (imp) setImpersonating(imp);

    getMe()
      .then((user) => {
        if (user.role === "admin" || user.role === "auditor") {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("impersonating");
    router.push("/");
  }

  function handleBackToAdmin() {
    const adminToken = localStorage.getItem("admin_token");
    if (adminToken) {
      localStorage.setItem("token", adminToken);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("impersonating");
      router.push("/admin");
    }
  }

  return (
    <>
      {impersonating && (
        <div
          style={{
            background: "#1e40af",
            color: "white",
            padding: "0.5rem 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
          }}
        >
          <span>Viewing as: <strong>{impersonating}</strong></span>
          <button
            onClick={handleBackToAdmin}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "0.3rem 0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Back to Admin
          </button>
        </div>
      )}
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {isAdmin && (
          <a
            href="/admin"
            style={{
              background: "rgba(37, 99, 235, 0.1)",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              color: "#60a5fa",
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Admin Panel
          </a>
        )}
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
      </div>
    </nav>
    </>
  );
}

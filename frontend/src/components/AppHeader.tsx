"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function AppHeader() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    const imp = localStorage.getItem("impersonating");
    if (imp) setImpersonating(imp);

    getMe()
      .then((user) => {
        if (user.role === "admin" || user.role === "auditor") {
          setIsAdmin(true);
        }
        if (user.role === "advisor" || user.role === "admin") {
          setIsAdvisor(true);
        }
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("impersonating");
    localStorage.removeItem("questionnaire_lang");
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
            padding: "0.5rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            flexWrap: "wrap",
            gap: "0.5rem",
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
        padding: "0.75rem 1rem",
        borderBottom: "1px solid var(--border)",
        marginBottom: "1rem",
        flexWrap: "wrap",
        gap: "0.5rem",
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
        <img src="/logo.svg" alt="CareerDev" width={32} height={32} />
        <span style={{ fontWeight: 600, fontSize: "1rem" }}>CareerDev</span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <a
          href="/dashboard"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            color: "#4ade80",
            padding: "0.4rem 1rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Dashboard
        </a>
        {isAdvisor && (
          <a
            href="/advisor"
            style={{
              background: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              color: "#a78bfa",
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Advisor
          </a>
        )}
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

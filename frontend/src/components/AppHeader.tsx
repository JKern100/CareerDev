"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { useTranslation, LANGUAGES, LangCode } from "@/hooks/useTranslation";

export default function AppHeader() {
  const router = useRouter();
  const { lang, setLang, t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);

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
          <span>{t("nav.viewing_as")}: <strong>{impersonating}</strong></span>
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
            {t("nav.back_to_admin")}
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
        <img src="/logo.svg" alt="CrewTransition" width={32} height={32} />
        <span style={{ fontWeight: 600, fontSize: "1rem" }}>Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span></span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {/* Language selector */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              padding: "0.4rem 0.75rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              minWidth: "3rem",
            }}
          >
            {LANGUAGES.find((l) => l.code === lang)?.flag || "EN"}
          </button>
          {langOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--card-bg, #1e293b)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                overflow: "hidden",
                zIndex: 100,
                minWidth: "140px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    background: lang === l.code ? "rgba(59,130,246,0.15)" : "transparent",
                    border: "none",
                    color: lang === l.code ? "#60a5fa" : "var(--foreground, #e2e8f0)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textAlign: "start",
                  }}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
          {t("nav.dashboard")}
        </a>
        <a
          href="/plan"
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
          {t("nav.action_plan")}
        </a>
        <a
          href="/coach"
          style={{
            background: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            color: "#facc15",
            padding: "0.4rem 1rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          {t("nav.career_coach")}
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
            {t("nav.advisor")}
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
            {t("nav.admin_panel")}
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
          {t("nav.log_out")}
        </button>
      </div>
    </nav>
    </>
  );
}

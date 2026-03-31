"use client";

import { useEffect, useState, useRef } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

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

  const navItems: { href: string; label: string; color: string; show: boolean }[] = [
    { href: "/dashboard", label: t("nav.dashboard"), color: "#4ade80", show: true },
    { href: "/plan", label: t("nav.action_plan"), color: "#4ade80", show: true },
    { href: "/coach", label: t("nav.career_coach"), color: "#facc15", show: true },
    { href: "/advisor", label: t("nav.advisor"), color: "#a78bfa", show: isAdvisor },
    { href: "/admin", label: t("nav.admin_panel"), color: "#60a5fa", show: isAdmin },
  ];

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
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>
            Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span>
          </span>
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Language selector — always visible */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label="Select language"
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
                role="listbox"
                aria-label="Language options"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  background: "var(--card-bg, #1e293b)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  zIndex: 200,
                  minWidth: "140px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={lang === l.code}
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

          {/* Hamburger menu button */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-label="Navigation menu"
              style={{
                background: menuOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                padding: "0.4rem 0.6rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1.1rem",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.4rem",
                height: "2.1rem",
              }}
            >
              {menuOpen ? "\u2715" : "\u2630"}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--card-bg, #1e293b)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  zIndex: 200,
                  minWidth: "200px",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                }}
              >
                {navItems.filter((item) => item.show).map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.7rem 1rem",
                      color: item.color,
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: item.color,
                      flexShrink: 0,
                    }} />
                    {item.label}
                  </a>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    width: "100%",
                    padding: "0.7rem 1rem",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "start",
                  }}
                >
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#94a3b8",
                    flexShrink: 0,
                  }} />
                  {t("nav.log_out")}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

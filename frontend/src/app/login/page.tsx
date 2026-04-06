"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getMe } from "@/lib/api";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";
import { settings } from "@/lib/settings";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.login.${key}`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const user = await getMe();
      if (user.role === "admin" || user.role === "auditor") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="container" style={{ maxWidth: "400px" }}>
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <FlowerSpinner size={48} />
        <h1 style={{ marginTop: "0.75rem" }}>{p("title")}</h1>
        <p className="text-muted text-sm mb-3">
          {p("subtitle") !== "pages.login.subtitle" ? p("subtitle") : "Continue your career journey"}
        </p>
      </div>

      {/* Google Sign-In */}
      {settings.googleOAuthEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              width: "100%",
              padding: "0.7rem 1rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--foreground)",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: "0.25rem",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009.003 18z" fill="#34A853"/>
              <path d="M3.964 10.712A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.712V4.956H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.044l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 00.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            margin: "0.75rem 0",
            color: "#64748b",
            fontSize: "0.8rem",
          }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            or
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="card flex flex-col gap-1">
        <div>
          <label className="text-sm">{p("email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="text-sm">{p("password")}</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: "0.8rem", padding: "0.25rem",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
        <div style={{ textAlign: "right" }}>
          <a
            href="/forgot-password"
            style={{ color: "var(--primary)", fontSize: "0.85rem", textDecoration: "none" }}
          >
            {p("forgot")}
          </a>
        </div>
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? `${p("submit")}...` : p("submit")}
        </button>
      </form>

      <p className="text-sm text-muted mt-2" style={{ textAlign: "center" }}>
        {p("no_account")}{" "}
        <a href="/register" style={{ color: "var(--primary)" }}>{p("register")}</a>
      </p>
    </div>
  );
}

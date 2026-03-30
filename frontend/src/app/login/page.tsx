"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getMe, resendVerification } from "@/lib/api";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.login.${key}`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleResend() {
    setResending(true);
    setResendMsg("");
    try {
      await resendVerification(email);
      setResendMsg("Verification email sent! Check your inbox.");
    } catch {
      setResendMsg("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setResendMsg("");
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
      if (msg.toLowerCase().includes("verify your email")) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div>
            <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>
            {showResend && (
              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResend}
                  disabled={resending}
                  style={{ fontSize: "0.8rem", padding: "0.375rem 0.75rem" }}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
                {resendMsg && (
                  <p className="text-sm" style={{ marginTop: "0.375rem", color: "var(--success)" }}>{resendMsg}</p>
                )}
              </div>
            )}
          </div>
        )}
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

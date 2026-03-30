"use client";

import { useState } from "react";
import { register, resendVerification } from "@/lib/api";
import FlowerSpinner from "@/components/FlowerSpinner";
import { useTranslation } from "@/hooks/useTranslation";

export default function RegisterPage() {
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.register.${key}`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await register(email, password, fullName || undefined);
      setRegistered(true);
      if (result.email_verified) {
        setAutoVerified(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMsg("");
    try {
      await resendVerification(email);
      setResendMsg(p("verification_resent"));
    } catch {
      setResendMsg(p("resend_failed"));
    } finally {
      setResending(false);
    }
  }

  if (registered) {
    if (autoVerified) {
      return (
        <div className="container" style={{ maxWidth: "460px", textAlign: "center" }}>
          <div style={{ marginTop: "3rem", marginBottom: "1.5rem" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "#d1fae5", display: "inline-flex",
              alignItems: "center", justifyContent: "center", fontSize: "1.75rem",
            }}>
              &#10003;
            </div>
          </div>
          <h1>{p("account_created")}</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            {p("account_ready")}
          </p>
          <a href="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            {p("sign_in")}
          </a>
        </div>
      );
    }

    return (
      <div className="container" style={{ maxWidth: "460px", textAlign: "center" }}>
        <div style={{ marginTop: "3rem", marginBottom: "1.5rem" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "#dbeafe", display: "inline-flex",
            alignItems: "center", justifyContent: "center", fontSize: "1.75rem",
          }}>
            &#9993;
          </div>
        </div>
        <h1>{p("check_email")}</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
          <span dangerouslySetInnerHTML={{ __html: t("pages.register.verification_sent", { email }) }} />
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <button
            className="btn btn-outline"
            onClick={handleResend}
            disabled={resending}
            style={{ fontSize: "0.85rem" }}
          >
            {resending ? p("sending") : p("resend_verification")}
          </button>
        </div>
        {resendMsg && (
          <p className="text-sm" style={{ marginTop: "0.75rem", color: "var(--success)" }}>
            {resendMsg}
          </p>
        )}
        <p className="text-sm text-muted mt-3">
          <a href="/login" style={{ color: "var(--primary)" }}>{p("go_to_signin")}</a>
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "400px" }}>
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <FlowerSpinner size={48} />
        <h1 style={{ marginTop: "0.75rem" }}>{p("title")}</h1>
        <p className="text-muted text-sm mb-3">
          {p("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-1">
        <div>
          <label className="text-sm">{p("full_name")}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
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
            placeholder="Min 8 characters"
            required
            minLength={8}
          />
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? `${p("submit")}...` : p("submit")}
        </button>
      </form>

      <p className="text-sm text-muted mt-2" style={{ textAlign: "center" }}>
        {p("have_account")}{" "}
        <a href="/login" style={{ color: "var(--primary)" }}>{p("login")}</a>
      </p>
    </div>
  );
}

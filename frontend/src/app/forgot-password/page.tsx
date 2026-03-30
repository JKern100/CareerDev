"use client";

import { useState } from "react";
import { forgotPassword } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.forgot_password.${key}`);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emailNotSent, setEmailNotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setSubmitted(true);
      if (!result.email_sent) {
        setEmailNotSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: "400px", textAlign: "center" }}>
        <h1 style={{ marginTop: "2rem" }}>
          {emailNotSent ? p("unavailable") : p("check_email")}
        </h1>
        {emailNotSent ? (
          <p className="text-muted" style={{ marginTop: "1rem", lineHeight: 1.6 }}>
            {p("unavailable_text")}
          </p>
        ) : (
          <>
            <p className="text-muted" style={{ marginTop: "1rem", lineHeight: 1.6 }}>
              <span dangerouslySetInnerHTML={{ __html: t("pages.forgot_password.check_email_text", { email: email.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }) }} />
            </p>
            <p className="text-sm text-muted mt-2">
              {p("didnt_get_it")}{" "}
              <button
                onClick={() => { setSubmitted(false); setEmailNotSent(false); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                {p("try_again")}
              </button>
              .
            </p>
          </>
        )}
        <a href="/login" className="btn btn-outline mt-2" style={{ display: "inline-block" }}>
          {p("back_to_signin")}
        </a>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "400px" }}>
      <h1 style={{ textAlign: "center", marginTop: "2rem" }}>{p("title")}</h1>
      <p className="text-muted text-sm mb-3" style={{ textAlign: "center" }}>
        {p("subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-1">
        <div>
          <label className="text-sm">{p("email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={p("placeholder")}
            required
          />
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? p("sending") : p("submit")}
        </button>
      </form>

      <p className="text-sm text-muted mt-2" style={{ textAlign: "center" }}>
        {p("remember")}{" "}
        <a href="/login" style={{ color: "var(--primary)" }}>{p("sign_in")}</a>
      </p>
    </div>
  );
}

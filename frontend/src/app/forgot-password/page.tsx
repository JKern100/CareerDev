"use client";

import { useState } from "react";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
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
          {emailNotSent ? "Password reset unavailable" : "Check your email"}
        </h1>
        {emailNotSent ? (
          <p className="text-muted" style={{ marginTop: "1rem", lineHeight: 1.6 }}>
            Email delivery is not configured yet. Please contact the site administrator to reset your password.
          </p>
        ) : (
          <>
            <p className="text-muted" style={{ marginTop: "1rem", lineHeight: 1.6 }}>
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password
              reset link. It expires in 30 minutes.
            </p>
            <p className="text-sm text-muted mt-2">
              Didn&apos;t get it? Check your spam folder or{" "}
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
                try again
              </button>
              .
            </p>
          </>
        )}
        <a href="/login" className="btn btn-outline mt-2" style={{ display: "inline-block" }}>
          Back to Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "400px" }}>
      <h1 style={{ textAlign: "center", marginTop: "2rem" }}>Forgot password?</h1>
      <p className="text-muted text-sm mb-3" style={{ textAlign: "center" }}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-1">
        <div>
          <label className="text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-muted mt-2" style={{ textAlign: "center" }}>
        Remember your password?{" "}
        <a href="/login" style={{ color: "var(--primary)" }}>Sign in</a>
      </p>
    </div>
  );
}

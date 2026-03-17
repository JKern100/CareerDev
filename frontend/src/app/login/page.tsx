"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getMe, resendVerification } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
      <h1 style={{ textAlign: "center", marginTop: "2rem" }}>Sign In</h1>
      <p className="text-muted text-sm mb-3" style={{ textAlign: "center" }}>
        Continue your career journey
      </p>

      <div className="card" style={{ textAlign: "center" }}>
        <button
          type="button"
          className="btn"
          onClick={() => { window.location.href = "/api/auth/google"; }}
          style={{
            width: "100%",
            background: "#fff",
            border: "1px solid var(--border)",
            color: "var(--fg)",
            fontWeight: 500,
            gap: "0.5rem",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.25rem 0" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span className="text-sm text-muted">or</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

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
        <div>
          <label className="text-sm">Password</label>
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
            Forgot password?
          </a>
        </div>
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-sm text-muted mt-2" style={{ textAlign: "center" }}>
        No account yet?{" "}
        <a href="/register" style={{ color: "var(--primary)" }}>Create one</a>
      </p>
    </div>
  );
}

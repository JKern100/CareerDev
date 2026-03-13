"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getMe } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      } else if (user.questionnaire_completed) {
        router.push("/results");
      } else {
        router.push("/questionnaire");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
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

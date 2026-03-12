"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register, login } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, fullName || undefined);
      await login(email, password);
      router.push("/questionnaire");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: "400px" }}>
      <h1 style={{ textAlign: "center", marginTop: "2rem" }}>Create Account</h1>
      <p className="text-muted text-sm mb-3" style={{ textAlign: "center" }}>
        Start your career transition journey
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-1">
        <div>
          <label className="text-sm">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
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
            placeholder="Min 8 characters"
            required
            minLength={8}
          />
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-sm text-muted mt-2" style={{ textAlign: "center" }}>
        Already have an account?{" "}
        <a href="/login" style={{ color: "var(--primary)" }}>Sign in</a>
      </p>
    </div>
  );
}

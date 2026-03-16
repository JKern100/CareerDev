"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/lib/api";

const API_BASE = "/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received from Google.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Google sign-in failed");
        }

        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        if (data.is_first_login) {
          localStorage.setItem("is_first_login", "true");
        }

        const user = await getMe();
        if (user.role === "admin" || user.role === "auditor") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      }
    })();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="container" style={{ maxWidth: "400px", textAlign: "center" }}>
        <h1 style={{ marginTop: "3rem" }}>Sign-in failed</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>{error}</p>
        <a href="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "400px", textAlign: "center" }}>
      <h1 style={{ marginTop: "3rem" }}>Signing you in...</h1>
      <p className="text-muted" style={{ marginTop: "0.5rem" }}>Please wait while we complete your Google sign-in.</p>
    </div>
  );
}

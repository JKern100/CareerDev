"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.detail);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: "460px", textAlign: "center" }}>
      <div style={{ marginTop: "3rem", marginBottom: "1.5rem" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: status === "success" ? "#d1fae5" : status === "error" ? "#fee2e2" : "#dbeafe",
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem",
        }}>
          {status === "loading" ? "\u2026" : status === "success" ? "\u2713" : "\u2717"}
        </div>
      </div>

      {status === "loading" && (
        <>
          <h1>Verifying your email...</h1>
          <p className="text-muted mt-2">Just a moment.</p>
        </>
      )}

      {status === "success" && (
        <>
          <h1>Email verified</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            {message}. You&apos;re all set — sign in to start your career assessment.
          </p>
          <a href="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Sign in
          </a>
        </>
      )}

      {status === "error" && (
        <>
          <h1>Verification failed</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            {message}
          </p>
          <p className="text-sm text-muted mt-3">
            The link may have expired.{" "}
            <a href="/register" style={{ color: "var(--primary)" }}>Register again</a>
            {" "}or{" "}
            <a href="/login" style={{ color: "var(--primary)" }}>sign in</a> if you&apos;ve already verified.
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: "460px", textAlign: "center" }}>
        <div style={{ marginTop: "3rem" }}>
          <h1>Verifying your email...</h1>
          <p className="text-muted mt-2">Just a moment.</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

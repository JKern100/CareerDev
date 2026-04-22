"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeEmail } from "@/lib/api";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing unsubscribe token.");
      return;
    }
    unsubscribeEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.detail);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Unsubscribe failed");
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
          {status === "loading" ? "…" : status === "success" ? "✓" : "✗"}
        </div>
      </div>

      {status === "loading" && (
        <>
          <h1>Unsubscribing...</h1>
          <p className="text-muted mt-2">Just a moment.</p>
        </>
      )}

      {status === "success" && (
        <>
          <h1>You&rsquo;re unsubscribed</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            You won&rsquo;t receive any more update emails from CrewTransition. You can re-enable them from your account settings anytime.
          </p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Go to Dashboard
          </a>
        </>
      )}

      {status === "error" && (
        <>
          <h1>Couldn&rsquo;t unsubscribe</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            {message}
          </p>
          <p className="text-sm text-muted mt-3">
            If this keeps happening, please email support@crewtransition.com and we&rsquo;ll remove you manually.
          </p>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: "460px", textAlign: "center" }}>
        <div style={{ marginTop: "3rem" }}>
          <h1>Unsubscribing...</h1>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { newsletterUnsubscribe } from "@/lib/api";

function UnsubContent() {
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
    newsletterUnsubscribe(token)
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
    <div className="container" style={{ maxWidth: 460, textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: status === "success" ? "#d1fae5" : status === "error" ? "#fee2e2" : "#dbeafe",
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem",
        }}>
          {status === "loading" ? "…" : status === "success" ? "✓" : "✗"}
        </div>
      </div>

      {status === "loading" && <h1>Unsubscribing…</h1>}

      {status === "success" && (
        <>
          <h1>You&rsquo;re unsubscribed</h1>
          <p style={{ color: "#64748b", marginTop: "0.75rem", lineHeight: 1.7 }}>
            You won&rsquo;t receive any more issues of Crew Career Brief. Sorry to see you go.
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1>Couldn&rsquo;t unsubscribe</h1>
          <p style={{ color: "#64748b", marginTop: "0.75rem", lineHeight: 1.7 }}>{message}</p>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 16 }}>
            If this keeps happening, email support and we&rsquo;ll remove you manually.
          </p>
        </>
      )}

      <Link href="/newsletter" style={{ color: "#2563eb", marginTop: "1.5rem", display: "inline-block" }}>
        ← Crew Career Brief
      </Link>
    </div>
  );
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "3rem 1rem" }}><h1>Unsubscribing…</h1></div>}>
      <UnsubContent />
    </Suspense>
  );
}

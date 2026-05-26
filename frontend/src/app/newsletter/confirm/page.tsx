"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { newsletterConfirm } from "@/lib/api";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing confirmation token.");
      return;
    }
    newsletterConfirm(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.detail);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Confirmation failed");
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

      {status === "loading" && <h1>Confirming…</h1>}

      {status === "success" && (
        <>
          <h1>You&rsquo;re subscribed</h1>
          <p style={{ color: "#64748b", marginTop: "0.75rem", lineHeight: 1.7 }}>
            You&rsquo;ll get the next issue of Crew Career Brief in your inbox. Read past issues anytime.
          </p>
          <Link href="/newsletter" style={{
            display: "inline-block", marginTop: "1.5rem", padding: "10px 20px",
            background: "#2563eb", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600,
          }}>
            See past issues
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1>Confirmation failed</h1>
          <p style={{ color: "#64748b", marginTop: "0.75rem", lineHeight: 1.7 }}>{message}</p>
          <Link href="/newsletter" style={{ color: "#2563eb", marginTop: "1.5rem", display: "inline-block" }}>
            Try subscribing again →
          </Link>
        </>
      )}
    </div>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <>
      <PublicHeader />
      <Suspense fallback={<div className="container" style={{ padding: "3rem 1rem" }}><h1>Confirming…</h1></div>}>
        <ConfirmContent />
      </Suspense>
    </>
  );
}

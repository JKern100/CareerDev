"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

function VerifyEmailContent() {
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.verify_email.${key}`);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(p("no_token"));
      return;
    }

    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.detail);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : p("failed_title"));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <h1>{p("verifying")}</h1>
          <p className="text-muted mt-2">{p("verifying_text")}</p>
        </>
      )}

      {status === "success" && (
        <>
          <h1>{p("success_title")}</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            {message}. {p("success_text")}
          </p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Go to Dashboard
          </a>
        </>
      )}

      {status === "error" && (
        <>
          <h1>{p("failed_title")}</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem", lineHeight: 1.7 }}>
            {message}
          </p>
          <p className="text-sm text-muted mt-3">
            {p("failed_text")}{" "}
            <a href="/register" style={{ color: "var(--primary)" }}>{p("register_again")}</a>
            {" "}{p("or")}{" "}
            <a href="/login" style={{ color: "var(--primary)" }}>{p("sign_in_if_verified")}</a> {p("already_verified")}
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.verify_email.${key}`);
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: "460px", textAlign: "center" }}>
        <div style={{ marginTop: "3rem" }}>
          <h1>{p("verifying")}</h1>
          <p className="text-muted mt-2">{p("verifying_text")}</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

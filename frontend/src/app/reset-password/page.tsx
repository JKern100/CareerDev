"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

function ResetPasswordForm() {
  const { t } = useTranslation();
  const p = (key: string) => t(`pages.reset_password.${key}`);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(p("min_length_error"));
      return;
    }
    if (password !== confirm) {
      setError(p("mismatch_error"));
      return;
    }
    if (!token) {
      setError(p("no_token_error"));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : p("failed_error"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="container" style={{ maxWidth: "400px", textAlign: "center" }}>
        <h1 style={{ marginTop: "2rem" }}>{p("success_title")}</h1>
        <p className="text-muted" style={{ marginTop: "1rem" }}>
          {p("success_text")}
        </p>
        <button
          className="btn btn-primary mt-2"
          onClick={() => router.push("/login")}
        >
          {p("sign_in")}
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "400px" }}>
      <h1 style={{ textAlign: "center", marginTop: "2rem" }}>{p("title")}</h1>
      <p className="text-muted text-sm mb-3" style={{ textAlign: "center" }}>
        {p("subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-1">
        <div>
          <label className="text-sm">{p("new_password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={p("new_password_placeholder")}
            required
          />
        </div>
        <div>
          <label className="text-sm">{p("confirm_password")}</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{error}</p>}
        <button className="btn btn-primary mt-2" disabled={loading} type="submit">
          {loading ? p("resetting") : p("submit")}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
          <p className="text-muted">{t("pages.reset_password.loading")}</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

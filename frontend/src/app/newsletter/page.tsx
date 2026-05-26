"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublishedIssues, newsletterSubscribe, NewsletterIssuePublic } from "@/lib/api";

export default function NewsletterLandingPage() {
  const [issues, setIssues] = useState<NewsletterIssuePublic[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPublishedIssues()
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitState("submitting");
    try {
      const res = await newsletterSubscribe(email.trim());
      setMessage(res.detail);
      setSubmitState("success");
      setEmail("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Subscription failed");
      setSubmitState("error");
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720, padding: "3rem 1rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <p style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Crew Career Brief
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, marginBottom: 12 }}>
          The weekly newsletter for UAE-based aviation crew
        </h1>
        <p style={{ color: "#64748b", fontSize: "1.05rem", lineHeight: 1.6 }}>
          Hiring radar, fleet moves, pay intel, and pivot paths — specific to crew at Emirates, Etihad, flydubai, Air Arabia and adjacent GCC carriers. 5-minute read, every week.
        </p>
      </header>

      <section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>Get it every week</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              flex: "1 1 240px",
              padding: "10px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 15,
            }}
            disabled={submitState === "submitting"}
          />
          <button
            type="submit"
            disabled={submitState === "submitting"}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: submitState === "submitting" ? "wait" : "pointer",
            }}
          >
            {submitState === "submitting" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
        {submitState === "success" && (
          <p style={{ color: "#16a34a", fontSize: 14, marginTop: 12 }}>{message}</p>
        )}
        {submitState === "error" && (
          <p style={{ color: "#dc2626", fontSize: 14, marginTop: 12 }}>{message}</p>
        )}
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
          Free. Unsubscribe one click any time. We never share your email.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>Past issues</h2>
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Loading…</p>
        ) : issues.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No issues published yet. Subscribe to get the next one.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {issues.map((issue) => (
              <li key={issue.slug} style={{ borderBottom: "1px solid #e2e8f0", padding: "1rem 0" }}>
                <Link href={`/newsletter/${issue.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>
                    {issue.published_at ? new Date(issue.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
                  </p>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    {issue.subject}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

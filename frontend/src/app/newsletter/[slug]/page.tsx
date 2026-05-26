"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getPublishedIssue, NewsletterIssuePublic } from "@/lib/api";

export default function NewsletterIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [issue, setIssue] = useState<NewsletterIssuePublic | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedIssue(slug)
      .then(setIssue)
      .catch((err) => setError(err instanceof Error ? err.message : "Issue not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: 720, padding: "3rem 1rem" }}>
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="container" style={{ maxWidth: 720, padding: "3rem 1rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>Issue not found</h1>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <Link href="/newsletter" style={{ color: "#2563eb" }}>← Back to newsletter</Link>
      </div>
    );
  }

  return (
    <article className="container" style={{ maxWidth: 720, padding: "3rem 1rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <Link href="/newsletter" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>
          ← Crew Career Brief
        </Link>
        {issue.published_at && (
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 16, marginBottom: 4 }}>
            {new Date(issue.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, lineHeight: 1.25, marginTop: 8 }}>
          {issue.subject}
        </h1>
      </header>

      <div className="newsletter-body" style={{ color: "#1e293b", fontSize: "1rem", lineHeight: 1.7 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {issue.body_md || ""}
        </ReactMarkdown>
      </div>

      <footer style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
          Get this every week. <Link href="/newsletter" style={{ color: "#2563eb" }}>Subscribe →</Link>
        </p>
      </footer>

      <style jsx global>{`
        .newsletter-body h1 { font-size: 1.4rem; font-weight: 700; margin: 2rem 0 0.75rem; color: #0f172a; }
        .newsletter-body h2 { font-size: 1.2rem; font-weight: 700; margin: 1.75rem 0 0.5rem; color: #0f172a; }
        .newsletter-body h3 { font-size: 1.05rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: #1e293b; }
        .newsletter-body p { margin: 0 0 1rem; }
        .newsletter-body ul, .newsletter-body ol { margin: 0 0 1rem; padding-left: 1.5rem; }
        .newsletter-body li { margin-bottom: 0.4rem; }
        .newsletter-body a { color: #2563eb; }
        .newsletter-body strong { color: #0f172a; }
        .newsletter-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
        .newsletter-body blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #475569; margin: 0 0 1rem; }
        .newsletter-body code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      `}</style>
    </article>
  );
}

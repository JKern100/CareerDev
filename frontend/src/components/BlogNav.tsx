import Link from "next/link";

/**
 * Dark navy navigation for the blog pages — mirrors the homepage brand mark
 * and palette so the blog feels like part of the same site, not a bolt-on.
 * Server component: no client state needed.
 */
export default function BlogNav() {
  return (
    <nav className="blog-nav">
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#f1f5f9" }}>
        <img src="/logo.svg" alt="" width={32} height={32} />
        <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
          Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span>
        </span>
      </Link>
      <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
        <Link href="/" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          Home
        </Link>
        <Link href="/blog" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          Blog
        </Link>
        <Link
          href="/"
          style={{
            color: "#f1f5f9",
            fontSize: "0.9rem",
            padding: "0.5rem 1rem",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
        >
          Start your assessment
        </Link>
      </div>
    </nav>
  );
}

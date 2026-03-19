"use client";

import { PathwayResult } from "@/lib/api";

interface ResourcesSectionProps {
  pathways: PathwayResult[];
}

export default function ResourcesSection({ pathways }: ResourcesSectionProps) {
  if (pathways.length === 0) return null;

  // Collect credentials from all matched pathways (already sorted by score)
  const credentials: { name: string; duration: string; url: string; pathway: string }[] = [];
  const seen = new Set<string>();

  for (const p of pathways) {
    for (const c of p.recommended_credentials ?? []) {
      if (c.source_url && !seen.has(c.source_url)) {
        seen.add(c.source_url);
        credentials.push({ name: c.name, duration: c.duration, url: c.source_url, pathway: p.pathway_name });
      }
    }
  }

  // Collect unique salary sources
  const salarySources = new Set<string>();
  for (const p of pathways) {
    if (p.salary_band_refs) {
      for (const band of Object.values(p.salary_band_refs)) {
        if (band.source) salarySources.add(band.source);
      }
    }
  }

  return (
    <div className="card" style={{ marginTop: "1rem", padding: "1.25rem" }}>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>Resources &amp; References</h3>
      <p className="text-sm text-muted" style={{ marginBottom: "1.25rem" }}>
        Credentials and sources relevant to your top career matches
      </p>

      {/* Credentials grouped by pathway */}
      {credentials.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h4 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>Recommended Credentials</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {credentials.map((c) => (
              <a
                key={c.url}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "10px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary, #6366f1)";
                  e.currentTarget.style.background = "var(--bg, #f9fafb)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{c.name}</span>
                  <span
                    className="text-muted"
                    style={{ fontSize: "0.75rem", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {c.duration}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                  {c.pathway} &middot;{" "}
                  <span style={{ color: "var(--primary, #6366f1)" }}>
                    {new URL(c.url).hostname.replace("www.", "")} ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Salary data sources */}
      {salarySources.size > 0 && (
        <div>
          <h4 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>Salary Data Sources</h4>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {[...salarySources].map((src) => (
              <li key={src} className="text-sm text-muted" style={{ marginBottom: "4px" }}>
                {src}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

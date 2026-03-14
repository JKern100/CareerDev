"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { runAnalysis, getResults, PathwayResult } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<PathwayResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        // Try to get existing results first
        const data = await getResults();
        setResults(data);
      } catch {
        // No results yet — run analysis
        try {
          await runAnalysis();
          const data = await getResults();
          setResults(data);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to generate results");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p className="text-muted">Analyzing your career pathways...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "var(--error)" }}>{error}</p>
        <button className="btn btn-outline mt-2" onClick={() => router.push("/questionnaire")}>
          Back to Questionnaire
        </button>
      </div>
    );
  }

  return (
    <>
    <AppHeader />
    <div className="container">
      <h1 style={{ marginBottom: "0.5rem" }}>Your Career Pathways</h1>
      <p className="text-muted mb-3">
        Ranked by fit score based on your skills, interests, and constraints.
      </p>

      {results.map((pw, i) => (
        <div key={pw.pathway_id} className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="flex justify-between items-center mb-1">
            <div>
              <span
                className="badge"
                style={{
                  background: i === 0 ? "#dbeafe" : i < 3 ? "#e0e7ff" : "#f3f4f6",
                  color: i === 0 ? "#1e40af" : i < 3 ? "#3730a3" : "#374151",
                  marginRight: "0.5rem",
                }}
              >
                #{i + 1}
              </span>
              <strong>{pw.pathway_name}</strong>
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)" }}>
              {(pw.adjusted_score * 100).toFixed(0)}%
            </span>
          </div>

          <p className="text-sm text-muted mb-2">{pw.description}</p>

          <div className="mb-2">
            <h3 className="text-sm">Typical Roles</h3>
            <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
              {pw.typical_roles.map((role) => (
                <span key={role} className="badge badge-success">{role}</span>
              ))}
            </div>
          </div>

          {pw.salary_band_refs && (
            <div className="mb-2">
              <h3 className="text-sm">Salary Bands (monthly)</h3>
              {Object.entries(pw.salary_band_refs).map(([role, band]) => (
                <p key={role} className="text-sm">
                  {role}: <strong>{band.min_aed.toLocaleString()} – {band.max_aed.toLocaleString()}</strong>
                  <span className="text-muted"> ({band.source})</span>
                </p>
              ))}
            </div>
          )}

          {pw.recommended_credentials && pw.recommended_credentials.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm">Recommended Credentials</h3>
              {pw.recommended_credentials.map((cred) => (
                <p key={cred.name} className="text-sm">
                  <a
                    href={cred.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)" }}
                  >
                    {cred.name}
                  </a>
                  {" "}<span className="text-muted">({cred.duration})</span>
                </p>
              ))}
            </div>
          )}

          {pw.gate_flags && pw.gate_flags.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm">Constraints</h3>
              {pw.gate_flags.map((flag) => (
                <span key={flag} className="badge badge-warning" style={{ marginRight: "0.25rem" }}>
                  {flag}
                </span>
              ))}
            </div>
          )}

          {pw.top_evidence_signals && pw.top_evidence_signals.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm">Evidence Signals</h3>
              <ul style={{ paddingLeft: "1rem" }}>
                {pw.top_evidence_signals.map((sig) => (
                  <li key={sig} className="text-sm">{sig}</li>
                ))}
              </ul>
            </div>
          )}

          {pw.risks_unknowns && pw.risks_unknowns.length > 0 && (
            <div>
              <h3 className="text-sm">Risks & Unknowns</h3>
              <ul style={{ paddingLeft: "1rem" }}>
                {pw.risks_unknowns.map((risk) => (
                  <li key={risk} className="text-sm text-muted">{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div className="mt-3" style={{ textAlign: "center" }}>
        <p className="text-sm text-muted mb-2">
          Salary data sourced from market salary guides. Treat as market estimates, not offers.
        </p>
        <p className="text-sm text-muted">
          This report is informational only. For visa/labor decisions, consult official sources in your country.
        </p>
      </div>
    </div>
    </>
  );
}

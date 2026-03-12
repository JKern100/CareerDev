"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((user) => {
        if (user.questionnaire_completed) {
          router.push("/results");
        } else {
          router.push("/questionnaire");
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "4rem" }}>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>CareerDev</h1>
        <p className="text-muted mb-3" style={{ maxWidth: "500px", margin: "0 auto 2rem" }}>
          AI-powered career advice for flight crew in the UAE. Discover your
          best career pathways with personalized, evidence-based recommendations.
        </p>
        <div className="flex gap-2" style={{ justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => router.push("/register")}>
            Get Started
          </button>
          <button className="btn btn-outline" onClick={() => router.push("/login")}>
            Sign In
          </button>
        </div>
      </div>

      <div style={{ marginTop: "4rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="card">
          <h3>Flight-Crew Native</h3>
          <p className="text-sm text-muted">
            Skills, constraints, and pathways grounded in what flight attendants actually do.
          </p>
        </div>
        <div className="card">
          <h3>UAE-First Realism</h3>
          <p className="text-sm text-muted">
            Built-in modeling of UAE visas, notice periods, end-of-service benefits, and tax.
          </p>
        </div>
        <div className="card">
          <h3>Explainable Results</h3>
          <p className="text-sm text-muted">
            Deterministic scoring with transparent reasoning — see exactly why each pathway fits.
          </p>
        </div>
      </div>
    </div>
  );
}

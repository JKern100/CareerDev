"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, APP_VERSION } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardPath, setDashboardPath] = useState("/questionnaire");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    getMe()
      .then((user) => {
        setIsLoggedIn(true);
        setDashboardPath("/dashboard");
      })
      .catch(() => {
        localStorage.removeItem("token");
      });
  }, []);

  return (
    <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.8rem",
              color: "white",
            }}
          >
            CD
          </div>
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>CareerDev</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="#how-it-works"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            How it works
          </a>
          <a
            href="#pathways"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            Pathways
          </a>
          <a
            href="#methodology"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            Methodology
          </a>
          <button
            onClick={() => router.push(isLoggedIn ? dashboardPath : "/login")}
            style={{
              background: isLoggedIn ? "#2563eb" : "transparent",
              border: isLoggedIn ? "none" : "1px solid #334155",
              color: "#f1f5f9",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {isLoggedIn ? "Go to dashboard" : "Sign in"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "3rem 1rem 2.5rem",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(37, 99, 235, 0.15)",
            color: "#60a5fa",
            padding: "0.4rem 1rem",
            borderRadius: "20px",
            fontSize: "0.85rem",
            fontWeight: 500,
            marginBottom: "1.5rem",
            border: "1px solid rgba(37, 99, 235, 0.3)",
          }}
        >
          Built for flight crew worldwide
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "1.5rem",
          }}
        >
          Your career beyond{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #38bdf8, #2563eb)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            the cabin
          </span>
        </h1>

        <p
          style={{
            fontSize: "0.95rem",
            color: "#60a5fa",
            fontWeight: 500,
            letterSpacing: "0.05em",
            marginBottom: "1rem",
          }}
        >
          Created by crew, for crew
        </p>

        <p
          style={{
            fontSize: "1.15rem",
            color: "#94a3b8",
            maxWidth: "600px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.7,
          }}
        >
          AI-powered career advice built for cabin crew. Get ranked career pathways,
          salary comparisons, and a concrete transition plan grounded in local labor
          rules and real market data.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {isLoggedIn ? (
            <button
              onClick={() => router.push(dashboardPath)}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "0.875rem 2rem",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#1d4ed8")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#2563eb")}
            >
              Continue where you left off
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push("/register")}
                style={{
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  padding: "0.875rem 2rem",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#2563eb")}
              >
                Start your assessment
              </button>
              <button
                onClick={() => router.push("/login")}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#f1f5f9",
                  border: "1px solid #334155",
                  padding: "0.875rem 2rem",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <p style={{ color: "#475569", fontSize: "0.85rem", marginTop: "1.5rem" }}>
          119 guided questions. 14 career pathways. Location-aware salary data.
        </p>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        style={{
          padding: "3rem 1rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "3rem",
          }}
        >
          How it works
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {[
            {
              step: "01",
              title: "Complete the questionnaire",
              desc: "108 questions across 8 modules covering your skills, preferences, constraints, and goals. Takes about 20 minutes.",
            },
            {
              step: "02",
              title: "Get your personal summary",
              desc: "A narrative playback of your profile — who you are, what you bring, and what matters to you. Written in your preferred style.",
            },
            {
              step: "03",
              title: "Receive career analysis",
              desc: "Scored and ranked career pathways with salary data, credential recommendations, and a realistic transition timeline.",
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "1.75rem",
              }}
            >
              <div
                style={{
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  marginBottom: "0.75rem",
                }}
              >
                STEP {item.step}
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                {item.title}
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pathways */}
      <section
        id="pathways"
        style={{
          padding: "3rem 1rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          14 career pathways
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginBottom: "2.5rem",
            maxWidth: "600px",
            margin: "0 auto 2.5rem",
          }}
        >
          Each pathway is scored against your unique profile using a six-component model:
          interest fit, skill match, environment preference, feasibility, compensation, and risk tolerance.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            { name: "Aviation Training", icon: "+" },
            { name: "Corporate L&D", icon: "+" },
            { name: "HR & Talent", icon: "+" },
            { name: "Customer Experience", icon: "+" },
            { name: "Operations", icon: "+" },
            { name: "Safety & Compliance", icon: "+" },
            { name: "Project Management", icon: "+" },
            { name: "Business Analysis", icon: "+" },
            { name: "UX/UI Design", icon: "+" },
            { name: "Hospitality & Luxury", icon: "+" },
            { name: "Private Aviation", icon: "+" },
            { name: "Healthcare", icon: "+" },
            { name: "Sales & Biz Dev", icon: "+" },
            { name: "Entrepreneurship", icon: "+" },
            { name: "Education & Coaching", icon: "+" },
          ].map((pw) => (
            <div
              key={pw.name}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                padding: "1.25rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(37, 99, 235, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                  color: "#60a5fa",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                {pw.icon}
              </div>
              <p style={{ fontWeight: 500, fontSize: "0.9rem" }}>{pw.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          padding: "3rem 1rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "1.75rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Flight-Crew Native
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Skills, constraints, and pathways grounded in what flight attendants actually do —
              not generic career advice.
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "1.75rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Location-Aware Realism
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Built-in modeling of visas, notice periods, end-of-service benefits,
              and salary benchmarks tailored to your country and currency.
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "1.75rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Explainable Results
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Transparent scoring with clear reasoning — see exactly why each pathway
              fits your profile and what gaps to address.
            </p>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section
        id="methodology"
        style={{
          padding: "3rem 1rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(37, 99, 235, 0.15)",
              color: "#60a5fa",
              padding: "0.4rem 1rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              marginBottom: "1.25rem",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              textTransform: "uppercase",
            }}
          >
            Under the Hood
          </div>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            A research-grade advisory framework,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              not a chatbot
            </span>
          </h2>
          <p
            style={{
              color: "#94a3b8",
              maxWidth: "680px",
              margin: "0 auto",
              lineHeight: 1.7,
              fontSize: "1.05rem",
            }}
          >
            CareerDev doesn&apos;t send your answers to an AI and hope for the best. Every
            recommendation passes through a multi-layered analysis pipeline backed by
            structured knowledge documents, deterministic scoring, and domain-specific
            intelligence built exclusively for aviation professionals.
          </p>
        </div>

        {/* Architecture Overview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          {[
            {
              num: "01",
              title: "Structured Knowledge Base",
              desc: "13 proprietary resource documents totaling 3,000+ lines of domain expertise — from aviation skills translation matrices to global labour market context, credential mapping, and archetype recognition patterns.",
            },
            {
              num: "02",
              title: "Six-Component Scoring Model",
              desc: "Every pathway is evaluated across Interest Fit, Skill Match, Environment Preference, Feasibility, Compensation Alignment, and Risk Tolerance — each independently weighted and evidence-backed.",
            },
            {
              num: "03",
              title: "Deterministic Scoring Engine",
              desc: "A rule-based engine runs independently of any AI model, applying gate flags for hard constraints (visa, financial, timeline) and producing auditable, reproducible scores for each pathway.",
            },
          ].map((item) => (
            <div
              key={item.num}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                LAYER {item.num}
              </div>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                {item.title}
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.7 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Deep-dive details */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "2rem",
              textAlign: "center",
            }}
          >
            What powers every recommendation
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "2rem",
            }}
          >
            {[
              {
                title: "Aviation Skills Translation",
                desc: "Maps cabin crew competencies — CRM, emergency response, cross-cultural service, de-escalation — to their ground-side equivalents across 14 industries.",
              },
              {
                title: "Global Labour Market Context",
                desc: "Region-specific intelligence on visa constraints, notice periods, end-of-service gratuities, salary benchmarks, and market demand across key aviation hubs.",
              },
              {
                title: "Urgency & Constraint Signals",
                desc: "Detects financial runway, contractual lock-ins, family obligations, and time-sensitivity to calibrate the realism and pacing of every recommendation.",
              },
              {
                title: "Archetype Recognition",
                desc: "Identifies recurring crew profiles — the Safety Purist, the Entrepreneurial FA, the Burned-Out Senior — to tailor tone, pathway weighting, and risk framing.",
              },
              {
                title: "Contradiction Detection",
                desc: "Flags inconsistencies in your responses (e.g., wanting high salary but low stress) and addresses them transparently rather than ignoring the tension.",
              },
              {
                title: "Partial Completion Handling",
                desc: "Adapts analysis depth to your completion level with explicit confidence disclosures, so you always know where the evidence is strong and where it&apos;s inferred.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h4
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "#e2e8f0",
                  }}
                >
                  {item.title}
                </h4>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                    lineHeight: 1.65,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            textAlign: "center",
          }}
        >
          {[
            { stat: "3,000+", label: "Lines of domain knowledge" },
            { stat: "119", label: "Guided assessment questions" },
            { stat: "14", label: "Scored career pathways" },
            { stat: "6", label: "Independent scoring dimensions" },
            { stat: "8", label: "Assessment modules" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                padding: "1.25rem 1rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: "0.25rem",
                }}
              >
                {item.stat}
              </div>
              <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          textAlign: "center",
          padding: "3rem 1rem 4rem",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
          Ready to explore what&apos;s next?
        </h2>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          Create a free account and start your career assessment today.
        </p>
        <button
          onClick={() => router.push(isLoggedIn ? dashboardPath : "/register")}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "0.875rem 2.5rem",
            borderRadius: "10px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isLoggedIn ? "Go to dashboard" : "Get started free"}
        </button>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #1e293b",
          padding: "2rem",
          textAlign: "center",
          color: "#475569",
          fontSize: "0.8rem",
        }}
      >
        CareerDev {APP_VERSION} — Built for cabin crew worldwide
      </footer>
    </div>
  );
}

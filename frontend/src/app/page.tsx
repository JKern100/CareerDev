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
          <img src="/logo.svg" alt="CrewTransition" width={36} height={36} />
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span></span>
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
          <a
            href="/pricing"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            Pricing
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
        className="hero-section"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "600px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem 3rem",
        }}
      >
        {/* Background plane image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
          }}
        >
          <img
            src="/hero-plane.png"
            alt=""
            role="presentation"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
          {/* Dark overlay for text readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(10,14,26,0.55) 0%, rgba(10,14,26,0.75) 50%, rgba(10,14,26,0.95) 100%)",
            }}
          />
        </div>

        {/* Content over background */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "900px" }}>
          {/* Badge */}
          <div
            className="hero-badge"
            style={{
              display: "inline-block",
              background: "rgba(37, 99, 235, 0.2)",
              color: "#60a5fa",
              padding: "0.4rem 1.25rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
              border: "1px solid rgba(37, 99, 235, 0.4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
            }}
          >
            Built for flight attendants
          </div>

          {/* Logo image */}
          <div className="hero-logo-img" style={{ marginBottom: "1.25rem" }}>
            <img
              src="/hero-logo.png"
              alt="CrewTransition.com"
              className="hero-logo-img"
              style={{
                maxWidth: "min(480px, 85vw)",
                height: "auto",
                display: "block",
                margin: "0 auto",
                filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.5))",
              }}
            />
          </div>

          {/* Headline */}
          <h1
            className="hero-headline"
            style={{
              fontSize: "clamp(1.75rem, 4.5vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: "1rem",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            Plan your{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              career
            </span>{" "}
            takeoff.
          </h1>

          {/* People image — flight attendant to businesswoman */}
          <div className="hero-people-img" style={{ marginBottom: "1.25rem" }}>
            <img
              src="/hero-people.png"
              alt="From flight attendant to business professional"
              style={{
                maxWidth: "min(520px, 90vw)",
                height: "auto",
                display: "block",
                margin: "0 auto",
                borderRadius: "16px",
                border: "none",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          <p
            className="hero-subtitle"
            style={{
              fontSize: "1.15rem",
              color: "#cbd5e1",
              maxWidth: "550px",
              margin: "0 auto 1.5rem",
              lineHeight: 1.7,
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            AI-powered guidance, real career pathways,
            and clear next steps — for life beyond the cabin.
          </p>

          {/* Feature pills */}
          <div
            className="hero-pills"
            style={{
              display: "flex",
              gap: "1.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            {[
              { icon: "\u2728", label: "AI-powered guidance" },
              { icon: "\uD83D\uDE80", label: "New career pathways" },
              { icon: "\uD83D\uDCCA", label: "Compare salaries" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#cbd5e1",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(37, 99, 235, 0.2)",
                    border: "1px solid rgba(37, 99, 235, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </div>
            ))}
          </div>

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
                    background: "rgba(255,255,255,0.08)",
                    color: "#f1f5f9",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: "0.875rem 2rem",
                    borderRadius: "10px",
                    fontSize: "1rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "1.5rem" }}>
            Free to start. 14 career pathways. Results in minutes.
          </p>
        </div>
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
              desc: "A progressive 3-stage assessment: 21 quick-match questions for initial results, ~22 more to sharpen your scores, and an optional deep-dive for maximum personalisation.",
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
        style={{ padding: "3rem 0", overflow: "hidden" }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem", padding: "0 1rem" }}>
          <p style={{ color: "#60a5fa", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Your skills open doors
          </p>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            15 career pathways, scored to you
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "520px", margin: "0 auto", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Interest fit, skill match, feasibility, compensation, and more &mdash; each pathway ranked against your unique profile.
          </p>
        </div>

        {/* Row 1 - scrolls left */}
        <div style={{ display: "flex", gap: "0.75rem", animation: "marqueeLeft 35s linear infinite", width: "max-content", marginBottom: "0.75rem" }}>
          {[
            { name: "Aviation Training", icon: "\u2708\uFE0F" },
            { name: "Corporate L&D", icon: "\uD83C\uDFAF" },
            { name: "HR & Talent", icon: "\uD83E\uDD1D" },
            { name: "Customer Experience", icon: "\u2B50" },
            { name: "Operations", icon: "\u2699\uFE0F" },
            { name: "Safety & Compliance", icon: "\uD83D\uDEE1\uFE0F" },
            { name: "Project Management", icon: "\uD83D\uDCCA" },
            { name: "Business Analysis", icon: "\uD83D\uDD0D" },
            { name: "Aviation Training", icon: "\u2708\uFE0F" },
            { name: "Corporate L&D", icon: "\uD83C\uDFAF" },
            { name: "HR & Talent", icon: "\uD83E\uDD1D" },
            { name: "Customer Experience", icon: "\u2B50" },
            { name: "Operations", icon: "\u2699\uFE0F" },
            { name: "Safety & Compliance", icon: "\uD83D\uDEE1\uFE0F" },
            { name: "Project Management", icon: "\uD83D\uDCCA" },
            { name: "Business Analysis", icon: "\uD83D\uDD0D" },
          ].map((pw, i) => (
            <div
              key={`r1-${i}`}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b",
                borderRadius: "50px", padding: "0.5rem 1.1rem 0.5rem 0.6rem",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{pw.icon}</span>
              <span style={{ fontWeight: 500, fontSize: "0.88rem", color: "#e2e8f0" }}>{pw.name}</span>
            </div>
          ))}
        </div>

        {/* Row 2 - scrolls right */}
        <div style={{ display: "flex", gap: "0.75rem", animation: "marqueeRight 40s linear infinite", width: "max-content" }}>
          {[
            { name: "UX/UI Design", icon: "\uD83C\uDFA8" },
            { name: "Hospitality & Luxury", icon: "\uD83C\uDFE8" },
            { name: "Private Aviation", icon: "\uD83D\uDEE9\uFE0F" },
            { name: "Healthcare", icon: "\uD83E\uDE7A" },
            { name: "Sales & Biz Dev", icon: "\uD83D\uDCB0" },
            { name: "Entrepreneurship", icon: "\uD83D\uDE80" },
            { name: "Education & Coaching", icon: "\uD83C\uDF93" },
            { name: "UX/UI Design", icon: "\uD83C\uDFA8" },
            { name: "Hospitality & Luxury", icon: "\uD83C\uDFE8" },
            { name: "Private Aviation", icon: "\uD83D\uDEE9\uFE0F" },
            { name: "Healthcare", icon: "\uD83E\uDE7A" },
            { name: "Sales & Biz Dev", icon: "\uD83D\uDCB0" },
            { name: "Entrepreneurship", icon: "\uD83D\uDE80" },
            { name: "Education & Coaching", icon: "\uD83C\uDF93" },
          ].map((pw, i) => (
            <div
              key={`r2-${i}`}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b",
                borderRadius: "50px", padding: "0.5rem 1.1rem 0.5rem 0.6rem",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{pw.icon}</span>
              <span style={{ fontWeight: 500, fontSize: "0.88rem", color: "#e2e8f0" }}>{pw.name}</span>
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
            CrewTransition doesn't send your answers to an AI and hope for the best. Every
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
                desc: "Adapts analysis depth to your completion level with explicit confidence disclosures, so you always know where the evidence is strong and where it's inferred.",
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
            { stat: "3", label: "Progressive assessment stages" },
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
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 500 }}>
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
          Ready for your career takeoff?
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
        CrewTransition {APP_VERSION} — Built for flight attendants worldwide
      </footer>
    </div>
  );
}

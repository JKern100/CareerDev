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
            href="#what-you-get"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            What you get
          </a>
          <a
            href="#pathways"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            Pathways
          </a>
          <a
            href="/methodology"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            Methodology
          </a>
          <a
            href="/blog"
            className="nav-link-desktop"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
          >
            Blog
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
            src="/hero-background.png"
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

          {/* Hero wordmark removed — the logo already appears in the nav */}

          {/* Headline */}
          <h1
            className="hero-headline"
            style={{
              fontSize: "clamp(1.75rem, 4.5vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: "1rem",
              letterSpacing: "0.01em",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            You&apos;ve built{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              more skill in the air
            </span>{" "}
            than you realize.
          </h1>

          {/* People image removed per design direction */}

          <p
            className="hero-subtitle"
            style={{
              fontSize: "1.1rem",
              color: "#cbd5e1",
              maxWidth: "620px",
              margin: "0 auto 1.5rem",
              lineHeight: 1.7,
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            A free, AI-powered assessment that translates your cabin-crew skills into their
            real value across other industries — with matching pathways, salary ranges, and the
            steps to get there. Built only for flight attendants. No commitment, no judgment —
            just see what you&apos;re worth.
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
              {
                label: "What you're worth elsewhere",
                icon: (
                  <path d="M6 3h12l4 6-10 12L2 9z M3 9h18 M9 3l3 18 M15 3l-3 18" />
                ),
              },
              {
                label: "Real salary ranges",
                icon: <path d="M4 4v16h16 M8 14l3-3 3 2 4-6" />,
              },
              {
                label: "A plan, if you ever want it",
                icon: (
                  <path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z M12 11h.01" />
                ),
              },
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
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </svg>
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
                  onClick={() => router.push("/start")}
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
                  See what you&apos;re worth
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
            Free. No account needed. Completely private.
          </p>
        </div>
      </section>

      {/* 60-second hook */}
      <section
        style={{
          padding: "2.5rem 1rem",
          maxWidth: "880px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(56,189,248,0.04))",
            border: "1px solid rgba(37,99,235,0.3)",
            borderRadius: "16px",
            padding: "2rem 1.75rem",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#60a5fa", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            60 seconds · no signup
          </p>
          <h2 style={{ fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)", fontWeight: 700, marginBottom: "0.75rem" }}>
            Get a first read on what you&apos;re worth
          </h2>
          <p style={{ color: "#cbd5e1", maxWidth: "560px", margin: "0 auto 1.5rem", fontSize: "0.98rem", lineHeight: 1.6 }}>
            Five quick taps and you&apos;ll see your three strongest pathways, a salary range, and one
            strength you&apos;re underrating — before you decide whether to go further.
          </p>
          <button
            onClick={() => router.push("/start")}
            style={{
              background: "transparent",
              color: "#f1f5f9",
              border: "1px solid #1e293b",
              padding: "0.85rem 2rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            See what my skills are worth
          </button>
        </div>
      </section>

      {/* What you get */}
      <section
        id="what-you-get"
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
          What you get
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
              title: "What you're worth elsewhere",
              desc: "A specific, AI-powered read on what your cabin-crew skills are actually worth on the ground — translated into real value across other industries.",
            },
            {
              step: "02",
              title: "Pathways matched to you",
              desc: "Career pathways scored against your own profile, each with salary ranges and the credentials that open the door — so you can see where you'd fit and what it pays.",
            },
            {
              step: "03",
              title: "A plan, if you ever want it",
              desc: "A step-by-step transition plan you can act on now or simply keep for later. No pressure, no timeline — it's there whenever you're ready.",
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
                {item.step}
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
            Career pathways, scored to you
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "520px", margin: "0 auto", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Interest fit, skill match, feasibility, compensation, and more &mdash; each pathway ranked against your unique profile.
          </p>
        </div>

        {/* Lead pathways - scrolling marquee */}
        <div style={{ display: "flex", gap: "0.75rem", animation: "marqueeLeft 35s linear infinite", width: "max-content", marginBottom: "1.75rem" }}>
          {[
            { name: "Corporate L&D", icon: "\uD83C\uDFAF" },
            { name: "HR & Talent", icon: "\uD83E\uDD1D" },
            { name: "Customer Experience", icon: "\u2B50" },
            { name: "Hospitality & Luxury", icon: "\uD83C\uDFE8" },
            { name: "Safety & Compliance", icon: "\uD83D\uDEE1\uFE0F" },
            { name: "Private Aviation", icon: "\uD83D\uDEE9\uFE0F" },
            { name: "Operations", icon: "\u2699\uFE0F" },
            { name: "Project Management", icon: "\uD83D\uDCCA" },
            // duplicated for a seamless infinite scroll
            { name: "Corporate L&D", icon: "\uD83C\uDFAF" },
            { name: "HR & Talent", icon: "\uD83E\uDD1D" },
            { name: "Customer Experience", icon: "\u2B50" },
            { name: "Hospitality & Luxury", icon: "\uD83C\uDFE8" },
            { name: "Safety & Compliance", icon: "\uD83D\uDEE1\uFE0F" },
            { name: "Private Aviation", icon: "\uD83D\uDEE9\uFE0F" },
            { name: "Operations", icon: "\u2699\uFE0F" },
            { name: "Project Management", icon: "\uD83D\uDCCA" },
          ].map((pw, i) => (
            <div
              key={`lead-${i}`}
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

        {/* More pathways - quieter, static */}
        <div style={{ textAlign: "center", padding: "0 1rem" }}>
          <p style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.85rem" }}>
            More pathways
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", maxWidth: "640px", margin: "0 auto" }}>
            {[
              "Business Analysis",
              "Sales & Biz Dev",
              "Education & Coaching",
              "Entrepreneurship",
              "Aviation Training",
              "Healthcare",
              "UX/UI Design",
            ].map((name) => (
              <span
                key={name}
                style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b",
                  borderRadius: "50px", padding: "0.4rem 0.9rem",
                  fontSize: "0.82rem", color: "#94a3b8", whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Why it's built for crew */}
      <section
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
          Why it&apos;s built for crew
        </h2>
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

      {/* Social proof — PLACEHOLDER: replace with real cabin-crew testimonials when available.
          Intentionally no fabricated quotes; this is an honest, neutral band holding the slot. */}
      <section
        style={{
          padding: "2.5rem 1rem",
          maxWidth: "1000px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Built with and for working cabin crew
        </p>
        {/* TODO: testimonial cards / logos go here once collected */}
      </section>

      {/* Methodology (demoted — full detail lives on /methodology) */}
      <section
        id="methodology"
        style={{
          padding: "3rem 1rem",
          maxWidth: "720px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
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
          How it works under the hood
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
          Rigorous by design — not a generic chatbot
        </h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: "1.02rem", marginBottom: "1.5rem" }}>
          Your answers run through a deterministic, rule-based scoring engine and a
          purpose-built aviation knowledge base — then AI-powered analysis turns the
          results into clear, personal guidance. Transparent scoring, built only for crew.
        </p>
        <a
          href="/methodology"
          style={{
            display: "inline-block",
            color: "#60a5fa",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            borderBottom: "1px solid rgba(96,165,250,0.4)",
            paddingBottom: "2px",
          }}
        >
          See how it works →
        </a>
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
          See what you&apos;re worth — on your terms
        </h2>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          Take the 60-second read. No account, no commitment, completely private — just your value, made clear.
        </p>
        <button
          onClick={() => router.push(isLoggedIn ? dashboardPath : "/start")}
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
          {isLoggedIn ? "Go to dashboard" : "See what my skills are worth"}
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
        <div>CrewTransition {APP_VERSION} — Built for flight attendants worldwide</div>
        <div style={{ marginTop: "0.5rem" }}>
          <a href="/terms" style={{ color: "#64748b", textDecoration: "underline" }}>Terms</a>
          {" · "}
          <a href="/privacy" style={{ color: "#64748b", textDecoration: "underline" }}>Privacy</a>
          {" · "}
          <a href="/refund" style={{ color: "#64748b", textDecoration: "underline" }}>Refunds</a>
        </div>
      </footer>
    </div>
  );
}

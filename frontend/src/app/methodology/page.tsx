import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — How CrewTransition works under the hood",
  description:
    "A research-grade advisory framework built only for flight attendants: a deterministic scoring engine, a purpose-built aviation knowledge base, and AI-powered analysis.",
};

export default function MethodologyPage() {
  return (
    <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <img src="/logo.svg" alt="CrewTransition" width={32} height={32} />
          <span style={{ fontWeight: 600, fontSize: "1rem", color: "#f1f5f9" }}>
            Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span>
          </span>
        </a>
      </nav>

      <section
        style={{
          padding: "2rem 1rem 4rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
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
          <h1
            style={{
              fontSize: "1.9rem",
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
          </h1>
          <p
            style={{
              color: "#94a3b8",
              maxWidth: "680px",
              margin: "0 auto",
              lineHeight: 1.7,
              fontSize: "1.05rem",
            }}
          >
            CrewTransition doesn&apos;t send your answers to an AI and hope for the best. Every
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
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "2rem",
              textAlign: "center",
            }}
          >
            What powers every recommendation
          </h2>
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
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "#e2e8f0",
                  }}
                >
                  {item.title}
                </h3>
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
            marginBottom: "3rem",
          }}
        >
          {[
            { stat: "3,000+", label: "Lines of domain knowledge" },
            { stat: "3", label: "Progressive assessment stages" },
            { stat: "17", label: "Scored career pathways" },
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

        {/* Back to start */}
        <div style={{ textAlign: "center" }}>
          <a
            href="/start"
            style={{
              display: "inline-block",
              background: "#2563eb",
              color: "white",
              padding: "0.85rem 2rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            See what my skills are worth
          </a>
        </div>
      </section>
    </div>
  );
}

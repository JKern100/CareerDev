import Link from "next/link";

const pathways = [
  {
    title: "Aviation Training & L&D",
    desc: "Cabin crew instructor, training operations",
    icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  },
  {
    title: "HR & People Ops",
    desc: "HR generalist, talent acquisition, HRBP",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    title: "Customer Experience",
    desc: "Customer success, service excellence",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
  {
    title: "Safety & Compliance",
    desc: "HSE, incident/quality systems",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

const stats = [
  { value: "92.3M", label: "Guests through Dubai International (2024)" },
  { value: "8", label: "Career pathways mapped" },
  { value: "108", label: "Adaptive questions" },
  { value: "0%", label: "UAE personal income tax" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-card-border bg-card-bg/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="text-xl font-bold text-primary">CrewPath</span>
          </div>
          <Link
            href="/questionnaire"
            className="bg-primary text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-light transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <p className="text-accent font-semibold mb-3 uppercase tracking-wide text-sm">
            UAE-First Career Platform for Flight Crew
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-foreground">
            Your next career move,{" "}
            <span className="text-primary">ranked and planned</span>
          </h1>
          <p className="text-lg text-muted mb-8 leading-relaxed max-w-2xl">
            From &quot;I&apos;m thinking about leaving flying&quot; to a ranked
            set of realistic career pathways — with UAE salary bands, training
            plans, and cited recommendations you can trust.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/questionnaire"
              className="bg-primary text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary-light transition shadow-lg"
            >
              Start Your Assessment
            </Link>
            <a
              href="#pathways"
              className="border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary hover:text-white transition"
            >
              Explore Pathways
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary text-white py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold mb-1">{s.value}</div>
              <div className="text-sm opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Complete the Assessment",
              desc: "Answer adaptive questions about your skills, preferences, constraints, and goals. Your answers drive a transparent scoring engine.",
            },
            {
              step: "2",
              title: "Get Ranked Pathways",
              desc: "Receive your top career pathways ranked by fit score, with salary bands, feasibility flags, and evidence-based justifications.",
            },
            {
              step: "3",
              title: "Build Your Plan",
              desc: "Get an actionable timeline with training recommendations, credential options, and UAE-specific guidance on visas and benefits.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-card-bg border border-card-border rounded-xl p-8 hover:shadow-lg transition"
            >
              <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pathways */}
      <section id="pathways" className="bg-card-bg py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Career Pathways for Flight Crew
          </h2>
          <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
            Built on the transferable skills flight attendants use every day:
            public interaction, conflict resolution, compliance, and instructing
            others.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pathways.map((p) => (
              <div
                key={p.title}
                className="border border-card-border rounded-xl p-6 hover:shadow-md transition bg-background"
              >
                <svg
                  className="w-10 h-10 text-primary mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={p.icon}
                  />
                </svg>
                <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                <p className="text-muted text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 text-muted text-sm">
            + Operations, Project Management, Tech Pivot, and Entrepreneurship
            pathways
          </div>
        </div>
      </section>

      {/* UAE section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">
              Built for the UAE Market
            </h2>
            <ul className="space-y-4">
              {[
                "UAE residency & visa scenario modeling (employer-sponsored, family, green residency)",
                "Notice period and end-of-service benefit calculations",
                "No personal income tax — built into compensation modeling",
                "Salary bands from Cooper Fitch UAE Salary Guide",
                "UAE-accessible training programs and postgraduate options",
                "PDPL-compliant privacy controls from day one",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-primary/5 rounded-2xl p-8 border border-primary/20">
            <h3 className="font-semibold text-lg mb-4 text-primary">
              Sample Salary Bands (AED/month)
            </h3>
            <div className="space-y-3">
              {[
                { role: "L&D Specialist", range: "16,000 - 23,000" },
                { role: "HR Generalist", range: "16,000 - 20,000" },
                { role: "Customer Success Manager", range: "27,000 - 39,000" },
                { role: "Operations Manager", range: "21,000 - 39,000" },
                { role: "HSE Manager", range: "24,000 - 36,000" },
                { role: "IT Project Manager", range: "39,000 - 55,000" },
              ].map((s) => (
                <div
                  key={s.role}
                  className="flex justify-between items-center py-2 border-b border-card-border last:border-0"
                >
                  <span className="text-sm font-medium">{s.role}</span>
                  <span className="text-sm text-primary font-semibold">
                    {s.range}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">
              Source: Cooper Fitch UAE Salary Guide 2024. Treat as market
              estimates.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to explore your next chapter?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Take the assessment to get your personalized career pathway ranking
            — transparent scoring, cited sources, no guesswork.
          </p>
          <Link
            href="/questionnaire"
            className="bg-accent text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-accent-light transition shadow-lg inline-block"
          >
            Start Free Assessment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white/60 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p className="mb-2">
            CrewPath provides informational career guidance only. Verify all
            legal, visa, and salary information with official sources.
          </p>
          <p>
            Salary data sourced from Cooper Fitch UAE Salary Guide 2024. UAE
            labor references from MOHRE and official UAE government portals.
          </p>
        </div>
      </footer>
    </div>
  );
}

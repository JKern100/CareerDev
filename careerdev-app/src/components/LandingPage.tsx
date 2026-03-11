"use client";

import { useAppState } from "@/lib/store";

export default function LandingPage() {
  const { dispatch } = useAppState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Hero Section */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">
            CD
          </div>
          <span className="text-xl font-semibold">CareerDev</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm text-slate-300">
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#pathways" className="hover:text-white transition">Pathways</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <section className="py-20 md:py-32 text-center">
          <div className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm mb-6">
            Built for UAE-based flight crew
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 max-w-4xl mx-auto">
            Your career beyond
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              {" "}the cabin
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            AI-powered career advice built for cabin crew. Get ranked career pathways,
            salary comparisons, and a concrete transition plan grounded in UAE labor
            rules and real market data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => dispatch({ type: "SET_STEP", step: "consent" })}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-lg font-semibold transition shadow-lg shadow-blue-500/25"
            >
              Start your assessment
            </button>
            <a
              href="#how"
              className="px-8 py-4 border border-slate-600 hover:border-slate-400 rounded-xl text-lg transition"
            >
              Learn more
            </a>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            108 guided questions. 8 career pathways. UAE-specific salary data.
          </p>
        </section>

        {/* Value Props */}
        <section id="how" className="py-20 grid md:grid-cols-4 gap-8">
          {[
            {
              title: "Flight-crew native",
              desc: "Skills and pathways grounded in what flight attendants actually do: safety, service, conflict resolution, compliance, and instructing.",
            },
            {
              title: "UAE-first realism",
              desc: "Built-in modeling of UAE residency, work permits, notice periods, end-of-service benefits, and zero personal income tax.",
            },
            {
              title: "Explainable scores",
              desc: "Deterministic scoring with transparent evidence. See exactly why each pathway fits you and what drove your ranking.",
            },
            {
              title: "Cited AI output",
              desc: "Every recommendation cites official sources. No uncited claims about salaries, visas, or credentials.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </section>

        {/* Pathways Preview */}
        <section id="pathways" className="py-20">
          <h2 className="text-3xl font-bold text-center mb-4">
            8 career pathways tailored for cabin crew
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Each pathway maps your transferable skills to real UAE job families
            with salary data from the Cooper Fitch UAE Salary Guide 2024.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Aviation Training", salary: "16k–36k AED/mo" },
              { name: "Corporate L&D", salary: "16k–39k AED/mo" },
              { name: "Human Resources", salary: "16k–54k AED/mo" },
              { name: "Customer Experience", salary: "27k–39k AED/mo" },
              { name: "Operations", salary: "21k–39k AED/mo" },
              { name: "Safety / HSE", salary: "14k–36k AED/mo" },
              { name: "Project Management", salary: "39k–55k AED/mo" },
              { name: "Tech Pivot (UX/BA)", salary: "11k–34k AED/mo" },
            ].map((p) => (
              <div
                key={p.name}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition"
              >
                <h4 className="font-semibold mb-1">{p.name}</h4>
                <p className="text-blue-300 text-sm">{p.salary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Register", desc: "Quick signup with consent and privacy controls." },
              { step: "2", title: "Answer", desc: "108 adaptive questions across 8 modules. Skip what doesn't apply." },
              { step: "3", title: "Get ranked", desc: "Deterministic scoring produces your top 5 career pathways." },
              { step: "4", title: "Plan", desc: "Detailed transition plan with timelines, credentials, and salary data." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h4 className="font-semibold mb-2">{s.title}</h4>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Preview */}
        <section id="pricing" className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-2">Free Preview</h3>
              <p className="text-3xl font-bold mb-4">AED 0</p>
              <ul className="text-slate-400 text-sm space-y-2">
                <li>Top 2 pathways</li>
                <li>Generic next steps</li>
                <li>Basic salary preview</li>
              </ul>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 ring-2 ring-blue-500/20">
              <h3 className="text-lg font-semibold mb-2">Full Report</h3>
              <p className="text-3xl font-bold mb-4">
                AED 149<span className="text-sm font-normal text-slate-400">/one-time</span>
              </p>
              <ul className="text-slate-300 text-sm space-y-2">
                <li>All 8 pathways ranked</li>
                <li>Detailed salary bands</li>
                <li>Course recommendations</li>
                <li>Transition timeline</li>
                <li>PDF export</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-2">Advisor Session</h3>
              <p className="text-3xl font-bold mb-4">
                AED 299<span className="text-sm font-normal text-slate-400">/session</span>
              </p>
              <ul className="text-slate-400 text-sm space-y-2">
                <li>Full report included</li>
                <li>30-min advisor call</li>
                <li>Report refinement</li>
                <li>Follow-up plan</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to explore what&apos;s next?</h2>
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: "consent" })}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-lg font-semibold transition shadow-lg shadow-blue-500/25"
          >
            Start your free assessment
          </button>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>
          CareerDev is informational only. Verify all legal, visa, and salary information with official sources.
          <br />
          UAE PDPL compliant. Your data is never shared without consent.
        </p>
      </footer>
    </div>
  );
}

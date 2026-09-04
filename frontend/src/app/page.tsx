// Accent palette: a restrained nod to Ukraine — blue over gold, flag order.
const UA_BLUE = "#2b6cd4";
const UA_GOLD = "#f2c94c";

export default function Home() {
  return (
    <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Blue-over-gold band across the top. */}
      <div aria-hidden style={{ height: "3px", background: UA_BLUE }} />
      <div aria-hidden style={{ height: "3px", background: UA_GOLD }} />

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <img src="/logo.svg" alt="CrewTransition" width={36} height={36} />
        <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
          Crew<span style={{ color: UA_BLUE, fontWeight: 700 }}>Transition</span>
        </span>
      </nav>

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
        <h1
          style={{
            fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
            lineHeight: 1.25,
            fontWeight: 700,
            margin: "0 0 1.75rem",
          }}
        >
          Thank you — CrewTransition is closing
        </h1>

        <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "#cbd5e1", margin: "0 0 1.5rem" }}>
          CrewTransition set out to help cabin crew see what their skills are worth as they
          think about what comes next. It never reached enough people to sustain itself, so
          I&apos;m closing it down. It&apos;s been a genuinely good experience. It began as a
          collaboration from which I learned a lot, and I&apos;m most grateful for it.
        </p>

        <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "#cbd5e1", margin: "0 0 2.5rem" }}>
          Cabin crew carry far more skill than the industry gives them credit for: composure
          when a schedule collapses, reading people in seconds, running a cabin full of
          strangers through a bad night without anyone noticing the effort. That was true
          before this site existed, and it stays true now.
        </p>

        <section style={{ borderTop: `1px solid ${UA_GOLD}33`, paddingTop: "1.75rem" }}>
          <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "#cbd5e1", margin: 0 }}>
            <strong style={{ color: UA_GOLD }}>If you&apos;d like to take it forward.</strong>{" "}
            The assessment engine is built and works well. If you know this world and want to
            carry it on, I&apos;d love to hear from you:{" "}
            <a
              href="mailto:jay06525@gmail.com"
              style={{ color: "#7aa7ec", textDecoration: "underline" }}
            >
              jay06525@gmail.com
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}

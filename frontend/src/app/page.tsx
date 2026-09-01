export default function Home() {
  return (
    <div style={{ background: "#0a0e1a", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Nav — wordmark plus a quiet sign-in link, kept until accounts close. */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/logo.svg" alt="CrewTransition" width={36} height={36} />
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            Crew<span style={{ color: "#2563eb", fontWeight: 700 }}>Transition</span>
          </span>
        </div>
        <a
          href="/login"
          style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}
        >
          Sign in
        </a>
      </nav>

      <main
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "3rem 1.25rem 5rem",
        }}
      >
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
          CrewTransition set out to help cabin crew see what their skills are worth as
          they think about what comes next. It never reached enough people to sustain
          itself, so I&apos;m closing it down. It&apos;s been a genuinely good experience.
          And it began as a collaboration that opened this world to me and helped make it
          real, which I&apos;m most grateful for.
        </p>

        <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "#cbd5e1", margin: "0 0 2.5rem" }}>
          Cabin crew carry far more skill than the industry gives them credit for:
          composure when a schedule collapses, reading people in seconds, running a cabin
          full of strangers through a bad night without anyone noticing the effort. That
          was true before this site existed, and it stays true now.
        </p>

        <section
          style={{
            borderTop: "1px solid #1e293b",
            paddingTop: "1.75rem",
            marginBottom: "1.75rem",
          }}
        >
          <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "#cbd5e1", margin: 0 }}>
            <strong style={{ color: "#f1f5f9" }}>If you&apos;d like to take it forward.</strong>{" "}
            The assessment engine is built and works. If you know this world and want to
            carry it on — whether you&apos;ve been with the project from the start or are
            finding it now — I&apos;d like to hear from you:{" "}
            <a
              href="mailto:jay06525@gmail.com"
              style={{ color: "#60a5fa", textDecoration: "underline" }}
            >
              jay06525@gmail.com
            </a>
          </p>
        </section>

        {/* Remove this block after 5 September 2026, once accounts are deleted. */}
        <section style={{ borderTop: "1px solid #1e293b", paddingTop: "1.75rem" }}>
          <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "#cbd5e1", margin: 0 }}>
            <strong style={{ color: "#f1f5f9" }}>If you have an account.</strong>{" "}
            Accounts and saved reports will be deleted on September 5, 2026. Until then you
            can <a href="/login" style={{ color: "#60a5fa", textDecoration: "underline" }}>log in</a>,
            open your results, and use &quot;Save a copy (print / PDF)&quot;. If you&apos;d
            like your raw data, or want it deleted sooner,{" "}
            <a
              href="mailto:jay06525@gmail.com"
              style={{ color: "#60a5fa", textDecoration: "underline" }}
            >
              email me
            </a>.
          </p>
        </section>
      </main>
    </div>
  );
}

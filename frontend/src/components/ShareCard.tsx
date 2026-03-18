import { PathwayResult } from "@/lib/api";

interface ShareCardProps {
  pathways: PathwayResult[];
  format: "story" | "post";
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function ShareCard({ pathways, format }: ShareCardProps) {
  const top3 = pathways.slice(0, 3);
  const isStory = format === "story";
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  return (
    <div
      id="share-card"
      style={{
        width,
        height,
        background: "linear-gradient(160deg, #0a0e1a 0%, #131836 50%, #0f1629 100%)",
        color: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: isStory ? "120px 72px" : "72px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          right: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-150px",
          left: "-150px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo / Brand */}
      <div
        style={{
          fontSize: "42px",
          fontWeight: 800,
          letterSpacing: "-1px",
          marginBottom: "8px",
          background: "linear-gradient(135deg, #2563eb, #6366f1)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        CareerDev
      </div>
      <div
        style={{
          fontSize: "18px",
          color: "#94a3b8",
          letterSpacing: "3px",
          textTransform: "uppercase",
          marginBottom: isStory ? "80px" : "56px",
        }}
      >
        Career Transition Advisor
      </div>

      {/* Heading */}
      <div
        style={{
          fontSize: "36px",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: isStory ? "64px" : "48px",
          lineHeight: 1.3,
        }}
      >
        My Top Career Matches
      </div>

      {/* Pathway cards */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          marginBottom: isStory ? "80px" : "56px",
        }}
      >
        {top3.map((p, i) => (
          <div
            key={p.pathway_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              background: "rgba(255,255,255,0.06)",
              border: i === 0 ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "28px 32px",
            }}
          >
            <span style={{ fontSize: "44px", flexShrink: 0 }}>{MEDAL[i]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.pathway_name}
              </div>
              <div style={{ fontSize: "18px", color: "#94a3b8" }}>
                {p.typical_roles?.slice(0, 2).join(" · ") || p.description?.slice(0, 60)}
              </div>
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#2563eb",
                flexShrink: 0,
              }}
            >
              {Math.round(p.adjusted_score)}%
            </div>
          </div>
        ))}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: "26px",
          fontStyle: "italic",
          color: "#cbd5e1",
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
        &ldquo;My next career chapter starts here&rdquo;
      </div>

      {/* CTA */}
      <div
        style={{
          fontSize: "20px",
          color: "#64748b",
          letterSpacing: "1px",
        }}
      >
        Discover yours at careerdev.app
      </div>
    </div>
  );
}

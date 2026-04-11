import "./globals.css";
import type { Metadata } from "next";
import { APP_VERSION } from "@/lib/api";

export const metadata: Metadata = {
  title: "CrewTransition — Plan Your Career Takeoff",
  description: "AI-powered guidance, real career pathways, and clear next steps — for life beyond the cabin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        <footer
          style={{
            textAlign: "center",
            padding: "1.5rem 1rem",
            fontSize: "0.75rem",
            color: "#64748b",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span>{APP_VERSION}</span>
          {" · "}
          <a href="/terms" style={{ color: "#64748b", textDecoration: "underline" }}>Terms</a>
          {" · "}
          <a href="/privacy" style={{ color: "#64748b", textDecoration: "underline" }}>Privacy</a>
          {" · "}
          <a href="/refund" style={{ color: "#64748b", textDecoration: "underline" }}>Refunds</a>
        </footer>
      </body>
    </html>
  );
}

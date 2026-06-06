import "./globals.css";
import type { Metadata } from "next";
import { APP_VERSION } from "@/lib/api";
import { SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CrewTransition — See what your skills are worth",
  description: "A free, private, AI-powered look at what your cabin-crew skills are worth across other industries — with matching pathways, salary ranges, and the steps to get there. Built for flight attendants. No signup.",
  openGraph: {
    title: "See what your skills are worth",
    description: "Built for flight attendants. Free · private · AI-powered.",
    url: SITE_URL,
    siteName: "CrewTransition",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CrewTransition — See what your skills are worth" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "See what your skills are worth",
    description: "Built for flight attendants. Free · private · AI-powered.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/favicon-180.png", sizes: "180x180" }],
  },
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

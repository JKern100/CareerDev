import "./globals.css";
import type { Metadata } from "next";
import pkg from "../../package.json";

export const metadata: Metadata = {
  title: "CareerDev — Flight Crew Career Transition",
  description: "AI-powered career advice for flight crew in the UAE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer
          style={{
            textAlign: "center",
            padding: "1.5rem 1rem",
            fontSize: "0.75rem",
            color: "#64748b",
            borderTop: "1px solid var(--border)",
            marginTop: "2rem",
          }}
        >
          V{pkg.version}
        </footer>
      </body>
    </html>
  );
}

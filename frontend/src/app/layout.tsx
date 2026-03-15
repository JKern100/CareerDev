import "./globals.css";
import type { Metadata } from "next";
import { APP_VERSION } from "@/lib/api";

export const metadata: Metadata = {
  title: "CareerDev — Flight Crew Career Transition",
  description: "AI-powered career advice for flight crew",
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
          {APP_VERSION}
        </footer>
      </body>
    </html>
  );
}

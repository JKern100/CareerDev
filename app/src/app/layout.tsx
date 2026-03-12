import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewPath - AI Career Advice for Flight Crew",
  description:
    "AI-powered career development and transition planning for flight crew in the UAE. Get ranked career pathways, salary insights, and actionable plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

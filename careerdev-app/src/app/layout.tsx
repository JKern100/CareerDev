import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "CareerDev - AI Career Advice for Flight Crew",
  description:
    "AI-powered career transition app for UAE-based flight crew. Get ranked career pathways, salary comparisons, and a concrete transition plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

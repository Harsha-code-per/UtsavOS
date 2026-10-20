import type { Metadata, Viewport } from "next";
import { Mukta, Rozha_One } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const display = Rozha_One({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin", "devanagari"],
});

const body = Mukta({
  variable: "--font-body",
  weight: ["300", "400", "600", "700"],
  subsets: ["latin", "devanagari"],
});

export const metadata: Metadata = {
  title: { default: "UtsavOS — AI celebration planner", template: "%s · UtsavOS" },
  description:
    "Plan weddings, birthdays and community events with Gemini: budgets, timelines, vendor checklists and personalized ideas from one sentence.",
};

export const viewport: Viewport = { themeColor: "#0F0D24" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request so Next.js can stamp the CSP nonce from src/proxy.ts onto its scripts.
  await connection();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

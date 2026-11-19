import type { Metadata } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/manrope/wght.css";
import SwarmCursor from "@/components/SwarmCursor";
import { Navigation } from "@/components/layout/Navigation";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { portfolio } from "@/data/portfolio";
import "./globals.css";

const displayFont = localFont({ src: "../../public/fonts/display.ttf", variable: "--font-display", display: "swap" });
const monoFont = localFont({ src: "../../public/fonts/mono.ttf", variable: "--font-mono", display: "swap" });
const swarmColor: [number, number, number] = [111, 77, 166];

export const metadata: Metadata = {
  title: `${portfolio.name} — Portfolio`,
  description: portfolio.shortBio,
  openGraph: { title: `${portfolio.name} — Portfolio`, description: portfolio.shortBio, type: "website" },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: portfolio.name,
  email: portfolio.email,
  sameAs: [portfolio.socials.github, portfolio.socials.linkedin, portfolio.socials.instagram],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${displayFont.variable} ${monoFont.variable}`}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} /><MotionProvider><Navigation />{children}</MotionProvider><SwarmCursor count={60} color={swarmColor} size={1.55} /></body></html>;
}

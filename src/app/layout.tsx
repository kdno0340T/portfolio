import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhanush — Interactive Portfolio",
  description: "Portfolio of Dhanush, Computer Science Engineering student, developer, and technology enthusiast.",
  openGraph: { title: "Dhanush — Interactive Portfolio", description: "Projects, interests, and explorations by Dhanush.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

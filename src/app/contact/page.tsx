import { ArrowUpRight } from "lucide-react";
import { portfolio } from "@/data/portfolio";
import { Footer } from "@/components/layout/Footer";

export default function ContactPage() {
  return <><main id="top" className="route-enter"><section className="stub-page"><p className="mono">OPEN CHANNEL / CONTACT</p><h1>Let&apos;s talk.</h1><p>{portfolio.tagline}</p><p>Have an idea to build, learn, or talk through?</p><p><a className="button button-primary" href={`mailto:${portfolio.email}`}>Email {portfolio.email} <ArrowUpRight size={14}/></a></p><div className="contact-socials mono"><a className="text-link" aria-label="Dhanush on GitHub" href={portfolio.socials.github} target="_blank" rel="noopener noreferrer">GITHUB <ArrowUpRight size={14}/></a><a className="text-link" aria-label="Dhanush on LinkedIn" href={portfolio.socials.linkedin} target="_blank" rel="noopener noreferrer">LINKEDIN <ArrowUpRight size={14}/></a><a className="text-link" aria-label="Dhanush on Instagram" href={portfolio.socials.instagram} target="_blank" rel="noopener noreferrer">INSTAGRAM <ArrowUpRight size={14}/></a></div></section></main><Footer /></>;
}

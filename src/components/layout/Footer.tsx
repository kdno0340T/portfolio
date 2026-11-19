import { portfolio } from "@/data/portfolio";

export function Footer() {
  return <footer className="site-footer mono" data-theme="dark"><span>© {new Date().getFullYear()} {portfolio.name}</span><a aria-label="Dhanush on GitHub" href={portfolio.socials.github} target="_blank" rel="noopener noreferrer">GITHUB ↗</a><a aria-label="Dhanush on LinkedIn" href={portfolio.socials.linkedin} target="_blank" rel="noopener noreferrer">LINKEDIN ↗</a><a aria-label="Dhanush on Instagram" href={portfolio.socials.instagram} target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><a href={`mailto:${portfolio.email}`}>EMAIL ↗</a><a href="#top">BACK TO TOP ↑</a></footer>;
}

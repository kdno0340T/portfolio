import { portfolio } from "@/data/portfolio";
import { Footer } from "@/components/layout/Footer";

const tools = Array.from(new Set(portfolio.projects.flatMap((project) => project.technologies)));
const collaborators = portfolio.collaborations.filter((item) => !item.startsWith("["));

export default function CollaborationsPage() {
  return <><main id="top"><section className="stub-page" data-theme="light"><p className="mono">COLLABORATIONS / TOOLKIT</p><h1>Stack</h1><p>Tools currently used across the projects in this portfolio.</p></section><section className="work-section texture-dark" data-theme="dark"><div className="section-topline"><p className="mono">PROJECT TECHNOLOGIES</p><p className="mono">{String(tools.length).padStart(2, "0")} TOOLS</p></div><div className="stack-grid">{tools.map((tool, index) => <div className="stack-item" key={tool}><span className="mono">{String(index + 1).padStart(2, "0")}</span><h2>{tool}</h2></div>)}</div><div className="collab-note"><p className="mono">COLLABORATIONS</p>{collaborators.length ? <ul>{collaborators.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Verified collaborations will be added here when available.</p>}</div></section></main><Footer /></>;
}

import { portfolio } from "@/data/portfolio";
import { Footer } from "@/components/layout/Footer";

const entries = portfolio.journal.filter((entry) => !entry.startsWith("["));

export default function JournalPage() {
  return <><main id="top"><section className="stub-page" data-theme="light"><p className="mono">JOURNAL / BUILD NOTES</p><h1>Journal</h1><p>Notes on learning and work in progress.</p></section><section className="work-section texture-dark" data-theme="dark"><div className="section-topline"><p className="mono">LATEST NOTES</p><p className="mono">{String(entries.length).padStart(2, "0")} ENTRIES</p></div>{entries.length ? <div className="journal-list">{entries.map((entry, index) => <article className="journal-item" key={`${index}-${entry}`}><span className="mono">{String(index + 1).padStart(2, "0")}</span><h2>{entry}</h2></article>)}</div> : <p className="journal-empty mono">Journal entries will appear here when added to portfolio.journal.</p>}</section></main><Footer /></>;
}

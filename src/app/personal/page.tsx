import { portfolio } from "@/data/portfolio";
import { Footer } from "@/components/layout/Footer";

export default function PersonalPage() {
  return <><main id="top"><section className="stub-page" data-theme="light"><p className="mono">PERSONAL / PHOTO NOTES</p><h1>Personal</h1><p>{portfolio.interests.join(" · ")}</p></section><section className="photo-section texture-dark" data-theme="dark"><div className="photo-section-heading"><p className="mono">A FEW FRAMES OUTSIDE THE SCREEN</p><span className="mono">{String(portfolio.photos.personal.length).padStart(2, "0")} FRAMES</span></div><div className="photo-strip">{portfolio.photos.personal.map((photo, index) => <figure className="photo-frame" key={photo.src}><div className="photo-frame-image" style={{ backgroundImage: `url("${photo.src}")` }} role="img" aria-label={photo.alt}/><figcaption className="mono"><span>0{index + 1} / {photo.source}</span>{photo.caption}</figcaption></figure>)}</div></section></main><Footer /></>;
}

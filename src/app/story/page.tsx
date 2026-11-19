import Image from "next/image";
import { portfolio } from "@/data/portfolio";
import { Footer } from "@/components/layout/Footer";

export default function StoryPage() {
  return <><main id="top"><section className="stub-page" data-theme="light"><p className="mono">STORY / EDUCATION &amp; INTERESTS</p><h1>Story</h1><p>{portfolio.shortBio}</p></section><section className="story-feature" data-theme="light"><div className="story-copy"><p className="section-index mono">EDUCATION</p><h2 className="section-display">Learning<br/>by making.</h2><p>{portfolio.education.degree}</p><p className="story-education">{portfolio.education.institution}<br/>{portfolio.education.stage}</p><p>{portfolio.interests.join(" · ")}</p></div><figure className="story-photo"><Image src={portfolio.hero.fullBody} alt={portfolio.hero.fullBodyAlt} fill sizes="(max-width: 700px) 100vw, 42vw" loading="lazy"/><figcaption className="mono">DHANUSH / PORTRAIT</figcaption></figure></section></main><Footer /></>;
}

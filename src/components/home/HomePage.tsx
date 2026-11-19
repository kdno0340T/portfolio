"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { portfolio } from "@/data/portfolio";
import { Footer } from "@/components/layout/Footer";
import { Preloader } from "@/components/home/Preloader";
import { HomeSections } from "@/components/home/HomeSections";
import { GlyphBackdrop } from "@/components/motion/GlyphBackdrop";

export function HomePage() {
  const [ready, setReady] = useState(false);
  return <>
    <Preloader onComplete={() => setReady(true)} />
    <main id="top" className="page-main page-reveal" data-ready={ready}>
      <section className="hero" data-theme="light" aria-labelledby="hero-title">
        <div className="hero-topline mono"><span>PORTFOLIO / {new Date().getFullYear()}</span><span>COMPUTER SCIENCE · INDIA</span></div>
        <GlyphBackdrop variant="light" rows={4} seed="hero" speedRange={[74, 112]} parallax />
        <h1 className="hero-title" id="hero-title"><span><i>{portfolio.name}</i></span></h1>
        <div className="hero-artwork" data-hero-parallax>
          <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
          <picture className="hero-picture"><Image className="hero-cutout" src={portfolio.hero.cutout} alt={portfolio.hero.alt} width={840} height={1050} priority fetchPriority="high" sizes="(max-width: 700px) 94vw, 55vw" /></picture>
        </div>
        <div className="hero-side-note hero-side-left"><span className="mono">CREATIVE TECHNOLOGIST</span><p>{portfolio.education.degree}</p></div>
        <div className="hero-copy">
          <p className="eyebrow mono">A PERSONAL PROFILE / {portfolio.education.institution}</p>
          <div className="hero-description">
            <div><p className="hero-tagline">{portfolio.tagline}</p><p>{portfolio.shortBio}</p></div>
            <div className="hero-actions"><a className="button button-primary" href="/work">Explore my work <ArrowDownRight size={15} /></a><a className="button" href={`mailto:${portfolio.email}`}>Get in touch <ArrowUpRight size={15} /></a></div>
          </div>
        </div>
        <div className="hero-side-note hero-side-right"><p>Learning by making.<br />Building with curiosity.</p></div>
        <div className="hero-bottomline mono"><span>SCROLL TO EXPLORE</span><span>OPEN TO IDEAS / COLLABORATION</span></div>
      </section>
      <HomeSections />
    </main>
    <Footer />
  </>;
}

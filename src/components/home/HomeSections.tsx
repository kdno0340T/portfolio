"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { portfolio } from "@/data/portfolio";
import { Reveal } from "@/components/motion/Reveal";
import { GlyphBackdrop } from "@/components/motion/GlyphBackdrop";
import { CyberBackdrop } from "@/components/motion/CyberBackdrop";

const projectTools = Array.from(new Set(portfolio.projects.flatMap((project) => project.technologies)));

async function waitForVisualAssets(root: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(Array.from(root.querySelectorAll("img"), (image) => image.decode().catch(() => undefined)));
}

function NumbersTicker() {
  const root = useRef<HTMLDivElement>(null);
  const milestones = portfolio.milestones.length ? portfolio.milestones : [
    { value: portfolio.projects.length, label: "PROJECTS LISTED" },
    { value: projectTools.length, label: "PROJECT TECHNOLOGIES" },
  ];

  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    let context: { revert: () => void } | undefined;
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(async ([gsapModule, triggerModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      await waitForVisualAssets(element);
      if (cancelled) return;
      context = gsap.context(() => {
        element.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
          const target = Number(node.dataset.count ?? 0);
          const value = { current: 0 };
          gsap.to(value, { current: target, duration: 1.7, ease: "power2.out", scrollTrigger: { trigger: node, start: "top 82%", once: true }, onUpdate: () => { node.textContent = Math.round(value.current).toString(); } });
        });
      }, element);
      ScrollTrigger.refresh();
    });
    return () => { cancelled = true; context?.revert(); };
  }, []);

  return <div className="numbers-strip" ref={root}>
    <p className="mono">A FEW THINGS IN MOTION</p>
    <div className="numbers-grid">{milestones.map((item) => <div className="number-item" key={item.label}>
      <p className="number-value"><span data-count={item.value}>{item.value}</span>{item.suffix && <small>{item.suffix}</small>}</p>
      <p className="number-label mono">{item.label}</p>
    </div>)}</div>
  </div>;
}

function SignatureMoments() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = section.current;
    const rail = track.current;
    if (!root || !rail || window.innerWidth <= 700 || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    let context: { revert: () => void } | undefined;
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(async ([gsapModule, triggerModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      await waitForVisualAssets(root);
      if (cancelled) return;
      context = gsap.context(() => {
        const distance = () => Math.max(0, rail.scrollWidth - root.clientWidth);
        if (distance() <= 1) return;
        const titleLine = root.querySelector<HTMLElement>(".signature-title-inner");
        const titleMask = root.querySelector<HTMLElement>(".signature-title-line");
        if (titleLine && titleMask) gsap.fromTo(titleLine, { yPercent: 108, clipPath: "inset(0 0 13% 0)" }, { yPercent: 0, clipPath: "inset(0 0 0% 0)", duration: 1.35, delay: .16, ease: "power3.out", scrollTrigger: { trigger: root, start: "top 35%", once: true }, onComplete: () => { titleLine.style.clipPath = "none"; titleMask.classList.add("is-revealed"); } });
        const cards = rail.querySelectorAll<HTMLElement>(".signature-card");
        gsap.from(cards, { y: 32, opacity: 0, duration: .7, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: root, start: "top 70%", once: true } });
        gsap.to(rail, { x: () => -distance(), ease: "none", scrollTrigger: { trigger: root, start: "top top", end: () => `+=${distance()}`, pin: root, scrub: .65, invalidateOnRefresh: true } });
      }, root);
      ScrollTrigger.refresh();
    });
    return () => { cancelled = true; context?.revert(); };
  }, []);

  return <>
    <section className="signature-stage texture-dark" data-theme="dark" ref={section} aria-labelledby="signature-title">
      <div className="section-topline"><p className="section-index mono">01 / THE WORK SO FAR</p><p className="mono">SELECTED WORK / 03</p></div>
      <h2 className="signature-title" id="signature-title"><span className="signature-title-line"><span className="signature-title-inner">Signature Moments</span></span></h2>
      <div className="signature-track" ref={track}>{portfolio.projects.slice(0, 3).map((project, index) => <article className="signature-card" key={project.number}>
        <a href="/work" className="signature-card-link" aria-label={`Explore ${project.name} in Work`}>
          <div className={`signature-art${project.name === "EnRoute" ? " signature-art-enroute" : ""}`}>{project.name === "EnRoute" ? <div className="enroute-laptop" role="img" aria-label="EnRoute travel interface mockup with an interactive map, custom route, hidden gems and a personalized itinerary"><div className="enroute-screen" aria-hidden="true"><div className="enroute-top"><b>EnRoute</b><span>DISCOVER&nbsp;&nbsp; MAP&nbsp;&nbsp; MY ITINERARY</span></div><div className="enroute-map"><div className="enroute-road enroute-road-a"/><div className="enroute-road enroute-road-b"/><div className="enroute-road enroute-road-c"/><svg viewBox="0 0 600 320" aria-hidden="true"><path d="M85 250 C150 210 137 155 240 177 S330 237 387 152 478 120 525 60"/><circle cx="85" cy="250" r="9"/><circle cx="240" cy="177" r="7"/><circle cx="387" cy="152" r="7"/><circle cx="525" cy="60" r="9"/></svg><span className="enroute-map-label enroute-map-label-a">CUSTOM ROUTE</span><span className="enroute-map-label enroute-map-label-b">HIDDEN GEMS</span></div><div className="enroute-rail"><span>PERSONALIZED EXPLORATION</span><strong>Plan a journey your way.</strong><i/><i/><i/></div></div><div className="enroute-base"/></div> : project.cover ? <Image src={project.cover} alt={project.coverAlt ?? `${project.name} project cover`} fill sizes="(max-width: 700px) 76vw, 44vw" loading="eager" style={{ objectPosition: project.coverPosition ?? "50% 50%" }} /> : <div className={`work-art-fallback work-art-${project.visual}`} />}</div>
          <p className="signature-card-title">{project.name}</p>
          <p className="signature-card-caption mono">{project.category}</p>
        </a>
        <span className="signature-index" aria-hidden="true">0{index + 1}</span>
      </article>)}</div>
    </section>
    <section className="signature-numbers texture-dark" data-theme="dark" aria-label="Portfolio numbers"><NumbersTicker /></section>
  </>;
}

function TechMarquee() {
  const tools = useMemo(() => projectTools, []);
  const half = Math.ceil(tools.length / 2);
  const Row = ({ items, reverse = false }: { items: string[]; reverse?: boolean }) => items.length ? <div className={`marquee-row${reverse ? " is-reverse" : ""}`}><div className="marquee-track">{[...items, ...items, ...items].map((tool, index) => <span className="marquee-item" key={`${tool}-${index}`}>{tool}<i aria-hidden="true">✳</i></span>)}</div></div> : null;
  return <section className="tech-section texture-dark" data-theme="dark" aria-label="Technology used in projects">
    <div className="tech-heading"><p className="mono">TOOLS USED ACROSS THESE PROJECTS</p><span className="mono">{String(tools.length).padStart(2, "0")} / STACK</span></div>
    <h2 className="tech-title">Built with curiosity.</h2>
    <div className="marquee" aria-label={tools.join(", ")}><Row items={tools.slice(0, half)} /><Row items={tools.slice(half)} reverse /></div>
    <div className="tech-footnote mono"><span>TOOLS / TECHNOLOGIES</span><a href="/collaborations">VIEW THE STACK <ArrowUpRight size={14} /></a></div>
  </section>;
}

function movePowerCard(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const face = event.currentTarget.querySelector<HTMLElement>(".power-card-face");
  if (!face) return;
  const rect = face.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  face.style.setProperty("--tilt-x", `${(x - .5) * 12}deg`);
  face.style.setProperty("--tilt-y", `${(.5 - y) * 12}deg`);
  face.style.setProperty("--spot-x", `${x * 100}%`);
  face.style.setProperty("--spot-y", `${y * 100}%`);
}

function resetPowerCard(event: PointerEvent<HTMLElement>) {
  const face = event.currentTarget.querySelector<HTMLElement>(".power-card-face");
  face?.style.setProperty("--tilt-x", "0deg");
  face?.style.setProperty("--tilt-y", "0deg");
  face?.style.setProperty("--spot-x", "50%");
  face?.style.setProperty("--spot-y", "50%");
}

function PhotoStrip() {
  const root = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const photos = portfolio.photos.personal.filter((photo) => photo.source === "real");
  useEffect(() => {
    const section = root.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    if (process.env.NODE_ENV === "development" && photos.length < 3) console.info(`[portfolio] Power gallery currently uses ${photos.length} real photos.`);
    let context: { revert: () => void } | undefined;
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(async ([gsapModule, triggerModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      await waitForVisualAssets(section);
      if (cancelled) return;
      context = gsap.context(() => {
        const panels = cards.current.filter((card): card is HTMLElement => Boolean(card));
        gsap.fromTo(panels, { y: 48, rotation: (index) => index % 2 ? 8 : -8, opacity: 0 }, {
          y: (index) => index % 2 ? 24 : 0,
          rotation: (index) => index % 2 ? 4 : -4,
          opacity: 1,
          duration: .9,
          stagger: .14,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 76%", once: true },
        });
      }, section);
      ScrollTrigger.refresh();
    });
    return () => { cancelled = true; context?.revert(); };
  }, [photos.length]);

  return <section className="photo-section" data-theme="light" ref={root} aria-label="Personal photo cards">
    <GlyphBackdrop variant="light" rows={4} seed="gallery" speedRange={[86, 118]} />
    <div className="photo-ghost" aria-hidden="true">{portfolio.photos.galleryGhost}</div>
    <div className="photo-section-heading"><p className="mono">A FEW FRAMES OUTSIDE THE SCREEN</p><span className="mono">PERSONAL / {String(photos.length).padStart(2, "0")}</span></div>
    <div className="power-gallery">{photos.map((photo, index) => <article className={`power-card power-card-${index + 1}`} key={photo.src} ref={(node) => { cards.current[index] = node; }} onPointerMove={movePowerCard} onPointerLeave={resetPowerCard} data-swarm-hot>
      <div className="power-card-face">
        <div className="power-card-top mono"><span>DH / FIELD NOTES</span><span>0{index + 1}</span></div>
        <span className="power-card-corner mono">{photo.title}</span>
        <div className="power-card-image"><Image src={photo.src} alt={photo.alt || photo.caption} fill sizes="(max-width: 700px) 82vw, 32vw" loading="eager" /></div>
      </div>
      <div className="power-card-caption"><p className="power-card-caption-title mono">{photo.title}</p><p className="power-card-thought">{photo.thought}</p></div>
    </article>)}</div>
  </section>;
}

function Statement() {
  return <section className="statement-section texture-dark" data-theme="dark" aria-label="Personal statement">
    <GlyphBackdrop variant="dark" rows={4} seed="statement" speedRange={[80, 116]} />
    <p className="mono">A THOUGHT TO CARRY FORWARD</p>
    <blockquote>{portfolio.statement.headline}</blockquote>
    <p className="statement-subline mono">{portfolio.statement.subline}</p>
  </section>;
}

function ClosingCTA() {
  const section = useRef<HTMLElement>(null);
  const conversation = useRef<HTMLAnchorElement>(null);
  const copiedTimeout = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("IST --:--");

  useEffect(() => {
    const update = () => {
      const value = new Intl.DateTimeFormat("en-GB", { timeZone: portfolio.timeZone || "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
      setClock(`IST ${value}`);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => { window.clearInterval(interval); if (copiedTimeout.current) window.clearTimeout(copiedTimeout.current); };
  }, []);

  useEffect(() => {
    const root = section.current;
    if (!root) return;
    let context: { revert: () => void } | undefined;
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const observer = new IntersectionObserver(([entry]) => root.classList.toggle("is-visible", entry.isIntersecting), { threshold: 0.08 });
    observer.observe(root);

    const button = conversation.current;
    const handlePointer = (event: globalThis.PointerEvent) => {
      if (!button || event.pointerType !== "mouse") return;
      const rect = button.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance <= 80) {
        const strength = (1 - distance / 80) * 0.14;
        button.style.setProperty("--mag-x", `${dx * strength}px`);
        button.style.setProperty("--mag-y", `${dy * strength}px`);
      } else {
        button.style.setProperty("--mag-x", "0px");
        button.style.setProperty("--mag-y", "0px");
      }
    };
    const resetPointer = () => {
      button?.style.setProperty("--mag-x", "0px");
      button?.style.setProperty("--mag-y", "0px");
    };
    if (!coarse.matches && !reduced.matches) {
      window.addEventListener("pointermove", handlePointer, { passive: true });
      window.addEventListener("blur", resetPointer);
    }

    if (window.innerWidth > 700 && !coarse.matches && !reduced.matches) {
      void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, triggerModule]) => {
        if (cancelled) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = triggerModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {
          const lines = root.querySelectorAll<HTMLElement>("[data-closing-line]");
          const portrait = root.querySelector<HTMLElement>(".closing-portrait");
          const spotlight = root.querySelector<HTMLElement>(".closing-spotlight");
          const timeline = gsap.timeline({ scrollTrigger: { trigger: root, start: "top 78%", end: "center center", scrub: .8 } });
          if (lines[0]) timeline.fromTo(lines[0], { xPercent: -16 }, { xPercent: 0, ease: "none" }, 0);
          if (lines[1]) timeline.fromTo(lines[1], { xPercent: 16 }, { xPercent: 0, ease: "none" }, 0);
          if (portrait) timeline.fromTo(portrait, { y: 60 }, { y: 0, ease: "none" }, 0);
          if (spotlight) timeline.fromTo(spotlight, { opacity: .55 }, { opacity: 1, ease: "none" }, 0);
        }, root);
        ScrollTrigger.refresh();
      });
    }
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("blur", resetPointer);
      resetPointer();
      context?.revert();
    };
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(portfolio.email);
      setCopied(true);
      if (copiedTimeout.current) window.clearTimeout(copiedTimeout.current);
      copiedTimeout.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${portfolio.email}`;
    }
  };

  return <section className="closing-section texture-dark" data-theme="dark" ref={section}>
    <CyberBackdrop />
    <div className="closing-spotlight" aria-hidden="true" />
    <div className="closing-copy">
      <div className="mono closing-eyebrow">{portfolio.closing.eyebrow}</div>
      <h2><span data-closing-line data-glitch={portfolio.closing.lineOne}>{portfolio.closing.lineOne}</span><span data-closing-line data-glitch={portfolio.closing.lineTwo}>{portfolio.closing.lineTwo}</span></h2>
      <div className="closing-actions">
        <a className="button button-primary closing-primary" href={`mailto:${portfolio.email}`} ref={conversation}>{portfolio.closing.conversationLabel} <ArrowDownRight size={16} /></a>
        <button className="button closing-copy-email" type="button" onClick={copyEmail} aria-label={copied ? "Email copied" : `Copy ${portfolio.email}`}><span aria-live="polite">{copied ? portfolio.closing.copiedLabel : portfolio.closing.copyLabel}</span></button>
        <a aria-label="Dhanush on GitHub" className="closing-social mono" href={portfolio.socials.github} target="_blank" rel="noopener noreferrer">GITHUB <ArrowUpRight size={14} /></a>
        <a aria-label="Dhanush on LinkedIn" className="closing-social mono" href={portfolio.socials.linkedin} target="_blank" rel="noopener noreferrer">LINKEDIN <ArrowUpRight size={14} /></a>
        <a aria-label="Dhanush on Instagram" className="closing-social mono" href={portfolio.socials.instagram} target="_blank" rel="noopener noreferrer">INSTAGRAM <ArrowUpRight size={14} /></a>
      </div>
      <p className="closing-status mono"><span className="status-dot" /> {portfolio.closing.status} <time>{clock}</time></p>
    </div>
    <div className="closing-portrait" aria-hidden="true"><Image src={portfolio.hero.closingCutout} alt="" fill sizes="(max-width: 700px) 74vw, 42vw" /></div>
  </section>;
}

export function HomeSections() {
  return <>
    <SignatureMoments />
    <Reveal><section className="story-feature" data-theme="light"><GlyphBackdrop variant="light" rows={4} seed="story" speedRange={[78, 116]} /><div className="story-copy"><p className="section-index mono">02 / STORY &amp; VALUES</p><h2 className="section-display">Building<br />with purpose.</h2><p>{portfolio.shortBio}</p><p className="story-education">{portfolio.education.degree}<br />{portfolio.education.institution} · {portfolio.education.stage}</p><a className="text-link mono" href="/story">MORE ABOUT ME <ArrowUpRight size={14} /></a></div><figure className="story-photo"><Image src={portfolio.hero.src} alt={portfolio.hero.alt} fill sizes="(max-width: 700px) 100vw, 42vw" loading="lazy" /><figcaption className="mono">{portfolio.name.toUpperCase()} / PROFILE</figcaption></figure></section></Reveal>
    <TechMarquee />
    <PhotoStrip />
    <Statement />
    <ClosingCTA />
  </>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowDownRight, ArrowUpRight, Check, Copy, Github, MapPin, Navigation2, Radio, MoveUpRight } from "lucide-react";
import { profile, interests, skills, projects, explored } from "@/data/profile";
import { Navigation } from "@/components/Navigation";
import { SwarmCanvas } from "@/components/swarm/SwarmCanvas";

function useConstruction() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    const init = async () => {
      const gsapModule = await import("gsap");
      const triggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      if (cancelled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-build]").forEach((section) => {
          const pieces = section.querySelectorAll<HTMLElement>(".build-piece");
          const lines = section.querySelectorAll<SVGPathElement>(".draw-line");
          gsap.set(pieces, { y: 24, autoAlpha: 0 });
          lines.forEach((line) => {
            const length = line.getTotalLength();
            gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
          });
          const timeline = gsap.timeline({ scrollTrigger: { trigger: section, start: "top 76%", end: "bottom 52%", scrub: 0.8 } });
          timeline.to(lines, { strokeDashoffset: 0, duration: 0.55, stagger: 0.1, ease: "none" }, 0);
          timeline.to(pieces, { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.075, ease: "power2.out" }, 0.12);
        });
        gsap.fromTo(".hero-title span", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.25, stagger: 0.18, ease: "power3.inOut", delay: 0.3 });
        gsap.fromTo(".hero-meta", { y: 15, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.12, delay: 0.95 });
      }, root);
      cleanup = () => context.revert();
    };
    void init();
    return () => { cancelled = true; cleanup(); };
  }, []);
  return root;
}

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="section-label"><span>{number}</span><span>{children}</span><span className="label-rule" /></div>;
}

function BuildLine({ className = "", d }: { className?: string; d: string }) {
  return <svg className={`build-line ${className}`} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path className="draw-line" d={d} /></svg>;
}

export default function Portfolio() {
  const root = useConstruction();
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(profile.email); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { window.location.href = `mailto:${profile.email}`; }
  };

  return <main ref={root}>
    <SwarmCanvas />
    <div className="grain" aria-hidden="true" />
    <Navigation />

    <section className="hero" id="home">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-topline mono"><span>PORTFOLIO / PERSONAL PROFILE</span><span>BASED IN INDIA <i className="coordinate-dot" /></span></div>
      <div className="hero-content">
        <p className="hero-kicker hero-meta"><span className="kicker-line" /> PERSONAL PROFILE&nbsp; / &nbsp;001</p>
        <h1 className="hero-title"><span>DHAN</span><span className="title-second">USH<span className="title-period">.</span></span></h1>
        <div className="hero-bottom">
          <div className="hero-intro hero-meta"><p className="role">{profile.role}</p><p>{profile.intro}</p></div>
          <div className="hero-actions hero-meta"><a className="button button-solid" href="#projects">View my projects <ArrowDownRight size={16} /></a><a className="text-link" href="#experience">Explore my journey <ArrowDown size={14} /></a></div>
        </div>
      </div>
      <div className="hero-aside mono"><span>01 / 08</span><span>SCROLL TO CONSTRUCT</span><div className="scroll-line"><i /></div></div>
      <div className="hero-social hero-meta"><a href={profile.github} target="_blank" rel="noreferrer"><Github size={15} /> GITHUB <ArrowUpRight size={12} /></a>{profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer">LINKEDIN <ArrowUpRight size={12} /></a>}</div>
      <div className="hero-photo"><Image src="/images/profile/dhanush.jpg" alt="Dhanush standing outdoors" width={1211} height={1600} priority className="profile-photo-image" /><div className="photo-corner top-left" /><div className="photo-caption mono"><span>DHANUSH<br />PROFILE</span><span>01—01</span></div></div>
    </section>

    <section className="about section-shell" id="about" data-build>
      <SectionLabel number="02">A LITTLE CONTEXT</SectionLabel>
      <div className="about-layout">
        <h2 className="display-heading build-piece">Curiosity<br /><em>drives</em> everything<span className="accent">.</span></h2>
        <div className="about-copy build-piece"><span className="mono small-index">[ A NOTE ON HOW I LEARN ]</span><p>{profile.about}</p><a href="#contact" className="under-link">A bit more about me <ArrowDownRight size={14} /></a></div>
      </div>
      <BuildLine d="M0 70 C150 70 165 25 330 25 S530 76 700 54 S850 20 1000 30" />
      <div className="interest-field build-piece"><span className="mono field-label">AREAS OF CURIOSITY</span><div className="interest-list">{interests.map((item, i) => <span key={item} className={`interest interest-${i}`}>{item}<sup>0{i + 1}</sup></span>)}</div><span className="interest-note mono">ALWAYS OPEN TO THE NEXT THING ↗</span></div>
    </section>

    <section className="project-section section-shell" id="projects" data-build>
      <SectionLabel number="03">SELECTED PROJECTS / 03</SectionLabel>
      <div className="project-heading"><div><span className="mono small-index build-piece">IDEAS MADE TANGIBLE</span><h2 className="display-heading build-piece">Things I&apos;m<br /><em>building.</em></h2></div><span className="project-count mono build-piece">WEB / COMMUNITY<br />/ GAME WORLDS</span></div>
      <div className="project-list">{projects.map((project) => <article className="project-entry" key={project.number}>
        <div className={`project-visual build-piece visual-${project.visual}`}>
          <div className="diagram-top mono"><span>{project.category}</span><span>{project.status}</span></div>
          {project.visual === "route" && <div className="map-art"><svg viewBox="0 0 500 270" aria-hidden="true"><path className="map-road" d="M-20 62 C100 48 110 130 200 122 S313 38 520 77 M-10 220 C112 200 153 242 242 197 S370 142 515 169 M91 -10 C122 75 175 82 162 155 S177 217 185 285 M351 -10 C327 60 378 95 345 151 S321 217 360 286"/><path className="map-route" d="M84 184 C125 178 124 121 196 130 S268 178 320 130 S380 83 419 90"/></svg><span className="map-label label-one">OLD TOWN</span><span className="map-label label-two">HIDDEN GEM</span><span className="map-label label-three">COASTAL ROUTE</span><i className="map-pin"><MapPin size={20}/></i><i className="map-pin pin-two"><MapPin size={18}/></i><div className="map-legend mono"><Navigation2 size={14}/> MAP / ROUTE / DISCOVER</div></div>}
          {project.visual === "grid" && <div className="resq-art"><div className="resq-rings"><i/><i/><i/><Radio size={30}/></div><div className="resq-node node-a">SOS</div><div className="resq-node node-b">01</div><div className="resq-node node-c">02</div><span className="resq-caption mono">COMMUNITY SIGNAL / MESH CONCEPT</span></div>}
          {project.visual === "island" && <div className="island-art"><div className="moon"/><div className="island-shape"/><div className="island-mist mist-a"/><div className="island-mist mist-b"/><span className="island-title mono">ECHOES / ISLAND 01</span></div>}
        </div>
        <div className="project-details build-piece"><div className="project-description"><span className="mono small-index">{project.number} / {project.category}</span><h3>{project.name}{project.subtitle && <small>— {project.subtitle}</small>}</h3><p>{project.description}</p><div className="project-tags">{project.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></div><div className="project-facts"><span className="mono small-index">{project.status}</span><div>{project.features.map((feature) => <span key={feature}>{feature}<i>↗</i></span>)}</div></div></div>
      </article>)}</div>
    </section>

    <section className="skills-section section-shell" id="skills" data-build>
      <SectionLabel number="04">CURRENT TOOLKIT</SectionLabel>
      <div className="skills-layout"><div><span className="mono small-index build-piece">TECHNOLOGIES I&apos;VE EXPLORED</span><h2 className="display-heading build-piece">Tools I<br /><em>work with.</em></h2></div><div className="skill-list">{skills.map((skill) => <div key={skill.name} className="skill-row build-piece"><span className="skill-num mono">{skill.code}</span><strong>{skill.name}</strong><span className="skill-level mono">{skill.group}</span><ArrowUpRight size={16} /></div>)}</div></div>
      <p className="skills-note mono build-piece">ALSO EXPLORING <span>—</span> {explored.join(" / ").toUpperCase()}</p>
    </section>

    <section className="journey-section section-shell" id="experience" data-build>
      <SectionLabel number="05">ACADEMIC JOURNEY</SectionLabel>
      <div className="journey-heading"><h2 className="display-heading build-piece">Learning beyond<br /><em>the classroom.</em></h2><span className="mono build-piece">EDUCATION / COMPUTER SCIENCE</span></div>
      <div className="education-card build-piece"><span className="timeline-node"><i /></span><span className="timeline-type mono">CURRENT STUDIES / {profile.semester.toUpperCase()}</span><div><h3>{profile.education}</h3><p>{profile.college}</p></div><span className="education-mark mono">CSE<br/>/ 03</span></div>
    </section>

    <section className="hackathon-section section-shell" data-build>
      <SectionLabel number="06">CURIOSITY IN MOTION</SectionLabel>
      <div className="hackathon-layout"><h2 className="display-heading build-piece"><em>Explore.</em><br />Imagine.<br /><span>Make.</span></h2><div className="event-list"><p className="focus-intro build-piece">I like exploring how emerging technology can become something useful, expressive, or simply fun to experience.</p>{["Artificial Intelligence", "Web Experiences", "Game Worlds"].map((area, i) => <div className="event-row build-piece" key={area}><span className="mono">0{i + 1} / EXPLORING</span><strong>{area}</strong><ArrowUpRight size={18} /></div>)}</div></div>
    </section>

    <section className="interests-section section-shell" data-build>
      <SectionLabel number="07">WHEN I LOOK AROUND</SectionLabel>
      <div className="playful-head build-piece"><span className="mono">INTERESTS / {String(interests.length).padStart(2, "0")}</span><h2 className="display-heading">Beyond<br /><em>the obvious.</em></h2><span className="orbit-mark">✳</span></div>
      <div className="playful-list">{interests.map((item, i) => <div className={`playful-item playful-${i % 4} build-piece`} key={item}><span className="mono">0{i + 1}</span><strong>{item}</strong><span className="playful-glyph">{["↗", "∿", "✳", "◌"][i % 4]}</span></div>)}</div>
      <p className="interests-caption mono build-piece">ALWAYS ROOM FOR ONE MORE CURIOSITY.</p>
    </section>

    <section className="contact-section section-shell" id="contact" data-build>
      <SectionLabel number="08">THE NEXT GOOD CONVERSATION</SectionLabel>
      <div className="contact-main"><div className="contact-heading"><span className="mono small-index build-piece">OPEN CHANNEL / 24—7</span><h2 className="display-heading build-piece">Have an idea?<br /><em>Let&apos;s connect.</em></h2><p className="build-piece">Something to build, learn, or talk through? My inbox is open.</p></div><a className="contact-email build-piece" href={`mailto:${profile.email}`}><span className="mono">SEND A NOTE</span><strong>{profile.email}</strong><MoveUpRight size={24} /></a></div>
      <div className="contact-bottom"><button className="copy-button" onClick={copyEmail}><span>{copied ? <Check size={15} /> : <Copy size={15} />}</span>{copied ? "EMAIL COPIED" : "COPY EMAIL"}</button><div className="contact-socials"><a href={profile.github} target="_blank" rel="noreferrer"><Github size={17} />GITHUB<ArrowUpRight size={14} /></a>{profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer">LINKEDIN<ArrowUpRight size={14} /></a>}</div></div>
      <BuildLine className="contact-line" d="M0 55 C180 55 225 80 390 52 S620 12 760 38 S930 63 1000 25" />
      <footer className="footer mono"><span>DHANUSH / PORTFOLIO</span><span>BUILT WITH CURIOSITY & A COORDINATED SWARM</span><a href="#home">BACK TO TOP ↑</a></footer>
    </section>
  </main>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems, portfolio } from "@/data/portfolio";

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    const focusable = () => Array.from(overlay?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); toggleRef.current?.focus(); }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-theme='light'],[data-theme='dark']"));
    if (!sections.length) return;
    let observer: IntersectionObserver | null = null;
    const connect = () => {
      observer?.disconnect();
      const headerLine = 42;
      const bottomInset = Math.max(0, window.innerHeight - headerLine - 1);
      const nextObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        const section = sections.find((item) => {
          const rect = item.getBoundingClientRect();
          return rect.top <= headerLine && rect.bottom > headerLine;
        });
        if (section) setDark(section.dataset.theme === "dark");
      }, { rootMargin: `-${headerLine}px 0px -${bottomInset}px 0px`, threshold: 0 });
      observer = nextObserver;
      sections.forEach((section) => nextObserver.observe(section));
    };
    connect();
    window.addEventListener("resize", connect);
    return () => { observer?.disconnect(); window.removeEventListener("resize", connect); };
  }, [pathname]);

  useEffect(() => {
    const hero = document.querySelector(".hero");
    if (!hero) { setHeroVisible(false); return; }
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.01, rootMargin: "-88px 0px 0px 0px" });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return <>
    <header className="site-header">
      <Link className="brand-mark" href="/" aria-label="Dhanush home" data-tone={open || dark ? "light" : "dark"}>D<span>.</span></Link>
      <Link className="header-name mono" href="/" data-tone={open || dark ? "light" : "dark"} data-hero-visible={heroVisible} aria-hidden={!heroVisible} tabIndex={heroVisible ? 0 : -1}>{portfolio.name}</Link>
      <button ref={toggleRef} className="menu-toggle mono" data-tone={open || dark ? "light" : "dark"} type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((value) => !value)}>
        <span className="menu-toggle-label">{open ? "CLOSE" : "MENU"}</span><span className="menu-icon" aria-hidden="true"><i/><i/></span>
      </button>
    </header>
    <nav id="site-menu" ref={overlayRef} className="menu-overlay" data-open={open} aria-label="Main navigation" aria-hidden={!open} inert={!open}>
      <div className="menu-overlay-inner">
        <div className="menu-links">{navigationItems.map((item, index) => <Link className="menu-link" href={item.href} key={item.href} onClick={close}><span><sup className="mono">0{index + 1} / </sup>{item.label}</span></Link>)}</div>
        <div className="menu-footer mono"><span>DHANUSH / PORTFOLIO</span><div className="menu-socials"><a aria-label="Dhanush on GitHub" href={portfolio.socials.github} target="_blank" rel="noopener noreferrer">GITHUB ↗</a><a aria-label="Dhanush on LinkedIn" href={portfolio.socials.linkedin} target="_blank" rel="noopener noreferrer">LINKEDIN ↗</a><a aria-label="Dhanush on Instagram" href={portfolio.socials.instagram} target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><a href={`mailto:${portfolio.email}`}>GET IN TOUCH ↗</a></div></div>
      </div>
    </nav>
  </>;
}

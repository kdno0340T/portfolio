"use client";

import { useEffect, type ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let destroyed = false;
    let lenis: { raf: (time: number) => void; destroy: () => void; on: (event: "scroll", callback: () => void) => void } | undefined;
    let gsapInstance: typeof import("gsap").gsap | undefined;
    let tickerCallback: ((time: number) => void) | undefined;
    let frame = 0;
    let context: { revert: () => void } | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");

    const setup = async () => {
      if (reduced.matches || coarse.matches) return;
      const [{ default: Lenis }, gsapModule, triggerModule] = await Promise.all([
        import("lenis"), import("gsap"), import("gsap/ScrollTrigger"),
      ]);
      if (destroyed || reduced.matches || coarse.matches) return;
      const gsap = gsapModule.gsap;
      gsapInstance = gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false });
      lenis.on("scroll", ScrollTrigger.update);
      tickerCallback = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);
      frame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
      context = gsap.context(() => {
        const portrait = document.querySelector<HTMLElement>("[data-hero-parallax]");
        if (portrait) gsap.to(portrait, { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 } });
        const ghost = document.querySelector<HTMLElement>(".photo-ghost");
        if (ghost) gsap.to(ghost, { yPercent: -14, ease: "none", scrollTrigger: { trigger: ".photo-section", start: "top bottom", end: "bottom top", scrub: 0.8 } });
      });
    };

    void setup();
    return () => {
      destroyed = true;
      window.cancelAnimationFrame(frame);
      context?.revert();
      if (tickerCallback) gsapInstance?.ticker.remove(tickerCallback);
      lenis?.destroy();
    };
  }, []);

  return children;
}

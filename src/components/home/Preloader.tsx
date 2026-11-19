"use client";

import { useEffect, useRef, useState } from "react";
import { portfolio } from "@/data/portfolio";

type PreloaderProps = { onComplete: () => void };

export function Preloader({ onComplete }: PreloaderProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("preload") === "1";
    let sessionSeen = false;
    try {
      sessionSeen = sessionStorage.getItem("portfolio-loaded") === "true";
      if (!forced && sessionSeen) {
        setVisible(false);
        completeRef.current();
        return;
      }
    } catch { /* Continue with an in-memory preloader if storage is unavailable. */ }

    setVisible(true);
    let active = true;
    let frame = 0;
    let revealStartTimer = 0;
    let finishTimer = 0;
    let ready = false;
    let completing = false;
    const started = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumDisplay = reducedMotion ? 800 : 850;
    const wipeDuration = reducedMotion ? 180 : 320;
    const hero = new Image();
    hero.src = portfolio.hero.cutout;
    void Promise.all([hero.decode().catch(() => undefined), document.fonts.ready]).then(() => { ready = true; });

    const tick = (now: number) => {
      if (!active) return;
      const elapsed = now - started;
      const fill = ready
        ? Math.min(96, Math.round((elapsed / minimumDisplay) * 96))
        : Math.min(90, Math.round((1 - Math.exp(-elapsed / 720)) * 90));
      setProgress((previous) => Math.max(previous, fill));
      if (ready && elapsed >= minimumDisplay && !completing) {
        completing = true;
        setProgress(100);
        setDone(true);
        // Start the hero entrance as the diagonal wipe nears completion.
        revealStartTimer = window.setTimeout(() => {
          if (!active) return;
          completeRef.current();
          finishTimer = window.setTimeout(() => {
            if (!active) return;
            setVisible(false);
            try { sessionStorage.setItem("portfolio-loaded", "true"); } catch { /* Continue if storage is unavailable. */ }
        }, Math.max(20, wipeDuration - (reducedMotion ? 0 : 220)));
        }, reducedMotion ? 0 : 220);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealStartTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  if (!visible) return null;
  return <div className="preloader" data-done={done} aria-hidden="true"><div className="preloader-content"><span className="preloader-monogram">{portfolio.name.slice(0, 1)}.</span><span className="preloader-label mono">{portfolio.name.toUpperCase()} / PORTFOLIO</span><span className="preloader-count mono" data-progress={progress}>{String(progress).padStart(2, "0")}<small>%</small></span></div></div>;
}

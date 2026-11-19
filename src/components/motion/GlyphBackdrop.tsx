"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type GlyphBackdropProps = {
  variant: "light" | "dark";
  rows?: number;
  seed?: string | number;
  speedRange?: readonly [number, number];
  parallax?: boolean;
};

const patterns = [
  "DHANUSH     </>     { }     01     #     D     ->     ( )",
  "{ }     01     DHANUSH     #     </>     D     ->     ( )",
  "( )     #     D     ->     DHANUSH     </>     { }     01",
  "01     </>     DHANUSH     { }     ->     #     D     ( )",
];

function hashSeed(seed: string | number) {
  let value = 2166136261;
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function GlyphBackdrop({ variant, rows = 4, seed = 1, speedRange = [70, 120], parallax = false }: GlyphBackdropProps) {
  const root = useRef<HTMLDivElement>(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    setDebug(new URLSearchParams(window.location.search).get("glyphdebug") === "1");

    let frame = 0;
    let x = 0;
    let y = 0;
    const observer = new IntersectionObserver(([entry]) => {
      element.classList.toggle("is-visible", entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(element);

    const coarse = window.matchMedia("(pointer: coarse)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handlePointer = (event: PointerEvent) => {
      x = ((event.clientX / window.innerWidth) - 0.5) * 16;
      y = ((event.clientY / window.innerHeight) - 0.5) * 16;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        element.querySelectorAll<HTMLElement>(".glyph-backdrop-row").forEach((row, index) => {
          const depth = 0.35 + (index % 4) * 0.2;
          row.style.setProperty("--row-offset-x", `${x * depth}px`);
          row.style.setProperty("--row-offset-y", `${y * depth}px`);
        });
      });
    };
    if (parallax && !coarse.matches && !reduced.matches) window.addEventListener("pointermove", handlePointer, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointer);
      if (frame) window.cancelAnimationFrame(frame);
      element.classList.remove("is-visible");
      element.querySelectorAll<HTMLElement>(".glyph-backdrop-row").forEach((row) => {
        row.style.removeProperty("--row-offset-x");
        row.style.removeProperty("--row-offset-y");
      });
    };
  }, [parallax]);

  const random = hashSeed(seed);
  const low = Math.min(speedRange[0], speedRange[1]);
  const high = Math.max(speedRange[0], speedRange[1]);
  const count = Math.max(1, Math.min(rows, 8));

  return <div className="glyph-backdrop" data-variant={variant} data-debug={debug ? "true" : undefined} aria-hidden="true" ref={root}>
    {Array.from({ length: count }, (_, index) => {
      const pattern = patterns[(index + (random % patterns.length)) % patterns.length];
      const fraction = ((Math.imul(random + index + 1, 2654435761) >>> 0) % 1000) / 1000;
      const duration = low + fraction * (high - low);
      const style = {
        "--row-index": index,
        "--row-count": count,
        "--row-top": `${(index / count) * 100}%`,
        "--duration": `${duration.toFixed(2)}s`,
        "--direction": index % 2 === 0 ? "normal" : "reverse",
        "--mouse-depth": `${0.35 + (index % 4) * 0.2}`,
      } as CSSProperties;
      return <div className="glyph-backdrop-row" data-row={index + 1} key={`${index}-${pattern}`} style={style}>
        <div className="glyph-backdrop-track">
          <span>{pattern}</span><span>{pattern}</span>
        </div>
      </div>;
    })}
  </div>;
}

"use client";

import { useEffect, useRef } from "react";

const ACCENT = [111, 77, 166];
const LIGHT_ON_DARK = [190, 167, 255];
const FRAME_INTERVAL = 1000 / 60;
const HOT_TARGETS = "a, button, [role='button'], [data-swarm-hot]";

/** Lightweight mouse-only murmuration rendered in one fixed canvas. */
export default function SwarmCursor({ count = 60, color = ACCENT, size = 1.55 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    let frame = 0;
    let lastFrame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = 1;
    let pointerX = width / 2;
    let pointerY = height / 2;
    let pointerSpeed = 0;
    let pointerActive = false;
    let presence = 0;
    let hot = false;
    let sectionTheme = "dark";
    let scatter = 0;
    let previousPointerTime = 0;
    let previousPointerX = pointerX;
    let previousPointerY = pointerY;
    let listenersAttached = false;

    const particles = Array.from({ length: Math.max(0, Math.min(160, count)) }, (_, index) => ({
      x: pointerX,
      y: pointerY,
      vx: 0,
      vy: 0,
      angle: (index / count) * Math.PI * 2 + Math.random() * 0.35,
      spin: (Math.random() - 0.5) * 0.014,
      follow: 0.035 + Math.random() * 0.075,
      drag: 0.82 + Math.random() * 0.13,
      orbit: 12 + Math.random() * 42,
      radius: size * (0.65 + Math.random() * 0.95),
      phase: Math.random() * Math.PI * 2,
    }));

    const setCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const onPointerMove = (event) => {
      const now = performance.now();
      const elapsed = Math.max(1, now - previousPointerTime);
      const dx = event.clientX - previousPointerX;
      const dy = event.clientY - previousPointerY;
      pointerSpeed = Math.hypot(dx, dy) / elapsed;
      if (pointerSpeed > 0.38) scatter = Math.min(1, scatter + Math.min(0.8, pointerSpeed * 0.42));
      pointerX = event.clientX;
      pointerY = event.clientY;
      previousPointerX = pointerX;
      previousPointerY = pointerY;
      previousPointerTime = now;
      pointerActive = true;
      const underPointer = document.elementFromPoint(pointerX, pointerY);
      sectionTheme = underPointer?.closest("[data-theme]")?.getAttribute("data-theme") || "dark";
    };

    const onPointerLeave = () => { pointerActive = false; hot = false; };
    const updateHotState = (event) => {
      const target = event.target;
      hot = target instanceof Element && Boolean(target.closest(HOT_TARGETS));
    };
    const disable = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (listenersAttached) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("pointerover", updateHotState);
        window.removeEventListener("pointerout", updateHotState);
        window.removeEventListener("resize", setCanvasSize);
        listenersAttached = false;
      }
      context.clearRect(0, 0, width, height);
      canvas.style.display = "none";
    };
    const enable = () => {
      if (coarsePointer.matches || reducedMotion.matches) {
        disable();
        return;
      }
      canvas.style.display = "block";
      setCanvasSize();
      if (!listenersAttached) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerleave", onPointerLeave, { passive: true });
        window.addEventListener("pointerover", updateHotState, { passive: true });
        window.addEventListener("pointerout", updateHotState, { passive: true });
        window.addEventListener("resize", setCanvasSize, { passive: true });
        listenersAttached = true;
      }
      lastFrame = 0;
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    function draw(timestamp) {
      frame = window.requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) return;
      const delta = Math.min(2, lastFrame ? (timestamp - lastFrame) / FRAME_INTERVAL : 1);
      lastFrame = timestamp;
      context.clearRect(0, 0, width, height);
      presence += ((pointerActive ? 1 : 0) - presence) * 0.075;
      scatter *= Math.pow(0.91, delta);
      const tightness = hot ? 0.48 : 1;
      const expansion = 1 + scatter * 2.15;
      const [red, green, blue] = sectionTheme === "light" ? color : LIGHT_ON_DARK;

      particles.forEach((particle, index) => {
        particle.angle += particle.spin * delta * (hot ? 0.72 : 1);
        const orbit = particle.orbit * tightness * expansion;
        const angle = particle.angle + Math.sin(timestamp * 0.0006 + particle.phase) * 0.17;
        const targetX = pointerX + Math.cos(angle) * orbit;
        const targetY = pointerY + Math.sin(angle) * orbit * 0.72;
        const response = particle.follow * (hot ? 1.12 : 1) * delta;
        particle.vx = (particle.vx + (targetX - particle.x) * response) * particle.drag;
        particle.vy = (particle.vy + (targetY - particle.y) * response) * particle.drag;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        const distance = Math.hypot(particle.x - pointerX, particle.y - pointerY);
        const fade = Math.max(0.08, 1 - distance / (orbit * 3.6 + 42));
        const alpha = Math.min(0.9, presence * fade * (0.52 + (index % 5) * 0.07));
        const radius = particle.radius * (hot ? 1.22 : 1) * (0.9 + presence * 0.1);

        context.beginPath();
        context.arc(particle.x, particle.y, radius + 0.45, 0, Math.PI * 2);
        context.fillStyle = sectionTheme === "light"
          ? `rgba(18, 27, 25, ${alpha * 0.72})`
          : `rgba(255, 255, 255, ${alpha * 0.42})`;
        context.fill();
        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        context.fill();
      });

      if (presence < 0.01 && !pointerActive) {
        context.clearRect(0, 0, width, height);
      }
    }

    enable();
    coarsePointer.addEventListener("change", enable);
    reducedMotion.addEventListener("change", enable);

    return () => {
      disable();
      coarsePointer.removeEventListener("change", enable);
      reducedMotion.removeEventListener("change", enable);
    };
  }, [count, color, size]);

  return <canvas ref={canvasRef} className="swarm-cursor-canvas" aria-hidden="true" />;
}

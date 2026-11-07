"use client";

import { useEffect, useRef } from "react";

type Agent = { x: number; y: number; phase: number; speed: number; size: number };
type Target = { left: number; top: number; width: number; height: number };

/** One shared animation loop renders a coordinated field of cursor agents. */
export function SwarmCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const count = Math.min(24, Math.max(8, Math.floor(window.innerWidth / (coarse.matches ? 70 : 58))));
    const agents: Agent[] = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      phase: (i / count) * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.016,
      size: 1 + Math.random() * 1.1,
    }));
    let frame = 0;
    let progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    let targets: Target[] = [];
    const refreshTargets = () => {
      const midpoint = window.innerHeight * 0.48;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-build]"));
      const section = sections
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > 80 && rect.top < window.innerHeight - 30)
        .sort((a, b) => Math.abs((a.rect.top + a.rect.bottom) / 2 - midpoint) - Math.abs((b.rect.top + b.rect.bottom) / 2 - midpoint))[0]?.element;
      const selectors = section ? section.querySelectorAll<HTMLElement>(".build-piece") : document.querySelectorAll<HTMLElement>(".hero-title span, .hero-meta, .hero-photo");
      targets = Array.from(selectors)
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 6 && rect.height > 6 && rect.bottom > 65 && rect.top < window.innerHeight - 12)
        .sort((a, b) => Math.abs((a.top + a.bottom) / 2 - midpoint) - Math.abs((b.top + b.bottom) / 2 - midpoint))
        .slice(0, count)
        .map((rect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
    };
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onScroll = () => {
      progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      refreshTargets();
    };
    const draw = (time: number) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!reduced.matches) {
        agents.forEach((agent, i) => {
          const target = targets.length ? targets[i % targets.length] : null;
          const cursorProgress = (i / count + progress * 0.14) % 1;
          let tx = window.innerWidth * (0.12 + 0.76 * ((i * 0.618) % 1));
          let ty = window.innerHeight * 0.5;
          if (target) {
            const perimeter = Math.max(1, 2 * (target.width + target.height));
            let distance = cursorProgress * perimeter;
            if (distance < target.width) { tx = target.left + distance; ty = target.top; }
            else if ((distance -= target.width) < target.height) { tx = target.left + target.width; ty = target.top + distance; }
            else if ((distance -= target.height) < target.width) { tx = target.left + target.width - distance; ty = target.top + target.height; }
            else { distance -= target.width; tx = target.left; ty = target.top + target.height - distance; }
            tx += Math.sin(time * 0.001 + agent.phase) * (coarse.matches ? 1.5 : 3);
            ty += Math.cos(time * 0.001 + agent.phase) * (coarse.matches ? 1.5 : 3);
          }
          const prevX = agent.x;
          const prevY = agent.y;
          agent.x += (tx - agent.x) * agent.speed;
          agent.y += (ty - agent.y) * agent.speed;
          const alpha = 0.32 + 0.32 * Math.sin(time * 0.001 + i);
          context.beginPath();
          context.arc(agent.x, agent.y, agent.size, 0, Math.PI * 2);
          context.fillStyle = `rgba(133, 218, 207, ${alpha})`;
          context.fill();
          if (!coarse.matches && Math.hypot(agent.x - prevX, agent.y - prevY) > 0.15) {
            context.beginPath();
            context.moveTo(prevX, prevY);
            context.lineTo(agent.x, agent.y);
            context.strokeStyle = `rgba(133, 218, 207, ${alpha * 0.28})`;
            context.lineWidth = 0.6;
            context.stroke();
          }
        });
      }
      frame = window.requestAnimationFrame(draw);
    };
    resize();
    refreshTargets();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas aria-hidden="true" className="swarm-canvas" ref={canvasRef} />;
}

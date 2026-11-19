"use client";

import { useEffect, useRef } from "react";

// Scene tuning. Values are normalized by SCENE_INTENSITY; debug mode forces
// each effect to full alpha so its presence can be inspected in isolation.
const SCENE_INTENSITY = 0.65;
const HORIZON_RATIO = 0.58;
const COLORS = {
  skyTop: "#0b0815", skyBottom: "#171026", horizon: "#df39d2",
  cyan: "#3de8ff", whiteCyan: "#d8fbff", magenta: "#ff3db8",
  amber: "#ffbd70", farCity: "#21183b", midCity: "#19132e",
  nearCity: "#100d22", grid: "#a579ff", base: "#0b0815",
};
const CITY_PARALLAX = [0.008, 0.018, 0.03];
const CITY_LAYER_ALPHA = [0.48, 0.58, 0.66];
const RAIN_ALPHA = 0.25;
const RAIN_DENSITY = 0.008;
const GRID_SPEED = 46; // 40% of the previous 115-unit glide.
const GRID_ALPHA = 0.38;
const GRID_BOTTOM_ALPHA = 0.18;
const HORIZON_GLOW_ALPHA = 0.52;
const SUN_ALPHA = 0.34;
const WINDOW_ALPHA = 0.36;
const SIGN_ALPHA = 0.58;
const VEHICLE_ALPHA = 0.32;
const SCANLINE_ALPHA = 0.015;
const GLITCH_INTERVAL_MS = 16000;
const VEHICLE_SPEED = 0.00048;
const VEHICLE_DELAY_MS = [18000, 25000] as const;
const GLYPHS = "01<>/{}#";
const DEBUG_LAYER_LABELS = ["SKY + HORIZON", "NEON DISC", "CITY + SIGNS", "DIGITAL RAIN", "PERSPECTIVE GRID"];
const BACKDROP_DPR_SCALE = 0.5; // Keep the decorative canvas light; DOM text and portrait stay full resolution.

type Building = { id: number; x: number; width: number; height: number; seed: number };
type Drop = { x: number; y: number; speed: number; length: number; seed: number };

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export function CyberBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = root.current?.parentElement;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false, desynchronized: true });
    if (!section || !canvas || !ctx) return;
    const mainCtx = ctx;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const mobile = window.innerWidth <= 700 || coarse.matches;
    const staticMode = reduced.matches;
    const query = new URLSearchParams(window.location.search);
    const debugMode = query.get("cyberdebug") === "1";
    const requestedIntensity = Number(query.get("cyber"));
    const sceneIntensity = Number.isFinite(requestedIntensity) && query.has("cyber")
      ? Math.max(0, Math.min(1.5, requestedIntensity))
      : SCENE_INTENSITY;
    const intensity = (base: number) => (debugMode ? 1 : Math.max(0, Math.min(1, base * sceneIntensity)));
    const effectAlpha = (base: number, factor: number) => (debugMode ? 1 : Math.max(0, Math.min(1, base * factor * sceneIntensity)));
    const random = seeded(28471);
    let width = 0; let height = 0; let dpr = 1;
    let raf = 0; let lastFrame = 0; let elapsed = 0; let frames = 0; let fpsStart = 0;
    let active = false; let pageVisible = !document.hidden;
    let pointerX = 0.5; let pointerTargetX = 0.5; let pointerTargetY = 0.5; let hasPointer = false;
    let drawMsTotal = 0;
    let vehicleAt = performance.now() + VEHICLE_DELAY_MS[0] + random() * (VEHICLE_DELAY_MS[1] - VEHICLE_DELAY_MS[0]);
    let vehicleX = 1.2;
    let vehicleY = 0.46;
    const city: Building[][] = [[], [], []];
    const rain: Drop[] = [];
    const cityLayer = document.createElement("canvas");
    const cityCtx = cityLayer.getContext("2d", { alpha: true })!;
    const sceneCtx = mainCtx;
    let cityPaintAt = -1;
    let cityPaintPointerX = pointerX;

    if (debugMode) {
      const alphas = { horizon: 1, sun: 1, farCity: 1, midCity: 1, nearCity: 1, windows: 1, signs: 1, rain: 1, grid: 1, vehicle: 1, vignette: 0 };
      const configured = {
        horizon: HORIZON_GLOW_ALPHA, sun: SUN_ALPHA, farCity: CITY_LAYER_ALPHA[0],
        midCity: CITY_LAYER_ALPHA[1], nearCity: CITY_LAYER_ALPHA[2], windows: WINDOW_ALPHA,
        signs: SIGN_ALPHA, rain: RAIN_ALPHA, gridHorizon: GRID_ALPHA, gridBottom: GRID_BOTTOM_ALPHA,
        vehicle: VEHICLE_ALPHA, vignette: 0,
      };
      root.current?.setAttribute("data-cyber-alphas", JSON.stringify(alphas));
      root.current?.setAttribute("data-cyber-configured-alphas", JSON.stringify(configured));
      console.info("[CyberBackdrop debug] all layer passes forced to alpha 1; configured production base alphas", { debug: alphas, production: configured });
    }
    root.current?.setAttribute("data-cyber-intensity", String(sceneIntensity));
    root.current?.setAttribute("data-cyber-debug", String(debugMode));

    const createWorld = () => {
      city.forEach((layer, index) => {
        layer.length = 0;
        if (!mobile && index === 2) return;
        const count = Math.ceil(width / (index === 0 ? 48 : 38)) + 3;
        for (let i = 0; i < count; i++) {
          const heightRatio = 0.055 + random() * 0.165;
          layer.push({ id: i, x: i / count, width: 0.025 + random() * 0.025, height: heightRatio, seed: random() });
        }
      });
      rain.length = 0;
      if (!mobile) {
        // Edge-heavy rain with a deliberately quiet center column.
        const count = Math.round(width * RAIN_DENSITY);
        for (let i = 0; i < count; i++) {
          const x = i % 2 ? random() * 0.15 : 0.85 + random() * 0.15;
          rain.push({ x, y: random(), speed: 0.008 + random() * 0.018, length: 3 + Math.floor(random() * 4), seed: random() });
        }
      }
      root.current?.setAttribute("data-rain-count", String(rain.length));
      root.current?.setAttribute("data-city-layers", String(mobile ? 1 : 2));
    };

    const resize = () => {
      const rect = section.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min((window.devicePixelRatio || 1) * BACKDROP_DPR_SCALE, 1.5);
      for (const layer of [canvas, cityLayer]) {
        layer.width = Math.round(width * dpr);
        layer.height = Math.round(height * dpr);
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cityCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createWorld();
      if (staticMode) draw(0, 0);
    };

    const drawSky = () => {
      const sky = sceneCtx.createLinearGradient(0, 0, 0, height * HORIZON_RATIO);
      sky.addColorStop(0, COLORS.skyTop); sky.addColorStop(1, COLORS.skyBottom);
      sceneCtx.fillStyle = sky; sceneCtx.fillRect(0, 0, width, height);
      const horizon = height * HORIZON_RATIO;
      const glow = sceneCtx.createLinearGradient(0, horizon - 100, 0, horizon + 18);
      glow.addColorStop(0, "rgba(255,61,184,0)");
      glow.addColorStop(0.68, `rgba(228,44,220,${effectAlpha(HORIZON_GLOW_ALPHA, 0.3)})`);
      glow.addColorStop(0.9, `rgba(129,78,255,${effectAlpha(HORIZON_GLOW_ALPHA, 0.38)})`);
      glow.addColorStop(1, "rgba(61,232,255,0)");
      sceneCtx.fillStyle = glow; sceneCtx.fillRect(0, horizon - 100, width, 120);
      const haze = sceneCtx.createRadialGradient(width * 0.5, horizon, 0, width * 0.5, horizon, width * 0.6);
      haze.addColorStop(0, `rgba(230,49,205,${effectAlpha(HORIZON_GLOW_ALPHA, 0.36)})`);
      haze.addColorStop(0.42, `rgba(134,58,207,${effectAlpha(HORIZON_GLOW_ALPHA, 0.22)})`);
      haze.addColorStop(1, "rgba(20,12,34,0)");
      sceneCtx.fillStyle = haze; sceneCtx.fillRect(0, horizon - 140, width, 210);
      sceneCtx.globalAlpha = intensity(0.84);
      sceneCtx.strokeStyle = COLORS.cyan; sceneCtx.lineWidth = 1.5;
      sceneCtx.beginPath(); sceneCtx.moveTo(0, horizon); sceneCtx.lineTo(width, horizon); sceneCtx.stroke();
      sceneCtx.globalAlpha = 1;
    };

    const drawSun = (time: number) => {
      const portrait = section.querySelector<HTMLElement>(".closing-portrait")?.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const centerX = portrait ? portrait.left - sectionRect.left + portrait.width * 0.49 : width * 0.72;
      const centerY = portrait ? portrait.top - sectionRect.top + portrait.height * 0.42 : height * 0.42;
      const radius = height * (mobile ? 0.25 : 0.3);
      const alpha = intensity(SUN_ALPHA);
      sceneCtx.save();
      sceneCtx.globalAlpha = alpha;
      const halo = sceneCtx.createRadialGradient(centerX, centerY, radius * 0.86, centerX, centerY, radius + 24);
      halo.addColorStop(0, "rgba(255,61,184,0)"); halo.addColorStop(0.72, `rgba(255,61,184,${debugMode ? 1 : 0.42 * sceneIntensity})`); halo.addColorStop(1, "rgba(116,66,255,0)");
      sceneCtx.fillStyle = halo; sceneCtx.beginPath(); sceneCtx.arc(centerX, centerY, radius + 24, 0, Math.PI * 2); sceneCtx.fill();
      const disc = sceneCtx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
      disc.addColorStop(0, "#ff5ac6"); disc.addColorStop(0.48, "#b840ed"); disc.addColorStop(1, "#5130bd");
      sceneCtx.fillStyle = disc; sceneCtx.beginPath(); sceneCtx.arc(centerX + (pointerX - 0.5) * 10, centerY, radius, 0, Math.PI * 2); sceneCtx.fill();
      sceneCtx.save();
      sceneCtx.beginPath(); sceneCtx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2); sceneCtx.clip();
      sceneCtx.fillStyle = COLORS.base;
      const slitSpacing = Math.max(15, height * 0.027);
      const slitOffset = (time * (mobile ? 3.5 : 5.5)) % slitSpacing;
      for (let y = centerY - radius + slitOffset; y < centerY + radius; y += slitSpacing) {
        const slitHeight = Math.max(3, height * 0.008);
        sceneCtx.fillRect(centerX - radius, y, radius * 2, slitHeight);
      }
      sceneCtx.restore();
      sceneCtx.globalAlpha = Math.min(1, alpha + 0.1);
      sceneCtx.strokeStyle = COLORS.magenta; sceneCtx.lineWidth = 5; sceneCtx.globalAlpha = debugMode ? 1 : sceneCtx.globalAlpha * 0.14;
      sceneCtx.beginPath(); sceneCtx.arc(centerX, centerY, radius, 0, Math.PI * 2); sceneCtx.stroke();
      sceneCtx.globalAlpha = alpha;
      sceneCtx.lineWidth = 2; sceneCtx.stroke();
      sceneCtx.restore();
    };

    const drawCity = (time: number) => {
      if (time - cityPaintAt >= 0.25 || Math.abs(pointerX - cityPaintPointerX) >= 0.02) {
        const paint = cityCtx;
        const horizon = height * HORIZON_RATIO;
        const layers = mobile ? [1] : [0, 1];
        paint.clearRect(0, 0, width, height);
        for (const index of layers) {
          const buildings = city[index];
          const parallax = (pointerX - 0.5) * width * CITY_PARALLAX[index];
          const buildingColor = [COLORS.farCity, COLORS.midCity, COLORS.nearCity][index];
          paint.save();
          if (index === 0 && !mobile) paint.filter = "blur(0.8px)";
          for (const building of buildings) {
            const x = building.x * width + parallax;
            const y = horizon - building.height * height;
            const bw = building.width * width;
            paint.globalAlpha = intensity(CITY_LAYER_ALPHA[index]);
            paint.fillStyle = buildingColor;
            paint.fillRect(x, y, bw, horizon - y + 4);
            paint.globalAlpha = intensity(0.35);
            paint.strokeStyle = debugMode ? "rgba(220,204,255,1)" : "rgba(190,158,238,.82)";
            paint.lineWidth = 1;
            paint.beginPath(); paint.moveTo(x, y); paint.lineTo(x + bw, y); paint.stroke();
            const rows = Math.max(2, Math.floor(building.height * height / 13));
            const columns = Math.max(1, Math.floor(bw / 9));
            const dynamicIds = new Set([Math.floor(buildings.length * 0.18), Math.floor(buildings.length * 0.5), Math.floor(buildings.length * 0.82)]);
            for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
              const hash = Math.floor(building.seed * 100000) + row * 31 + col * 17 + index * 11;
              const dynamicWindow = dynamicIds.has(building.id) && row === 0 && col === 0;
              if (!dynamicWindow && ((hash % 100) + 100) % 100 >= 4) continue;
              const period = 4 + (Math.abs(hash) % 7);
              const fade = dynamicWindow ? 0.5 + 0.5 * Math.sin((time / period + building.seed) * Math.PI * 2) : 0.9;
              paint.globalAlpha = effectAlpha(WINDOW_ALPHA, fade);
              paint.fillStyle = (row + col + index) % 7 === 0 ? COLORS.amber : (row + col + index) % 2 ? COLORS.cyan : COLORS.magenta;
              paint.fillRect(x + 3 + col * 9, y + 6 + row * 13, 3, 4);
            }
          }
          paint.restore();
        }

        const signs = mobile ? 2 : 3;
        for (let i = 0; i < signs; i++) {
          const x = width * (mobile ? (i === 0 ? 0.08 : 0.82) : [0.12, 0.76, 0.89][i]) + (pointerX - 0.5) * (mobile ? 0 : 18);
          const y = horizon - 28 - (i % 3) * 35;
          const signColor = i % 5 === 0 ? COLORS.amber : i % 2 ? COLORS.magenta : COLORS.cyan;
          const pulse = i === 0 ? 0.82 + Math.sin(time * 0.22) * 0.08 : 0.86;
          paint.globalAlpha = effectAlpha(SIGN_ALPHA, pulse);
          paint.strokeStyle = signColor; paint.lineWidth = 1.5;
          paint.strokeRect(x, y, mobile ? 21 : 28 + (i % 3) * 8, 11);
          paint.fillStyle = signColor; paint.globalAlpha = effectAlpha(SIGN_ALPHA, pulse);
          paint.fillRect(x + 4, y + 4, mobile ? 12 : 18, 3);
        }
        paint.globalAlpha = 1; paint.filter = "none";
        cityPaintAt = time; cityPaintPointerX = pointerX;
      }
      sceneCtx.drawImage(cityLayer, 0, 0, width, height);
    };

    const drawRain = (dt: number, time: number) => {
      if (mobile) return;
      sceneCtx.font = "12px monospace";
      sceneCtx.textAlign = "center";
      for (const drop of rain) {
        drop.y += drop.speed * dt / 1000;
        if (drop.y > 1.02) drop.y = -0.05;
        const edgeFactor = Math.min(1, Math.abs(drop.x - 0.5) * 4.2);
        const flicker = 0.82;
        // Keep the head and a short visible tail; this avoids hundreds of
        // per-frame text draws while preserving the falling-rain read.
        for (let i = 0; i < Math.min(drop.length, 4); i++) {
          const char = GLYPHS[Math.floor((time * 3 + drop.seed * 71 + i * 1.7) % GLYPHS.length)];
          const isHead = i === 0;
          sceneCtx.globalAlpha = effectAlpha(RAIN_ALPHA, edgeFactor * flicker * (isHead ? 1 : (1 - i / drop.length) * 0.55));
          sceneCtx.fillStyle = isHead ? COLORS.whiteCyan : (drop.seed > 0.5 ? COLORS.cyan : "#ad8bff");
          sceneCtx.fillText(char, drop.x * width, (drop.y - i * 0.019) * height);
        }
      }
      sceneCtx.globalAlpha = 1;
    };

    const drawGrid = (time: number) => {
      const horizon = height * HORIZON_RATIO;
      const floorHeight = height - horizon;
      sceneCtx.save();
      sceneCtx.beginPath(); sceneCtx.rect(0, horizon, width, floorHeight); sceneCtx.clip();
      const floorGlow = sceneCtx.createLinearGradient(0, horizon, 0, height);
      floorGlow.addColorStop(0, `rgba(61,232,255,${effectAlpha(GRID_ALPHA, 0.28)})`);
      floorGlow.addColorStop(1, "rgba(85,42,160,0)");
      sceneCtx.fillStyle = floorGlow; sceneCtx.fillRect(0, horizon, width, floorHeight);
      const phase = (time * GRID_SPEED / 900) % 1;
      const horizontalCount = mobile ? 11 : 20;
      for (let line = 0; line < horizontalCount; line++) {
        const progress = ((line / horizontalCount + phase) % 1);
        const perspective = progress * progress;
        const y = horizon + perspective * floorHeight;
        const fade = GRID_ALPHA * (1 - perspective) + GRID_BOTTOM_ALPHA * perspective;
        sceneCtx.globalAlpha = intensity(fade);
        sceneCtx.strokeStyle = line % 4 === 0 ? COLORS.cyan : COLORS.grid;
        sceneCtx.lineWidth = 0.55 + perspective * (mobile ? 0.8 : 1.25);
        sceneCtx.beginPath(); sceneCtx.moveTo(0, y); sceneCtx.lineTo(width, y); sceneCtx.stroke();
      }
      const sideCount = mobile ? 5 : 10;
      for (let line = -sideCount; line <= sideCount; line++) {
        const bottomX = width * (0.5 + line * (mobile ? 0.2 : 0.105));
        sceneCtx.globalAlpha = intensity(GRID_ALPHA * (0.45 + (1 - Math.abs(line) / (sideCount + 1)) * 0.48));
        sceneCtx.strokeStyle = line % 3 === 0 ? COLORS.cyan : COLORS.grid;
        sceneCtx.lineWidth = 0.75 + (1 - Math.abs(line) / (sideCount + 1)) * 0.75;
        sceneCtx.beginPath(); sceneCtx.moveTo(width * 0.5, horizon); sceneCtx.lineTo(bottomX, height + 8); sceneCtx.stroke();
      }
      sceneCtx.globalAlpha = 1;
      if (!mobile && hasPointer && pointerTargetY > HORIZON_RATIO) {
        const x = pointerX * width; const y = pointerTargetY * height;
        const ring = sceneCtx.createRadialGradient(x, y, 2, x, y, 115);
        ring.addColorStop(0, "rgba(61,232,255,0.32)"); ring.addColorStop(0.42, "rgba(164,90,255,0.17)"); ring.addColorStop(1, "rgba(61,232,255,0)");
        sceneCtx.fillStyle = ring; sceneCtx.beginPath(); sceneCtx.arc(x, y, 115, 0, Math.PI * 2); sceneCtx.fill();
        sceneCtx.strokeStyle = "rgba(61,232,255,.64)"; sceneCtx.lineWidth = 1.4;
        sceneCtx.beginPath(); sceneCtx.ellipse(x, y, 35, 10, 0, 0, Math.PI * 2); sceneCtx.stroke();
      }
      sceneCtx.restore();
    };

    const drawStarsAndVehicle = (dt: number) => {
      const horizon = height * HORIZON_RATIO;
      for (let i = 0; i < (mobile ? 24 : 58); i++) {
        const x = ((i * 0.618 + 0.11) % 1) * width + (pointerX - 0.5) * 5;
        const y = ((i * 0.371) % 1) * horizon;
        sceneCtx.globalAlpha = debugMode ? 1 : intensity(0.1 + ((Math.sin(i * 2.4) + 1) * 0.025));
        sceneCtx.fillStyle = i % 4 === 0 ? COLORS.cyan : "#d8c2ff";
        sceneCtx.fillRect(x, y, 1.6, 1.6);
      }
      if (performance.now() >= vehicleAt) {
        vehicleX = -0.15; vehicleY = 0.43 + random() * 0.09;
        vehicleAt = performance.now() + VEHICLE_DELAY_MS[0] + random() * (VEHICLE_DELAY_MS[1] - VEHICLE_DELAY_MS[0]);
      }
      if (vehicleX < 1.15) {
        vehicleX += dt * VEHICLE_SPEED;
        const x = vehicleX * width; const y = vehicleY * height;
        const trail = sceneCtx.createLinearGradient(x - 100, y, x + 3, y);
        trail.addColorStop(0, "rgba(61,232,255,0)"); trail.addColorStop(0.72, `rgba(255,61,184,${effectAlpha(VEHICLE_ALPHA, 0.58)})`); trail.addColorStop(1, `rgba(235,252,255,${effectAlpha(VEHICLE_ALPHA, 0.92)})`);
        sceneCtx.strokeStyle = trail; sceneCtx.lineWidth = 2; sceneCtx.shadowColor = COLORS.cyan; sceneCtx.shadowBlur = 10;
        sceneCtx.beginPath(); sceneCtx.moveTo(x - 100, y); sceneCtx.lineTo(x + 3, y); sceneCtx.stroke();
        sceneCtx.fillStyle = COLORS.whiteCyan; sceneCtx.globalAlpha = intensity(VEHICLE_ALPHA); sceneCtx.beginPath(); sceneCtx.arc(x, y, 2.6, 0, Math.PI * 2); sceneCtx.fill();
        sceneCtx.shadowBlur = 0;
      }
      sceneCtx.globalAlpha = 1;
    };

    function draw(dt: number, time: number) {
      if (!width || !height) return;
      sceneCtx.clearRect(0, 0, width, height);
      drawSky();
      drawSun(time);
      drawStarsAndVehicle(dt);
      drawCity(time);
      drawRain(dt, time);
      drawGrid(time);
      if (!debugMode) {
        const vignette = sceneCtx.createRadialGradient(width * 0.5, height * 0.48, width * 0.16, width * 0.5, height * 0.48, width * 0.8);
        vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(3,2,8,0.2)");
        sceneCtx.fillStyle = vignette; sceneCtx.fillRect(0, 0, width, height);
      }
      if (debugMode) {
        sceneCtx.save(); sceneCtx.globalAlpha = 1; sceneCtx.font = "bold 12px monospace"; sceneCtx.fillStyle = "#fff"; sceneCtx.shadowColor = "#000"; sceneCtx.shadowBlur = 4;
        DEBUG_LAYER_LABELS.forEach((label, i) => sceneCtx.fillText(label, 14, 22 + i * 19));
        sceneCtx.restore();
      }
    }

    const tick = (now: number) => {
      raf = 0;
      if (!active || !pageVisible || staticMode) return;
      const frameCap = mobile ? 1000 / 30 : 1000 / 60;
      if (lastFrame && now - lastFrame < frameCap - 5) { raf = requestAnimationFrame(tick); return; }
      const dt = lastFrame ? Math.min(50, now - lastFrame) : frameCap;
      lastFrame = now;
      pointerX += (pointerTargetX - pointerX) * Math.min(1, dt * 0.004);
      elapsed += dt;
      const start = performance.now();
      draw(dt, elapsed / 1000);
      const drawMs = performance.now() - start;
      frames++; drawMsTotal += drawMs;
      if (now - fpsStart >= 500) {
        const node = root.current;
        if (node) { node.dataset.fps = String(Math.round(frames * 1000 / (now - fpsStart))); node.dataset.frameMs = (drawMsTotal / Math.max(1, frames)).toFixed(3); }
        frames = 0; drawMsTotal = 0; fpsStart = now;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (staticMode) { draw(0, 0); root.current?.setAttribute("data-motion", "static"); return; }
      if (active && pageVisible && !raf) { lastFrame = 0; fpsStart = performance.now(); raf = requestAnimationFrame(tick); root.current?.setAttribute("data-motion", "running"); }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; lastFrame = 0; root.current?.setAttribute("data-motion", "paused");
    };
    const intersection = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) start(); else stop(); }, { threshold: 0.01 });
    intersection.observe(section);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);
    const onVisibility = () => { pageVisible = !document.hidden; if (pageVisible && active) start(); else stop(); };
    const onPointerMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      pointerTargetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      pointerTargetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)); hasPointer = true;
    };
    root.current?.style.setProperty("--cyber-glitch-interval", `${GLITCH_INTERVAL_MS}ms`);
    root.current?.style.setProperty("--cyber-scanline-alpha", String(SCANLINE_ALPHA));
    root.current?.style.setProperty("--cyber-glitch-enabled", staticMode ? "0" : "1");
    if (!mobile) section.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    if (staticMode) draw(0, 0);

    return () => {
      active = false; stop(); intersection.disconnect(); resizeObserver.disconnect();
      section.removeEventListener("pointermove", onPointerMove); document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <div className="cyber-backdrop" ref={root} aria-hidden="true">
    <canvas ref={canvasRef} />
    <div className="cyber-focus-falloff" aria-hidden="true" />
    <div className="cyber-hud" aria-hidden="true"><span>SYS.ONLINE</span><span>LAT 12.30 / LON 76.65</span><span>GRID // ACTIVE</span></div>
    <div className="cyber-scanlines" aria-hidden="true" />
  </div>;
}

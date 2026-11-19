import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { chromium } from "playwright";

const phase = process.argv[2] || "before";
const base = process.env.PORTFOLIO_URL || "http://localhost:3001";
const out = `.qa/mission-2c/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1400);
const initial = await page.evaluate(() => ({
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  coarsePointer: matchMedia("(pointer: coarse)").matches,
  lenisActive: document.documentElement.classList.contains("lenis"),
  canvas: (() => { const node = document.querySelector(".swarm-cursor-canvas"); if (!node) return null; const style = getComputedStyle(node); return { mounted: true, position: style.position, zIndex: style.zIndex, pointerEvents: style.pointerEvents, display: style.display, rect: node.getBoundingClientRect().toJSON() }; })(),
}));

const frames = [];
let target = 0;
let index = 0;
while (true) {
  if (index > 0) {
    const amount = Math.min(200, target - (await page.evaluate(() => Math.round(scrollY))));
    await page.mouse.wheel(0, Math.max(1, amount));
  }
  await page.waitForTimeout(850);
  const state = await page.evaluate(() => {
    const elements = [...document.querySelectorAll("main h1, main h2, main h3, main p, main img, main figure, main article")];
    const visible = elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.bottom <= 0 || rect.top >= innerHeight || style.display === "none" || style.visibility === "hidden") return [];
      let opacity = Number(style.opacity);
      let parent = element.parentElement;
      while (parent && parent !== document.body) { opacity *= Number(getComputedStyle(parent).opacity); parent = parent.parentElement; }
      if (opacity < .12) return [];
      const text = element.matches("img,figure,article") ? element.getAttribute("alt") || element.querySelector("img")?.alt || element.className : element.textContent?.trim().replace(/\s+/g, " ");
      return text ? [{ tag: element.tagName, text: text.slice(0, 60), rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, opacity: Number(opacity.toFixed(2)) }] : [];
    });
    const panel = document.querySelector(".signature-section");
    const panelRect = panel?.getBoundingClientRect();
    return { y: Math.round(scrollY), maxY: document.documentElement.scrollHeight - innerHeight, lenisClass: document.documentElement.classList.contains("lenis"), visible: visible.slice(0, 14), panel: panelRect ? { top: Math.round(panelRect.top), height: Math.round(panelRect.height), bottom: Math.round(panelRect.bottom) } : null };
  });
  const name = `${String(index).padStart(3, "0")}-y${String(state.y).padStart(5, "0")}.png`;
  const buffer = await page.screenshot({ path: `${out}/${name}` });
  const { data, info } = await sharp(buffer).resize({ width: 144, height: 90 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let darkPixels = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] + data[i + 1] + data[i + 2] < 42) darkPixels += 1;
  state.darkRatio = Number((darkPixels / (info.width * info.height)).toFixed(2));
  state.frame = name;
  const signal = state.visible.filter((element) => element.tag !== "ARTICLE" && element.tag !== "FIGURE").length;
  state.flagged = state.darkRatio > .82 && signal < 3;
  frames.push(state);
  if (state.y >= state.maxY - 2) break;
  target = state.y + 200;
  index += 1;
}

await page.evaluate(() => window.scrollTo(0, 0));
await page.locator(".tech-section").scrollIntoViewIfNeeded();
await page.mouse.move(720, 450);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/swarm-dark.png` });
await page.locator(".story-feature").scrollIntoViewIfNeeded();
await page.mouse.move(700, 450);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/swarm-cream.png` });
await writeFile(`${out}/report.json`, JSON.stringify({ phase, initial, frames, flagged: frames.filter((frame) => frame.flagged), errors }, null, 2));
console.log(JSON.stringify({ phase, ...initial, frames: frames.length, flagged: frames.filter((frame) => frame.flagged).map(({ frame, y, darkRatio, visible }) => ({ frame, y, darkRatio, visible })), errors }));
await browser.close();
if (errors.length) process.exitCode = 1;

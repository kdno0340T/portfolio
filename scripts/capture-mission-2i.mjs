import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const baseUrl = process.env.PORTFOLIO_URL || "http://localhost:3005";
const output = ".qa/mission-2i";
await mkdir(path.join(output, "video"), { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(output, "video"), size: { width: 1440, height: 900 } } });
const desktop = await desktopContext.newPage();
const defaultReducedMotion = await desktop.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
await desktop.goto(baseUrl, { waitUntil: "domcontentloaded" });
await desktop.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
await desktop.evaluate(() => document.fonts.ready);
await desktop.locator(".hero-glyph-row-1 .hero-glyph-copy").first().waitFor();
await desktop.waitForTimeout(900);

const sampleRows = async (page) => page.evaluate(() => [...document.querySelectorAll(".hero-glyphs-front .hero-glyph-row")].map((row, index) => {
  const glyph = row.querySelector(".hero-glyph-copy");
  const rect = glyph.getBoundingClientRect();
  return { row: index + 1, x: Number(rect.x.toFixed(2)), direction: index % 2 === 0 ? "left" : "right", opacity: getComputedStyle(row).color };
}));
const positions = [];
positions.push({ t: 0, rows: await sampleRows(desktop) });
await desktop.screenshot({ path: path.join(output, "hero-1440-t0.png") });
await desktop.waitForTimeout(3000);
positions.push({ t: 3, rows: await sampleRows(desktop) });
await desktop.screenshot({ path: path.join(output, "hero-1440-t3.png") });
await desktop.waitForTimeout(5000);
positions.push({ t: 8, rows: await sampleRows(desktop) });
await desktop.screenshot({ path: path.join(output, "hero-1440-t8.png") });

const desktopCoverage = await desktop.evaluate(() => {
  const root = document.querySelector(".hero-glyphs");
  const hero = document.querySelector(".hero");
  const original = root.style.visibility;
  const glyphs = [...document.querySelectorAll(".hero-glyphs-depth, .hero-glyphs-front")];
  glyphs.forEach((node) => { node.style.animationPlayState = "paused"; });
  const visible = true;
  return { visible, rootBox: root.getBoundingClientRect().toJSON(), heroBox: hero.getBoundingClientRect().toJSON(), mask: getComputedStyle(root).maskImage, rowCount: document.querySelectorAll(".hero-glyphs-front .hero-glyph-row:not([style*='display: none'])").length, original };
});
await desktop.addStyleTag({ content: ".hero-copy,.hero-side-note,.hero-topline,.hero-bottomline,.hero-artwork,.hero-title { visibility:hidden!important }" });
const glyphOn = await desktop.screenshot();
await desktop.addStyleTag({ content: ".hero-glyphs { visibility:hidden!important }" });
const glyphOff = await desktop.screenshot();
const on = await sharp(glyphOn).raw().toBuffer({ resolveWithObject: true });
const off = await sharp(glyphOff).raw().toBuffer({ resolveWithObject: true });
const thirds = [0, 1, 2].map((part) => {
  const x0 = Math.floor(on.info.width * part / 3);
  const x1 = Math.floor(on.info.width * (part + 1) / 3);
  let changedPixels = 0;
  for (let y = 0; y < Math.min(on.info.height, 900); y += 1) for (let x = x0; x < x1; x += 1) {
    const offset = (y * on.info.width + x) * on.info.channels;
    const delta = Math.abs(on.data[offset] - off.data[offset]) + Math.abs(on.data[offset + 1] - off.data[offset + 1]) + Math.abs(on.data[offset + 2] - off.data[offset + 2]);
    if (delta > 1) changedPixels += 1;
  }
  return { region: [x0, x1], changedPixels };
});
await desktop.evaluate(() => { window.scrollTo(0, document.querySelector(".hero").offsetHeight + 200); });
await desktop.waitForTimeout(400);
const offscreen = await sampleRows(desktop);
await desktop.waitForTimeout(1500);
const offscreenLater = await sampleRows(desktop);
await desktopContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mobile = await mobileContext.newPage();
await mobile.goto(baseUrl, { waitUntil: "domcontentloaded" });
await mobile.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
await mobile.evaluate(() => document.fonts.ready);
await mobile.screenshot({ path: path.join(output, "hero-390.png") });
const mobileStart = await sampleRows(mobile);
await mobile.waitForTimeout(2000);
const mobileAfter = await sampleRows(mobile);
const mobileCheck = await mobile.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.querySelector(".hero").getBoundingClientRect().height, rows: [...document.querySelectorAll(".hero-glyphs-front .hero-glyph-row")].map((row) => ({ display: getComputedStyle(row).display, top: row.getBoundingClientRect().top, height: row.getBoundingClientRect().height })), mask: getComputedStyle(document.querySelector(".hero-glyphs")).maskImage, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches }));
await mobileContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const reduced = await reducedContext.newPage();
await reduced.goto(baseUrl, { waitUntil: "domcontentloaded" });
await reduced.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
const reducedT0 = await sampleRows(reduced);
await reduced.waitForTimeout(1500);
const reducedT1 = await sampleRows(reduced);
const reducedMotion = await reduced.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
await reducedContext.close();
await browser.close();

const report = {
  baseUrl,
  defaultReducedMotion,
  reducedMotion,
  desktopCoverage,
  thirds,
  motion: positions.map((snapshot) => ({ ...snapshot, shiftsFromT0: snapshot.t === 0 ? positions[0].rows.map(() => 0) : snapshot.rows.map((row, index) => Number((row.x - positions[0].rows[index].x).toFixed(2))) })),
  offscreenPauseMaxDelta: Math.max(...offscreen.map((row, index) => Math.abs(row.x - offscreenLater[index].x))),
  mobile: mobileCheck,
  mobileMotionShift: mobileStart.map((row, index) => Number((mobileAfter[index].x - row.x).toFixed(2))),
  reducedMotionStaticMaxDelta: Math.max(...reducedT0.map((row, index) => Math.abs(row.x - reducedT1[index].x))),
  video: "video/"
};
await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

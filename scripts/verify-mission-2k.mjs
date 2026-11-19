import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const baseUrl = process.env.PORTFOLIO_URL || "http://localhost:3005";
const output = ".qa/mission-2k";
await mkdir(path.join(output, "video"), { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { baseUrl, errors: [], desktop: {}, mobile: {}, checks: {} };

async function openPage(viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".page-main")?.dataset.ready === "true", { timeout: 25000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".closing-section").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const section = document.querySelector(".closing-section");
    if (section) window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top, behavior: "instant" });
  });
  await page.waitForTimeout(200);
  return { context, page, section: page.locator(".closing-section"), canvas: page.locator(".closing-section canvas") };
}

async function canvasCapture(canvas, file) {
  const buffer = await canvas.screenshot();
  await writeFile(path.join(output, file), buffer);
  return buffer;
}

async function readCanvas(page) {
  const dataUrl = await page.locator(".closing-section canvas").evaluate((canvas) => canvas.toDataURL("image/png"));
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

async function diffPixels(first, second, topRatio, bottomRatio) {
  const a = await sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(second).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let changed = 0; let sum = 0; let max = 0;
  const y0 = Math.floor(a.info.height * topRatio); const y1 = Math.floor(a.info.height * bottomRatio);
  for (let y = y0; y < y1; y++) for (let x = 0; x < a.info.width; x++) {
    const i = (y * a.info.width + x) * a.info.channels;
    const delta = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (delta > 24) { changed++; sum += delta; max = Math.max(max, delta); }
  }
  return { changedPixels: changed, meanRgbDelta: changed ? Number((sum / changed).toFixed(2)) : 0, maxRgbDelta: max };
}

const desktop = await openPage({ width: 1440, height: 900 }, { recordVideo: { dir: path.join(output, "video"), size: { width: 1440, height: 900 } } });
report.checks.reducedMotionDesktop = await desktop.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
report.desktop.section = await desktop.section.boundingBox();
report.desktop.zOrder = await desktop.page.evaluate(() => ({ backdrop: getComputedStyle(document.querySelector(".cyber-backdrop")).zIndex, headline: getComputedStyle(document.querySelector(".closing-section h2")).zIndex, portrait: getComputedStyle(document.querySelector(".closing-portrait")).zIndex }));
report.checks.otherRunningBackdrops = await desktop.page.locator(".hero .glyph-backdrop,.story-feature .glyph-backdrop,.photo-section .glyph-backdrop,.statement-section .glyph-backdrop").count();
report.checks.closingHasGlyphBackdrop = await desktop.page.locator(".closing-section .glyph-backdrop").count() > 0;
const desktopFrames = [];
desktopFrames.push(await canvasCapture(desktop.canvas, "desktop-canvas-t0.png"));
await desktop.section.screenshot({ path: path.join(output, "closing-1440-t0.png") });
await desktop.page.waitForTimeout(2000);
desktopFrames.push(await canvasCapture(desktop.canvas, "desktop-canvas-t2.png"));
await desktop.section.screenshot({ path: path.join(output, "closing-1440-t2.png") });
await desktop.page.waitForTimeout(3000);
desktopFrames.push(await canvasCapture(desktop.canvas, "desktop-canvas-t5.png"));
await desktop.section.screenshot({ path: path.join(output, "closing-1440-t5.png") });
report.desktop.pixelChange = {
  gridT0ToT2: await diffPixels(desktopFrames[0], desktopFrames[1], .58, 1),
  cityT0ToT2: await diffPixels(desktopFrames[0], desktopFrames[1], .34, .58),
  gridT2ToT5: await diffPixels(desktopFrames[1], desktopFrames[2], .58, 1),
  cityT2ToT5: await diffPixels(desktopFrames[1], desktopFrames[2], .34, .58),
};
report.desktop.frameRate = await desktop.page.evaluate(() => new Promise((resolve) => {
  let frames = 0; let first = 0; let last = 0;
  const sample = (now) => { if (!first) first = now; last = now; frames++; if (now - first < 5000) requestAnimationFrame(sample); else resolve({ rafFps: Number(((frames - 1) * 1000 / (last - first)).toFixed(1)), canvasFps: document.querySelector(".cyber-backdrop")?.dataset.fps, averageDrawMs: document.querySelector(".cyber-backdrop")?.dataset.frameMs }); };
  requestAnimationFrame(sample);
}));
const desktopVideo = desktop.page.video();
await desktop.page.close();
await desktop.context.close();
report.desktop.video = desktopVideo ? await desktopVideo.path() : "video saved in output folder";

const mobile = await openPage({ width: 390, height: 844 });
report.mobile.section = await mobile.section.boundingBox();
report.mobile.scrollWidth = await mobile.page.evaluate(() => document.documentElement.scrollWidth);
report.mobile.canvas = await mobile.page.locator(".cyber-backdrop").evaluate((node) => ({ canvasCount: node.querySelectorAll("canvas").length, rainCount: node.dataset.rainCount, cityLayers: node.dataset.cityLayers, mode: node.dataset.motion }));
for (const [name, wait] of [["t0", 0], ["t2", 2000], ["t5", 3000]]) {
  if (wait) await mobile.page.waitForTimeout(wait);
  await mobile.canvas.screenshot({ path: path.join(output, `mobile-canvas-${name}.png`) });
  await mobile.section.screenshot({ path: path.join(output, `closing-390-${name}.png`) });
}
await mobile.context.close();

const pause = await openPage({ width: 1440, height: 900 });
await pause.page.locator(".cyber-backdrop").waitFor({ state: "visible" });
await pause.page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await pause.page.waitForTimeout(300);
report.checks.offscreenMode = await pause.page.locator(".cyber-backdrop").getAttribute("data-motion");
report.checks.offscreenScrollY = await pause.page.evaluate(() => window.scrollY);
const pausedOne = await readCanvas(pause.page);
await pause.page.waitForTimeout(900);
const pausedTwo = await readCanvas(pause.page);
report.checks.offscreenPixelChange = await diffPixels(pausedOne, pausedTwo, 0, 1);
report.checks.offscreenCanvasStatic = report.checks.offscreenPixelChange.changedPixels === 0;
await pause.context.close();

const reduced = await openPage({ width: 1440, height: 900 }, { reducedMotion: "reduce" });
report.checks.reducedMotion = await reduced.page.evaluate(() => ({ value: matchMedia("(prefers-reduced-motion: reduce)").matches, mode: document.querySelector(".cyber-backdrop")?.dataset.motion, headlineAnimation: getComputedStyle(document.querySelector(".closing-section h2 span")).animationName }));
const staticOne = await readCanvas(reduced.page);
await reduced.page.waitForTimeout(1000);
const staticTwo = await readCanvas(reduced.page);
report.checks.reducedPixelChange = await diffPixels(staticOne, staticTwo, 0, 1);
report.checks.reducedCanvasStatic = report.checks.reducedPixelChange.changedPixels === 0;
await reduced.context.close();

await browser.close();
await writeFile(path.join(output, "verification-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

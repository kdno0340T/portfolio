import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.PORTFOLIO_URL || "http://localhost:3001";
const out = ".qa/mission-2e";
await mkdir(`${out}/video`, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { reducedMotion: null, font: null, motion: null, mobile: null, errors: [] };

async function ready(page) {
  await page.goto(`${base}/?preload=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".page-main")?.dataset.ready === "true", { timeout: 20000 });
  await page.locator(".preloader").waitFor({ state: "detached", timeout: 5000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
}

const videoContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: `${out}/video`, size: { width: 1440, height: 900 } } });
const desktop = await videoContext.newPage();
desktop.on("pageerror", (error) => report.errors.push(error.message));
desktop.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
await ready(desktop);
await desktop.mouse.move(720, 450);
await desktop.waitForFunction(() => {
  const track = document.querySelector(".hero-glyph-track");
  const row = document.querySelector(".hero-glyph-row");
  return Boolean(track && row && getComputedStyle(track).transform !== "none");
}, { timeout: 10000 }).catch(() => undefined);
await desktop.waitForTimeout(300);
await desktop.screenshot({ path: `${out}/after-1440.png` });
const initial = await desktop.evaluate(() => {
  const row = document.querySelector(".hero-glyph-row-1 .hero-glyph-copy");
  const body = document.querySelector(".hero-copy .hero-description p:not(.hero-tagline)");
  const style = body ? getComputedStyle(body) : null;
  return {
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    bodyFont: style?.fontFamily,
    bodyFontLoaded: document.fonts.check("16px bodyFont"),
    glyphX: row?.getBoundingClientRect().x ?? null,
    hero: document.querySelector(".hero")?.getBoundingClientRect().toJSON(),
    portrait: document.querySelector(".hero-artwork")?.getBoundingClientRect().toJSON(),
    glyphCount: document.querySelectorAll(".hero-glyph-row").length,
  };
});
await desktop.waitForTimeout(3000);
const later = await desktop.evaluate(() => document.querySelector(".hero-glyph-row-1 .hero-glyph-copy")?.getBoundingClientRect().x ?? null);
await desktop.screenshot({ path: `${out}/motion-t3.png` });
report.reducedMotion = initial.reducedMotion;
report.font = { computedFamily: initial.bodyFont, documentFontCheck: initial.bodyFontLoaded, fonts: await desktop.evaluate(() => [...document.fonts].map((font) => ({ family: font.family, status: font.status }))) };
report.motion = { glyphCount: initial.glyphCount, t0X: initial.glyphX, t3X: later, pixelShift: initial.glyphX === null || later === null ? null : Number((later - initial.glyphX).toFixed(2)), durationSeconds: 3, hero: initial.hero, portrait: initial.portrait };
await desktop.evaluate(() => window.scrollTo(0, 1400));
await desktop.waitForFunction(() => document.querySelector(".hero")?.getBoundingClientRect().bottom <= 0, { timeout: 10000 });
await desktop.waitForTimeout(350);
const offscreenT0 = await desktop.locator(".hero-glyph-row-1 .hero-glyph-copy").first().evaluate((node) => node.getBoundingClientRect().x);
await desktop.waitForTimeout(900);
const offscreenT1 = await desktop.locator(".hero-glyph-row-1 .hero-glyph-copy").first().evaluate((node) => node.getBoundingClientRect().x);
report.motion.offscreenPauseShift = Number((offscreenT1 - offscreenT0).toFixed(2));
const video = desktop.video();
await videoContext.close();
report.video = await video.path();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const mobile = await mobileContext.newPage();
mobile.on("pageerror", (error) => report.errors.push(error.message));
mobile.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
await ready(mobile);
await mobile.screenshot({ path: `${out}/after-390.png` });
report.mobile = await mobile.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth, heroHeight: document.querySelector(".hero")?.getBoundingClientRect().height, coarse: matchMedia("(pointer: coarse)").matches }));
await mobileContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const reducedPage = await reducedContext.newPage();
await ready(reducedPage);
const reducedT0 = await reducedPage.locator(".hero-glyph-row-1 .hero-glyph-copy").first().evaluate((node) => node.getBoundingClientRect().x);
await reducedPage.waitForTimeout(1200);
const reducedT1 = await reducedPage.locator(".hero-glyph-row-1 .hero-glyph-copy").first().evaluate((node) => node.getBoundingClientRect().x);
report.reducedMotionShift = Number((reducedT1 - reducedT0).toFixed(2));
await reducedContext.close();

await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (report.errors.length) process.exitCode = 1;

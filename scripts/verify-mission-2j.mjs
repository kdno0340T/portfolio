import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const baseUrl = process.env.PORTFOLIO_URL || "http://localhost:3005";
const output = ".qa/mission-2j/after";
await mkdir(path.join(output, "video"), { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { baseUrl, sections: [], consoleErrors: [], screenshots: {}, motion: {}, reducedMotion: null };

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(output, "video"), size: { width: 1440, height: 900 } } });
const desktop = await desktopContext.newPage();
desktop.on("pageerror", (error) => report.consoleErrors.push(error.message));
await desktop.goto(baseUrl, { waitUntil: "domcontentloaded" });
await desktop.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
await desktop.evaluate(() => document.fonts.ready);
report.reducedMotion = await desktop.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
await desktop.waitForTimeout(150);

const frontRows = async (page) => page.evaluate(() => [...document.querySelectorAll(".hero .glyph-backdrop-row")].map((row, index) => {
  const copy = row.querySelector(".glyph-backdrop-track > span");
  return { row: index + 1, x: Number(copy.getBoundingClientRect().x.toFixed(2)), direction: index % 2 ? "right" : "left", duration: getComputedStyle(row.querySelector(".glyph-backdrop-track")).animationDuration };
}));
report.motion.t0 = await frontRows(desktop);
await desktop.screenshot({ path: path.join(output, "hero-1440-t0.png") });
await desktop.waitForTimeout(3000);
report.motion.t3 = await frontRows(desktop);
await desktop.screenshot({ path: path.join(output, "hero-1440-t3.png") });
await desktop.waitForTimeout(5000);
report.motion.t8 = await frontRows(desktop);
await desktop.screenshot({ path: path.join(output, "hero-1440-t8.png") });
await desktop.waitForTimeout(2000);
report.motion.shifts = report.motion.t0.map((row, index) => ({ row: row.row, at3: Number((report.motion.t3[index].x - row.x).toFixed(2)), at8: Number((report.motion.t8[index].x - row.x).toFixed(2)), direction: row.direction }));

const desktopCoverage = await desktop.evaluate(() => {
  const hero = document.querySelector(".hero");
  const layer = hero.querySelector(".glyph-backdrop");
  return { hero: hero.getBoundingClientRect().toJSON(), layer: layer.getBoundingClientRect().toJSON(), mask: getComputedStyle(layer).maskImage, rowCount: layer.querySelectorAll(".glyph-backdrop-row").length, firstRowLeft: layer.querySelector(".glyph-backdrop-row").getBoundingClientRect().left };
});
report.desktopCoverage = desktopCoverage;
await desktop.addStyleTag({ content: ".hero-copy,.hero-side-note,.hero-topline,.hero-bottomline,.hero-artwork,.hero-title { visibility:hidden!important }" });
const glyphOn = await desktop.screenshot();
await desktop.addStyleTag({ content: ".hero .glyph-backdrop{visibility:hidden!important}" });
const glyphOff = await desktop.screenshot();
const on = await sharp(glyphOn).raw().toBuffer({ resolveWithObject: true });
const off = await sharp(glyphOff).raw().toBuffer({ resolveWithObject: true });
report.leftCenterRightGlyphPixels = [0, 1, 2].map((part) => {
  const x0 = Math.floor(on.info.width * part / 3);
  const x1 = Math.floor(on.info.width * (part + 1) / 3);
  let changedPixels = 0;
  for (let y = 0; y < on.info.height; y++) for (let x = x0; x < x1; x++) {
    const offset = (y * on.info.width + x) * on.info.channels;
    if (Math.abs(on.data[offset] - off.data[offset]) + Math.abs(on.data[offset + 1] - off.data[offset + 1]) + Math.abs(on.data[offset + 2] - off.data[offset + 2]) > 1) changedPixels++;
  }
  return { region: [x0, x1], glyphChangedPixels: changedPixels };
});
await desktop.close();
await desktopContext.close();

// Express relative pixel luminance in 8-bit display levels, so the requested
// 6–14 level tone-on-tone target is directly readable.
const luminance = (data, offset) => .2126 * data[offset] + .7152 * data[offset + 1] + .0722 * data[offset + 2];

async function measureSection(page, name, selector, viewport) {
  const target = page.locator(selector).first();
  await target.evaluate((section) => section.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(450);
  const geometry = await target.evaluate((section) => {
    const layer = section.querySelector(".glyph-backdrop");
    layer?.querySelectorAll(".glyph-backdrop-track").forEach((track) => { track.style.animationPlayState = "paused"; });
    return { section: section.getBoundingClientRect().toJSON(), variant: layer?.dataset.variant ?? "missing", rows: layer?.querySelectorAll(".glyph-backdrop-row").length ?? 0 };
  });
  if (geometry.variant === "missing") return { name, viewport: viewport.width, error: "no GlyphBackdrop" };

  const hideContent = await page.addStyleTag({ content: `
    *,*::before,*::after { animation-play-state: paused !important; transition: none !important; }
    .site-header, nextjs-portal, #nextjs-portal { visibility: hidden !important; }
    ${selector} > :not(.glyph-backdrop):not(.closing-spotlight) { visibility: hidden !important; }
    ${selector} .glyph-backdrop, ${selector} .glyph-backdrop * { visibility: visible !important; }
  ` });
  await page.waitForTimeout(50);
  const withGlyph = await page.screenshot();
  await page.addStyleTag({ content: `${selector} .glyph-backdrop { visibility:hidden!important; }` });
  const withoutGlyph = await page.screenshot();
  const foreground = await sharp(withGlyph).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const background = await sharp(withoutGlyph).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const x0 = 0;
  const x1 = Math.floor(viewport.width / 2);
  const y0 = Math.max(0, Math.floor(geometry.section.top));
  const y1 = Math.min(viewport.height, Math.ceil(geometry.section.bottom));
  const delta = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const offset = (y * foreground.info.width + x) * foreground.info.channels;
    const rgbDelta = Math.abs(foreground.data[offset] - background.data[offset]) + Math.abs(foreground.data[offset + 1] - background.data[offset + 1]) + Math.abs(foreground.data[offset + 2] - background.data[offset + 2]);
    if (rgbDelta > 3) {
      const difference = luminance(foreground.data, offset) - luminance(background.data, offset);
      delta.push(Math.abs(difference));
    }
  }
  delta.sort((a, b) => a - b);
  const percentile = (value) => delta.length ? Number(delta[Math.floor((delta.length - 1) * value)].toFixed(2)) : null;
  await hideContent.evaluate((style) => style.remove());
  return { name, viewport: viewport.width, variant: geometry.variant, rows: geometry.rows, sampledGlyphPixels: delta.length, meanAbsoluteLuminanceDifferenceLevels: delta.length ? Number((delta.reduce((sum, value) => sum + value, 0) / delta.length).toFixed(2)) : null, p05Absolute: percentile(.05), p95Absolute: percentile(.95) };
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (error) => report.consoleErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  if (viewport.width === 390) {
    await page.screenshot({ path: path.join(output, "hero-390.png") });
    const before = await frontRows(page);
    await page.waitForTimeout(1600);
    const after = await frontRows(page);
    report.mobile = { visibleRows: await page.locator(".hero .glyph-backdrop-row").evaluateAll((rows) => rows.filter((row) => getComputedStyle(row).display !== "none").length), width: viewport.width, scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), shifts: before.map((row, index) => Number((after[index].x - row.x).toFixed(2))) };
  }
  const sectionDefs = [["hero", ".hero"], ["story", ".story-feature"], ["gallery", ".photo-section"], ["statement", ".statement-section"], ["closing", ".closing-section"]];
  for (const [name, selector] of sectionDefs) report.sections.push(await measureSection(page, name, selector, viewport));
  await page.close();
}

const debugPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await debugPage.goto(`${baseUrl}?glyphdebug=1`, { waitUntil: "domcontentloaded" });
await debugPage.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
await debugPage.evaluate(() => document.fonts.ready);
await debugPage.waitForTimeout(100);
await debugPage.screenshot({ path: path.join(output, "hero-glyphdebug-1440.png") });
report.debug = await debugPage.evaluate(() => {
  const root = document.querySelector(".hero .glyph-backdrop");
  const rows = [...root.querySelectorAll(".glyph-backdrop-row")];
  return { flag: new URLSearchParams(location.search).get("glyphdebug"), enabled: root.dataset.debug, rowCount: rows.length, root: root.getBoundingClientRect().toJSON(), rowBoxes: rows.map((row) => row.getBoundingClientRect().toJSON()), fill: getComputedStyle(rows[0]).color, stroke: getComputedStyle(rows[0].querySelector(".glyph-backdrop-track")).webkitTextStrokeWidth };
});
await debugPage.close();

const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const reduced = await reducedContext.newPage();
await reduced.goto(baseUrl, { waitUntil: "domcontentloaded" });
await reduced.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
const reducedBefore = await frontRows(reduced);
await reduced.waitForTimeout(1500);
const reducedAfter = await frontRows(reduced);
report.reducedMotionTest = { value: await reduced.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), maxShift: Math.max(...reducedBefore.map((row, index) => Math.abs(reducedAfter[index].x - row.x))) };
await reducedContext.close();

const offscreenPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await offscreenPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
await offscreenPage.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
await offscreenPage.evaluate(() => window.scrollTo(0, document.querySelector(".hero").clientHeight + 300));
await offscreenPage.waitForTimeout(400);
const offscreenBefore = await frontRows(offscreenPage);
await offscreenPage.waitForTimeout(1500);
const offscreenAfter = await frontRows(offscreenPage);
report.offscreenPauseMaxShift = Math.max(...offscreenBefore.map((row, index) => Math.abs(offscreenAfter[index].x - row.x)));
await offscreenPage.close();

await browser.close();
await writeFile(path.join(output, "verification-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));


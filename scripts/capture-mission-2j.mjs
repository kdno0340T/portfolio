import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PORTFOLIO_URL || "http://localhost:3004";
const phase = process.env.CAPTURE_PHASE || "before";
const output = path.join(".qa/mission-2j", phase);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { phase, baseUrl, sections: [], browserReducedMotion: null, diagnostics: null };

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".preloader").waitFor({ state: "detached", timeout: 20000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  report.browserReducedMotion ??= await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);

  if (phase === "before" && viewport.width === 1440) report.diagnostics = await page.evaluate(() => {
    const root = document.querySelector(".hero-glyphs");
    const glyph = root?.querySelector(".hero-glyph-copy");
    const ancestors = [];
    for (let node = root; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      ancestors.push({ className: typeof node.className === "string" ? node.className : node.tagName, overflow: style.overflow, clipPath: style.clipPath, maskImage: style.maskImage, opacity: style.opacity, zIndex: style.zIndex, mixBlendMode: style.mixBlendMode });
    }
    return { mask: root && getComputedStyle(root).maskImage, color: glyph && getComputedStyle(glyph).color, rowAlpha: glyph && getComputedStyle(glyph.parentElement.parentElement).color, glyphRect: glyph?.getBoundingClientRect().toJSON(), rootRect: root?.getBoundingClientRect().toJSON(), ancestors, movingRows: [...(root?.querySelectorAll(".hero-glyph-row") ?? [])].map((row) => ({ rect: row.getBoundingClientRect().toJSON(), transform: getComputedStyle(row.querySelector(".hero-glyph-track")).transform })) };
  });

  const selectors = [
    ["hero", ".hero"],
    ["story", ".story-feature"],
    ["gallery", ".photo-section"],
    ["statement", ".statement-section"],
    ["closing", ".closing-section"],
  ];
  for (const [name, selector] of selectors) {
    const section = page.locator(selector).first();
    if (!await section.count()) continue;
    await section.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(350);
    const file = `${name}-${viewport.width}.png`;
    await page.screenshot({ path: path.join(output, file) });
    report.sections.push({ name, viewport: viewport.width, file, box: await section.boundingBox() });
  }
  report[`errors${viewport.width}`] = errors;
  await page.close();
}
await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();

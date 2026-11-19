import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// Reconstruct only the hero's immediately preceding source/CSS for a clean
// mobile before frame, then restore the live files in a finally block.
const homePath = "src/components/home/HomePage.tsx";
const cssPath = "src/app/globals.css";
const homeCurrent = await readFile(homePath, "utf8");
const cssCurrent = await readFile(cssPath, "utf8");
await mkdir(".qa/mission-2e", { recursive: true });
let browser;

try {
  const oldLayer = '<div className="hero-glyphs" aria-hidden="true"><span className="glyph glyph-d" data-depth=".25">D</span><span className="glyph glyph-braces" data-depth=".7">&#123; &#125;</span><span className="glyph glyph-code" data-depth="1.05">&lt;/&gt;</span><span className="glyph glyph-number" data-depth=".5">01</span><span className="glyph glyph-route" data-depth=".35" /></div>';
  const oldHome = homeCurrent
    .replace('import { HeroGlyphLayer } from "@/components/home/HeroGlyphLayer";\n', "")
    .replace("<HeroGlyphLayer active={ready} />", oldLayer)
    .replace('<div className="hero-side-note hero-side-right"><p>Learning by making.<br />Building with curiosity.</p></div>', '<div className="hero-side-note hero-side-right"><span className="hero-monogram">{portfolio.name.slice(0, 1)}.</span><p>Learning by making.<br />Building with curiosity.</p></div>');
  const marker = "/* Mission 2E: slow, continuous, low-contrast hero glyph ribbons. */";
  const oldCss = cssCurrent.slice(0, cssCurrent.indexOf(marker)).replaceAll("cream-pebbled-leather.webp", "cream-leather-grain.webp");
  await writeFile(homePath, oldHome);
  await writeFile(cssPath, oldCss);

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => sessionStorage.setItem("portfolio-loaded", "true"));
  const page = await context.newPage();
  await page.goto("http://localhost:3001/?baseline=mission-2e", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".page-main")?.dataset.ready === "true", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: ".qa/mission-2e/before-390.png" });
  await context.close();
} finally {
  await browser?.close();
  await writeFile(homePath, homeCurrent);
  await writeFile(cssPath, cssCurrent);
}

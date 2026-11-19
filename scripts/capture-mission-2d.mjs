import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const phase = process.argv[2] || "before";
const base = process.env.PORTFOLIO_URL || "http://localhost:3001";
const output = `.qa/mission-2d/${phase}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { phase, captures: [], errors: [] };
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
desktop.on("pageerror", (error) => report.errors.push(error.message));
desktop.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
desktop.on("response", (response) => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
await desktop.goto(`${base}/${phase === "after" ? "?preload=1" : `?capture=${phase}`}`, { waitUntil: "domcontentloaded" });
await desktop.locator(".preloader").waitFor({ state: "visible", timeout: 10000 }).catch(() => undefined);
await desktop.waitForTimeout(120);
await desktop.screenshot({ path: `${output}/preloader-120ms.png` });
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: `${output}/preloader-620ms.png` });
await desktop.waitForTimeout(1170);
await desktop.screenshot({ path: `${output}/preloader-1800ms.png` });
await desktop.locator(".preloader[data-done='true']").waitFor({ state: "attached", timeout: 8000 }).catch(() => undefined);
await desktop.waitForTimeout(45);
await desktop.screenshot({ path: `${output}/preloader-mid-wipe.png` });
await desktop.locator(".preloader").waitFor({ state: "detached", timeout: 5000 }).catch(() => undefined);
await desktop.evaluate(() => document.fonts.ready);
await desktop.screenshot({ path: `${output}/hero-1440.png` });
for (const [name, selector] of [["work", ".signature-stage"], ["gallery", ".photo-section"], ["statement", ".statement-section"], ["cta", ".closing-section"]]) {
  const node = desktop.locator(selector);
  if (await node.count()) {
    await node.evaluate((element) => window.scrollTo(0, Math.max(0, element.getBoundingClientRect().top + window.scrollY - 88)));
    await desktop.waitForTimeout(1100);
    await desktop.screenshot({ path: `${output}/${name}-1440.png` });
    report.captures.push({ name, selector, y: await desktop.evaluate(() => Math.round(scrollY)) });
  }
}
report.computed = await desktop.evaluate(() => {
  const styleFor = (selector) => { const element = document.querySelector(selector); if (!element) return null; const style = getComputedStyle(element); return { color: style.color, background: style.backgroundColor, font: style.fontFamily, size: style.fontSize, spacing: style.letterSpacing, lineHeight: style.lineHeight }; };
  return { headerNameVisible: document.querySelector(".header-name")?.getAttribute("data-hero-visible"), statement: styleFor(".statement-section blockquote"), statementBackground: styleFor(".statement-section"), heroTitle: styleFor(".hero-title") };
});
await desktop.goto(`${base}/work`, { waitUntil: "domcontentloaded" });
await desktop.waitForTimeout(400);
await desktop.locator(".work-card").first().evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 106));
await desktop.waitForTimeout(650);
await desktop.screenshot({ path: `${output}/projects-1440.png` });
report.computed.projectPanels = await desktop.locator(".work-card").evaluateAll((nodes) => nodes.map((node) => { const box = node.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height }; }));

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
mobile.on("pageerror", (error) => report.errors.push(error.message));
mobile.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
mobile.on("response", (response) => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
await mobile.goto(`${base}/${phase === "after" ? "?preload=1" : `?mobile=${phase}`}`, { waitUntil: "domcontentloaded" });
await mobile.waitForTimeout(3000);
await mobile.evaluate(() => document.fonts.ready);
await mobile.screenshot({ path: `${output}/hero-390.png` });
for (const [name, selector] of [["work", ".signature-stage"], ["gallery", ".photo-section"], ["statement", ".statement-section"], ["cta", ".closing-section"]]) {
  const node = mobile.locator(selector);
  if (await node.count()) {
    await node.evaluate((element) => window.scrollTo(0, Math.max(0, element.getBoundingClientRect().top + window.scrollY - 60)));
    await mobile.waitForTimeout(350);
    await mobile.screenshot({ path: `${output}/${name}-390.png` });
  }
}
await mobile.goto(`${base}/work`, { waitUntil: "domcontentloaded" });
await mobile.waitForTimeout(350);
await mobile.locator(".work-card").first().evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 60));
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: `${output}/projects-390.png` });
report.mobileOverflow = await mobile.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (report.errors.length) process.exitCode = 1;

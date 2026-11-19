import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.argv[3] || "http://127.0.0.1:3101";
const round = process.argv[2] || "round-1";
const output = `.qa/mission-2b/${round}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const metricsLog = [];
const routes = ["/", "/work", "/personal", "/story", "/collaborations", "/journal", "/contact", "/about"];
const viewports = [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${viewport.name} pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${viewport.name} console: ${message.text()}`); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${viewport.name} HTTP ${response.status()}: ${response.url()}`); });

  for (const route of routes) {
    await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    const stem = `${viewport.name}-${route === "/" ? "home" : route.slice(1)}`;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${stem}-top.png` });
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 600; y < pageHeight; y += 600) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${output}/${stem}-full.png`, fullPage: true });

    if (route === "/") {
      const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const stops = Array.from(new Set([0, ...Array.from({ length: 41 }, (_, index) => index * 400), maxY].filter((y) => y <= maxY)));
      for (const y of stops) {
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${output}/${viewport.name}-home-y${String(y).padStart(5, "0")}.png` });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole("button", { name: /menu/i }).click();
      for (const delay of [0, 120, 280, 600, 1000]) {
        if (delay) await page.waitForTimeout(delay - (delay > 600 ? 600 : delay > 280 ? 280 : delay > 120 ? 120 : 0));
        await page.screenshot({ path: `${output}/${viewport.name}-menu-${delay}ms.png` });
      }
      await page.keyboard.press("Escape");
    }

    const state = await page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      overflow: Array.from(document.querySelectorAll("body *")).map((element) => ({ tag: element.tagName, className: String(element.className), right: Math.round(element.getBoundingClientRect().right) })).filter((element) => element.right > innerWidth + 1).slice(0, 8),
    }));
    if (state.documentWidth > state.width) errors.push(`${viewport.name} ${route}: horizontal overflow ${state.documentWidth}px > ${state.width}px`);
    metricsLog.push({ viewport: viewport.name, route, ...state });
  }
  await context.close();
}

await browser.close();
await writeFile(`${output}/verification.json`, JSON.stringify({ round, baseURL, metrics: metricsLog, errors }, null, 2));
console.log(JSON.stringify({ round, screenshots: output, routes: routes.length, viewports: viewports.map(({ name }) => name), errors }));
if (errors.length) process.exitCode = 1;

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const out = path.resolve("reference-capture/desktop-1440x900/home");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--headless=new", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const result = { route: "https://jjettas.com/", viewport: { width: 1440, height: 900 }, errors: [], frames: [] };
page.on("console", (message) => { if (message.type() === "error") result.errors.push(message.text()); });
page.on("pageerror", (error) => result.errors.push(error.stack || String(error)));
try {
  const response = await page.goto(result.route, { waitUntil: "domcontentloaded", timeout: 60000 });
  result.status = response?.status() ?? null;
  await page.waitForTimeout(16000);
  const menu = page.locator("header button[data-hamburger='true']").first();
  result.menuButton = await menu.evaluate((el) => ({ label: el.getAttribute("aria-label"), expanded: el.getAttribute("aria-expanded"), display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, rect: (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })() })).catch((error) => ({ error: error.message }));
  await menu.click({ force: true, timeout: 5000 });
  for (const delay of [0, 120, 280, 600, 1000]) {
    if (delay) await page.waitForTimeout(delay);
    const state = await page.evaluate(() => {
      const nav = document.querySelector("#site-navigation");
      const style = nav ? getComputedStyle(nav) : null;
      return {
        expanded: document.querySelector("header button[data-hamburger='true']")?.getAttribute("aria-expanded"),
        navClass: nav?.className ?? null,
        ariaHidden: nav?.getAttribute("aria-hidden") ?? null,
        navComputed: style ? { opacity: style.opacity, visibility: style.visibility, transform: style.transform, clipPath: style.clipPath, background: style.backgroundColor } : null,
        links: [...(nav?.querySelectorAll("a") ?? [])].slice(0, 8).map((a) => ({ text: a.textContent.trim(), opacity: getComputedStyle(a).opacity, transform: getComputedStyle(a).transform, clipPath: getComputedStyle(a).clipPath, inlineStyle: a.getAttribute("style") })),
      };
    });
    const file = `menu-${String(result.frames.length).padStart(2, "0")}-${delay}ms.png`;
    await page.screenshot({ path: path.join(out, file) });
    result.frames.push({ delay, file, ...state });
  }
} catch (error) {
  result.errors.push(error.stack || String(error));
} finally {
  await fs.writeFile(path.join(out, "menu-animation.json"), JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: result.status, button: result.menuButton, frames: result.frames.map(({ delay, file, expanded, navComputed }) => ({ delay, file, expanded, navComputed })), errors: result.errors.map((error) => error.split("\n")[0]) }, null, 2));

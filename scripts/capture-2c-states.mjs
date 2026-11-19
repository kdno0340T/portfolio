import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const output = ".qa/mission-2c/after-final";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

await page.locator(".signature-stage").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${output}/work-section.png` });
const work = await page.evaluate(() => [...document.querySelectorAll(".signature-card")].map((card) => {
  const r = card.getBoundingClientRect();
  const image = card.querySelector(".signature-art").getBoundingClientRect();
  const title = card.querySelector(".signature-card-title").getBoundingClientRect();
  const caption = card.querySelector(".signature-card-caption").getBoundingClientRect();
  return { title: card.querySelector(".signature-card-title").textContent, panel: [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)], image: [Math.round(image.top), Math.round(image.bottom)], heading: [Math.round(title.top), Math.round(title.bottom)], caption: [Math.round(caption.top), Math.round(caption.bottom)] };
}));

await page.locator(".photo-section").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${output}/gallery-cards.png` });
await page.mouse.move(660, 450);
await page.waitForTimeout(250);
await page.screenshot({ path: `${output}/gallery-cards-hover.png` });

await page.locator(".tech-section").scrollIntoViewIfNeeded();
await page.mouse.move(700, 450);
await page.waitForTimeout(700);
await page.screenshot({ path: `${output}/swarm-dark.png` });
const darkInk = await page.evaluate(() => {
  const canvas = document.querySelector(".swarm-cursor-canvas");
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(660, 410, 80, 80).data;
  let nonTransparent = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) nonTransparent += 1;
  return { section: document.elementFromPoint(700, 450)?.closest("[data-theme]")?.getAttribute("data-theme"), nonTransparentPixels: nonTransparent };
});

await page.locator(".story-feature").scrollIntoViewIfNeeded();
await page.mouse.move(701, 450);
await page.waitForTimeout(700);
await page.screenshot({ path: `${output}/swarm-cream.png` });
const creamInk = await page.evaluate(() => {
  const canvas = document.querySelector(".swarm-cursor-canvas");
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(661, 410, 80, 80).data;
  let nonTransparent = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) nonTransparent += 1;
  return { section: document.elementFromPoint(701, 450)?.closest("[data-theme]")?.getAttribute("data-theme"), nonTransparentPixels: nonTransparent };
});

await page.goto("http://localhost:3000/work", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${output}/work-route.png` });
const report = { errors, work, cursor: { dark: darkInk, cream: creamInk, reducedMotion: await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches) } };
await writeFile(`${output}/states.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await browser.close();
if (errors.length) process.exitCode = 1;

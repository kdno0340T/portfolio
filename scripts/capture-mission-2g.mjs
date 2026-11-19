import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.PORTFOLIO_URL || "http://localhost:3002";
const output = process.env.CAPTURE_OUTPUT || ".qa/mission-2g/before";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(new URL("/?preload=1", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".page-main")?.dataset.ready === "true", { timeout: 20000 });
  await page.locator(".preloader").waitFor({ state: "detached", timeout: 5000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  const bodyFont = await page.evaluate(() => ({ family: getComputedStyle(document.body).fontFamily, loaded: document.fonts.check('16px "Manrope Variable"') }));
  const sections = [
    ["hero", ".hero"],
    ["statement", ".statement-section"],
    ["work", ".signature-stage"],
  ];
  for (const [name, selector] of sections) {
    const section = page.locator(selector);
    await page.evaluate((targetSelector) => {
      const element = document.querySelector(targetSelector);
      if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top);
    }, selector);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${output}/${name}-${viewport.width}.png` });
    const metrics = await section.evaluate((element) => {
      const style = getComputedStyle(element);
      return { selector: element.className, rect: element.getBoundingClientRect().toJSON(), backgroundSize: style.backgroundSize, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage };
    });
    report.push({ section: name, viewport: viewport.width, bodyFont, ...metrics });
  }
  await context.close();
}
await writeFile(`${output}/metrics.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));

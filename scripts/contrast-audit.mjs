import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const baseUrl = process.env.PORTFOLIO_URL || "http://localhost:3002";
const output = process.env.CONTRAST_OUTPUT || ".qa/mission-2g/contrast";
const sectionFilter = process.env.AUDIT_SECTION || "";
const routes = sectionFilter ? ["/"] : ["/", "/work", "/about", "/contact", "/story", "/personal", "/collaborations", "/journal"];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
await mkdir(output, { recursive: true });

function linear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(data, offset) {
  return 0.2126 * linear(data[offset]) + 0.7152 * linear(data[offset + 1]) + 0.0722 * linear(data[offset + 2]);
}

function ratio(one, two) {
  const high = Math.max(one, two);
  const low = Math.min(one, two);
  return (high + 0.05) / (low + 0.05);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];
const summaries = [];

for (const route of routes) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await page.goto(new URL(route, baseUrl).href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.querySelector(".preloader") || document.querySelector(".page-main")?.dataset.ready === "true", { timeout: 20000 }).catch(() => undefined);
    await page.locator(".preloader").waitFor({ state: "detached", timeout: 5000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const worstByElement = new Map();
    const maximumScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    const step = Math.max(300, Math.floor(viewport.height * 0.68));
    const positions = sectionFilter
      ? [await page.evaluate((selector) => { const element = document.querySelector(selector); return element ? Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, window.scrollY + element.getBoundingClientRect().top)) : 0; }, sectionFilter)]
      : [...new Set(Array.from({ length: Math.ceil(maximumScroll / step) + 1 }, (_, index) => Math.min(maximumScroll, index * step)))];

    for (const scrollTop of positions) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollTop);
      await page.waitForTimeout(260);
      const texts = await page.evaluate((selector) => {
      const nodes = [...document.querySelectorAll("body *")];
      return nodes.flatMap((node, index) => {
        const element = node;
        const directText = [...element.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" ").replace(/\s+/g, " ").trim();
        if (!directText || element.closest("script,style,noscript") || element.closest("[aria-hidden='true'], .hero-title") || (selector && !element.closest(selector))) return [];
        const rect = element.getBoundingClientRect();
        const textRects = [...element.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim()).flatMap((child) => {
          const range = document.createRange();
          range.selectNode(child);
          return [...range.getClientRects()];
        }).map((line) => ({ x: line.x, y: line.y, width: line.width, height: line.height })).filter((line) => line.width > 0 && line.height > 0 && line.y < innerHeight && line.y + line.height > 0);
        const style = getComputedStyle(element);
        if (rect.width < 1 || rect.height < 1 || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return [];
        if (!textRects.length) return [];
        return [{ index, tag: element.tagName.toLowerCase(), className: typeof element.className === "string" ? element.className : "", text: directText.slice(0, 120), textRects, color: style.color, fontSize: parseFloat(style.fontSize), fontWeight: parseFloat(style.fontWeight) || 400, fontFamily: style.fontFamily, inHeader: Boolean(element.closest(".site-header")), routeTheme: element.closest("[data-theme]")?.getAttribute("data-theme") || "unknown" }];
      }).filter((item) => item.textRects.length);
      }, sectionFilter);

      const hideText = await page.addStyleTag({ content: "body * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } nextjs-portal, #nextjs-portal, .nextjs-portal { display: none !important; }" });
      const screenshot = await page.screenshot({ animations: "disabled" });
      await hideText.evaluate((node) => node.remove());
      const decoded = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const { data, info } = decoded;

      for (const text of texts) {
      const rgb = text.color.match(/[\d.]+/g)?.map(Number);
      if (!rgb || rgb.length < 3) continue;
      const foreground = rgb.slice(0, 3);
      const alpha = rgb.length > 3 ? rgb[3] : 1;
      if (alpha < 0.05) continue;
      const backgroundLuminances = [];
      let count = 0;
      for (const rect of text.textRects) {
       const x0 = Math.max(0, Math.floor(rect.x));
       const y0 = Math.max(0, Math.floor(rect.y));
       const x1 = Math.min(info.width, Math.ceil(rect.x + rect.width));
       const y1 = Math.min(info.height, Math.ceil(rect.y + rect.height));
       for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const offset = (y * info.width + x) * info.channels;
          // Page content may scroll under the fixed header. Those pixels are
          // occluded by the header and must not be attributed to the page text.
          const headerHeight = viewport.width <= 700 ? 67 : 88;
          if (!text.inHeader && y < headerHeight) continue;
          backgroundLuminances.push(luminance(data, offset));
          count += 1;
        }
       }
      }
      if (!count) continue;
      backgroundLuminances.sort((a, b) => a - b);
      const percentile = (value) => backgroundLuminances[Math.min(backgroundLuminances.length - 1, Math.floor((backgroundLuminances.length - 1) * value))];
      const q05 = percentile(.05);
      const q95 = percentile(.95);
      const foregroundLuminance = 0.2126 * linear(foreground[0]) + 0.7152 * linear(foreground[1]) + 0.0722 * linear(foreground[2]);
      const worstContrast = Math.min(ratio(foregroundLuminance, q05), ratio(foregroundLuminance, q95));
      const threshold = text.fontSize >= 24 ? 3 : 4.5;
      const contrast = worstContrast;
      const existing = worstByElement.get(text.index);
      if (!existing || contrast < existing.contrast) worstByElement.set(text.index, { route, viewport: viewport.width, ...text, contrast, threshold, sampledPixels: count, backgroundLuminance: [q05, q95], sampledAtScroll: scrollTop });
      }
    }

    const currentFailures = [...worstByElement.values()].filter((item) => item.contrast < item.threshold).map((item) => ({ ...item, contrast: Number(item.contrast.toFixed(2)), backgroundLuminance: item.backgroundLuminance.map((value) => Number(value.toFixed(4))) }));
    failures.push(...currentFailures);
    summaries.push({ route, viewport: viewport.width, elements: worstByElement.size, scrollScreens: positions.length, failures: currentFailures.length });
    await page.close();
  }
}

const report = { generatedAt: new Date().toISOString(), baseUrl, routes, viewports, failedElements: failures.length, failures, summaries };
await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;

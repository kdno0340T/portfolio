import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1400);
for (const y of [0, 200, 400, 600, 800, 1000, 1200, 1400]) {
  if (y) await page.mouse.wheel(0, 200);
  await page.waitForTimeout(850);
  if ([800, 1000, 1200, 1400].includes(y)) await page.screenshot({ path: `.qa/mission-2c/debug-${y}.png` });
  const state = await page.evaluate(() => ({
    y: Math.round(scrollY), lenis: document.documentElement.className,
    stage: (() => { const e = document.querySelector(".signature-stage"); if (!e) return null; const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {rect:{top:r.top,bottom:r.bottom,height:r.height},opacity:s.opacity,display:s.display,visibility:s.visibility,position:s.position,z:s.zIndex,transform:s.transform,html:e.innerText.slice(0,100)}; })(),
    children: [...document.querySelectorAll(".signature-stage .section-topline,.signature-title,.signature-track,.signature-card")].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {class:e.className,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),opacity:s.opacity,display:s.display,transform:s.transform,text:e.textContent.trim().slice(0,22)}}),
    spacers:[...document.querySelectorAll(".pin-spacer")].map(e=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),height:Math.round(r.height),class:e.className}}),
  }));
  console.log(JSON.stringify(state));
}
await browser.close();

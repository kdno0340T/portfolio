import sharp from "sharp";

const source = "public/images/profile/hero-cutout.webp";
const crop = { left: 213, top: 16, width: 800, height: 1000 };
const cutout = await sharp(source).extract(crop).png().toBuffer();
const backgrounds = [
  ["cream", { r: 239, g: 230, b: 216 }],
  ["purple", { r: 23, g: 18, b: 32 }],
];
for (const [name, color] of backgrounds) {
  await sharp({ create: { width: crop.width, height: crop.height, channels: 3, background: color } })
    .composite([{ input: cutout }]).png().toFile(`.tmp-assets/cutout-${name}.png`);
}
const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let alphaBins = { zero: 0, low: 0, mid: 0, high: 0 };
for (let i = 3; i < data.length; i += info.channels) {
  const a = data[i];
  if (a === 0) alphaBins.zero++;
  else if (a < 64) alphaBins.low++;
  else if (a < 220) alphaBins.mid++;
  else alphaBins.high++;
}
console.log(JSON.stringify({ width: info.width, height: info.height, alphaBins }, null, 2));

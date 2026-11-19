import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicRoot = path.resolve("public/images");
const generated = "C:/Users/bhand/.codex/generated_images/01a1b6fb-21ea-7522-ad39-aadd9912486f";
const temp = path.resolve(".tmp-assets");
await fs.mkdir(path.join(publicRoot, "profile"), { recursive: true });
await fs.mkdir(path.join(publicRoot, "projects"), { recursive: true });
await fs.mkdir(path.join(publicRoot, "textures"), { recursive: true });
await fs.mkdir(path.join(publicRoot, "previews"), { recursive: true });
await fs.mkdir(temp, { recursive: true });

const report = [];
async function writeWebp(file, pipeline, quality = 86) {
  const dest = path.join(publicRoot, file);
  await pipeline.webp({ quality, effort: 6, alphaQuality: 95 }).toFile(dest);
  const meta = await sharp(dest).metadata();
  const stat = await fs.stat(dest);
  report.push({ file, width: meta.width, height: meta.height, bytes: stat.size });
  return dest;
}
async function writeJpeg(file, pipeline) {
  const dest = path.join(publicRoot, file);
  await pipeline.jpeg({ quality: 88, mozjpeg: true }).toFile(dest);
  const meta = await sharp(dest).metadata();
  const stat = await fs.stat(dest);
  report.push({ file, width: meta.width, height: meta.height, bytes: stat.size });
  return dest;
}

// Chest-up 4:5 crop from the existing real-photo edit on the cream background.
const chestCrop = { left: 330, top: 145, width: 780, height: 975 };
const chest = sharp(path.join(publicRoot, "profile/hero@2x.webp")).extract(chestCrop);
await writeWebp("profile/hero-chest-up.webp", chest.clone().resize(780, 975), 88);
await writeWebp("profile/hero-chest-up@2x.webp", chest.clone().resize(960, 1200), 88);
await writeJpeg("profile/hero-chest-up.jpg", chest.clone().resize(960, 1200));
await writeWebp("profile/hero-mobile-4x5.webp", chest.clone().resize(800, 1000), 87);

// Match the cutout to the chest-up 4:5 presentation and leave transparent margin above the hair.
const cutCrop = await sharp(path.join(publicRoot, "profile/hero-cutout.webp"))
  .extract({ left: 180, top: 0, width: 840, height: 1050 })
  .resize(756, 945)
  .png()
  .toBuffer();
const cutCanvas = await sharp({ create: { width: 840, height: 1050, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: cutCrop, left: 42, top: 54 }])
  .png()
  .toBuffer();
await writeWebp("profile/hero-chest-up-cutout.webp", sharp(cutCanvas), 92);

// Dual-background previews for edge/halo review.
for (const [name, background] of [["cream", { r: 239, g: 230, b: 216 }], ["dark-purple", { r: 23, g: 18, b: 32 }]]) {
  const file = `previews/hero-cutout-over-${name}.jpg`;
  await sharp({ create: { width: 840, height: 1050, channels: 3, background } })
    .composite([{ input: cutCanvas }])
    .jpeg({ quality: 91, mozjpeg: true })
    .toFile(path.join(publicRoot, file));
  const meta = await sharp(path.join(publicRoot, file)).metadata();
  const stat = await fs.stat(path.join(publicRoot, file));
  report.push({ file, width: meta.width, height: meta.height, bytes: stat.size });
}

// Replacement ResQGrid and ECHOES covers, retaining the EnRoute visual system.
for (const [name, source] of [
  ["resqgrid", `${generated}/exec-35eb1778-4033-4bec-9416-f14813f0e459.png`],
  ["echoes", `${generated}/exec-be3cec0a-a1a3-4c0c-aec7-36ee67720ea4.png`],
]) {
  const img = sharp(source).rotate();
  await writeWebp(`projects/${name}.webp`, img.clone().resize(600, 750, { fit: "cover", position: "attention" }), 86);
  await writeWebp(`projects/${name}@2x.webp`, img.clone().resize(1200, 1500, { fit: "cover", position: "attention" }), 86);
}

const abstractStudy = sharp(`${generated}/exec-9746a75e-20d7-4397-93f6-0b3ed9714ae5.png`).rotate();
await writeWebp("personal/generated-abstract-study.webp", abstractStudy.clone().resize(480, 600, { fit: "cover", position: "attention" }), 82);
await writeWebp("personal/generated-abstract-study@2x.webp", abstractStudy.clone().resize(960, 1200, { fit: "cover", position: "attention" }), 82);

// Keep the existing vignette texture. Export a separate flat tile with matched opposing edges.
const flatSource = `${generated}/exec-583e5670-e7a8-4060-a6a4-960c2caa9c74.png`;
const { data, info } = await sharp(flatSource).resize(1024, 1024, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const blend = (a, b, t) => Math.round(a * (1 - t) + ((a + b) / 2) * t);
const radius = 32;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < radius; x++) {
    const xr = info.width - 1 - x;
    const t = 1 - x / (radius - 1);
    for (let c = 0; c < info.channels; c++) {
      const li = (y * info.width + x) * info.channels + c;
      const ri = (y * info.width + xr) * info.channels + c;
      const l = data[li], r = data[ri];
      data[li] = blend(l, r, t);
      data[ri] = blend(r, l, t);
    }
  }
}
for (let x = 0; x < info.width; x++) {
  for (let y = 0; y < radius; y++) {
    const yb = info.height - 1 - y;
    const t = 1 - y / (radius - 1);
    for (let c = 0; c < info.channels; c++) {
      const ti = (y * info.width + x) * info.channels + c;
      const bi = (yb * info.width + x) * info.channels + c;
      const top = data[ti], bottom = data[bi];
      data[ti] = blend(top, bottom, t);
      data[bi] = blend(bottom, top, t);
    }
  }
}
const flatPath = path.join(publicRoot, "textures/dark-purple-flat-seamless.webp");
await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .webp({ quality: 95, effort: 6 })
  .toFile(flatPath);
const flatMeta = await sharp(flatPath).metadata();
const flatStat = await fs.stat(flatPath);
report.push({ file: "textures/dark-purple-flat-seamless.webp", width: flatMeta.width, height: flatMeta.height, bytes: flatStat.size });

// Analyze edge continuity and basic row-average variation (banding indicator) in the exported tiles.
async function textureStats(file) {
  const { data: pixels, info: m } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let edgeTotal = 0, edgeCount = 0, rowMeans = [];
  for (let y = 0; y < m.height; y++) {
    let sum = 0;
    for (let x = 0; x < m.width; x++) {
      const i = (y * m.width + x) * m.channels;
      const lum = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      sum += lum;
      if (x === 0 || x === m.width - 1) {
        const other = (y * m.width + (x === 0 ? m.width - 1 : 0)) * m.channels;
        edgeTotal += Math.abs(lum - (0.2126 * pixels[other] + 0.7152 * pixels[other + 1] + 0.0722 * pixels[other + 2]));
        edgeCount++;
      }
    }
    rowMeans.push(sum / m.width);
  }
  const adjacentRows = rowMeans.slice(1).map((v, i) => Math.abs(v - rowMeans[i]));
  return { width: m.width, height: m.height, meanOpposingEdgeDelta: edgeTotal / edgeCount, maxAdjacentRowMeanDelta: Math.max(...adjacentRows) };
}
const flatStats = await textureStats(flatPath);
const vignetteStats = await textureStats(path.join(publicRoot, "textures/dark-purple-gradient-noise.webp"));

// Rebuild active manifest and a contact sheet. The unused near-duplicate outdoor derivative is omitted.
const files = [
  "profile/hero-chest-up.webp", "profile/hero-chest-up@2x.webp", "profile/hero-chest-up.jpg", "profile/hero-mobile-4x5.webp", "profile/hero-chest-up-cutout.webp",
  "profile/hero.webp", "profile/hero@2x.webp", "profile/hero-cutout.webp",
  "personal/outdoor-portrait.webp", "personal/outdoor-portrait@2x.webp", "personal/night-portrait.webp", "personal/night-portrait@2x.webp",
  "personal/generated-workspace.webp", "personal/generated-workspace@2x.webp", "personal/generated-sketchbook.webp", "personal/generated-sketchbook@2x.webp",
  "personal/generated-desk-details.webp", "personal/generated-desk-details@2x.webp", "personal/generated-abstract-study.webp", "personal/generated-abstract-study@2x.webp",
  "projects/enroute.webp", "projects/enroute@2x.webp", "projects/resqgrid.webp", "projects/resqgrid@2x.webp", "projects/echoes.webp", "projects/echoes@2x.webp",
  "textures/cream-paper-grain.webp", "textures/dark-purple-gradient-noise.webp", "textures/dark-purple-flat-seamless.webp",
  "previews/hero-cutout-over-cream.jpg", "previews/hero-cutout-over-dark-purple.jpg",
];
const manifest = [];
for (const file of files) {
  const full = path.join(publicRoot, file);
  const meta = await sharp(full).metadata();
  const stat = await fs.stat(full);
  manifest.push({ file, width: meta.width, height: meta.height, bytes: stat.size });
}
const columns = 5, tileW = 400, tileH = 290, thumbH = 238;
const rows = Math.ceil(manifest.length / columns), comps = [];
for (let i = 0; i < manifest.length; i++) {
  const item = manifest[i];
  const thumb = await sharp(path.join(publicRoot, item.file)).resize(tileW - 20, thumbH - 12, { fit: "contain", background: "#19151f" }).png().toBuffer();
  const safe = item.file.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const label = `${safe} · ${item.width}×${item.height} · ${Math.round(item.bytes / 1024)} KB`;
  const svg = Buffer.from(`<svg width="${tileW}" height="${tileH - thumbH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0f0d13"/><text x="10" y="20" fill="#f4eee5" font-family="Arial,sans-serif" font-size="12">${label}</text></svg>`);
  const x = (i % columns) * tileW, y = Math.floor(i / columns) * tileH;
  comps.push({ input: thumb, left: x + 10, top: y + 6 }, { input: svg, left: x, top: y + thumbH });
}
await sharp({ create: { width: columns * tileW, height: rows * tileH, channels: 3, background: "#19151f" } })
  .composite(comps).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(publicRoot, "asset-contact-sheet.jpg"));
await fs.writeFile(path.join(publicRoot, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ outputs: report, textureChecks: { flat: flatStats, vignette: vignetteStats }, manifestCount: manifest.length }, null, 2));

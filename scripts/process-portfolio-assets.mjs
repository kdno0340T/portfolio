import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const output = path.resolve("public/images");
const generated = "C:/Users/bhand/.codex/generated_images/01a1b6fb-21ea-7522-ad39-aadd9912486f";
const inputs = {
  hero: `${generated}/exec-118f2c08-4fd9-4ddb-a8c8-10240918563f.png`,
  cutout: `${generated}/exec-33fbc3b8-c7f9-4a5a-9265-87d40c1ead9f.png`,
  personal1: `${generated}/exec-762dac57-2286-4b2e-9f4b-ebd82d7ea8f4.png`,
  personal2: `${generated}/exec-541a2842-9066-4db8-876d-a0d3cbb5361c.png`,
  personal3: `${generated}/exec-ed35eb39-a77c-4bf2-accf-5b53e376fc43.png`,
  filler1: `${generated}/exec-76b3e08c-a8b9-4837-9924-e664e60844c1.png`,
  filler2: `${generated}/exec-e64449be-a5b4-479d-a563-e418a99f1ffe.png`,
  filler3: `${generated}/exec-83684bfd-109e-4ff6-aa9d-b846f7a137c1.png`,
  enroute: `${generated}/exec-72ff95d2-65e2-4731-94e3-d105d708cdc7.png`,
  resqgrid: `${generated}/exec-e249dc67-ef06-4d4a-9646-2fbdf67d214d.png`,
  echoes: `${generated}/exec-5517c83b-ebae-44df-b70b-9e25e0dbf772.png`,
  paper: `${generated}/exec-63092ec6-b39d-4ec7-bc89-5ce08ab76157.png`,
  dark: `${generated}/exec-ddace6c4-925a-4ed8-bbc1-fab239b147b9.png`,
};

for (const dir of ["profile", "personal", "projects", "textures"]) {
  await fs.mkdir(path.join(output, dir), { recursive: true });
}
for (const [key, file] of Object.entries(inputs)) {
  await fs.access(file).catch(() => { throw new Error(`Missing generated source for ${key}: ${file}`); });
}

const outputs = [];
async function save(name, pipeline, format = "webp") {
  const target = path.join(output, name);
  if (format === "jpg") await pipeline.jpeg({ quality: 86, mozjpeg: true }).toFile(target);
  else await pipeline.webp({ quality: 82, effort: 6, ...(name.includes("cutout") ? { alphaQuality: 90 } : {}) }).toFile(target);
  const meta = await sharp(target).metadata();
  const stat = await fs.stat(target);
  outputs.push({ file: name, width: meta.width, height: meta.height, bytes: stat.size, format });
}

const hero = sharp(inputs.hero).rotate();
await save("profile/hero.webp", hero.clone().resize({ width: 900, withoutEnlargement: true }));
await save("profile/hero@2x.webp", hero.clone().resize({ width: 1440 }));
await save("profile/hero.jpg", hero.clone().resize({ width: 1440 }), "jpg");
await save("profile/hero-mobile-4x5.webp", hero.clone().resize(800, 1000, { fit: "cover", position: "attention" }));
await save("profile/hero-cutout.webp", sharp(inputs.cutout).rotate().resize({ width: 1200 }));

const personal = [
  ["outdoor-portrait-wide", inputs.personal1],
  ["outdoor-portrait", inputs.personal2],
  ["night-portrait", inputs.personal3],
  ["generated-workspace", inputs.filler1],
  ["generated-sketchbook", inputs.filler2],
  ["generated-desk-details", inputs.filler3],
];
for (const [name, file] of personal) {
  const img = sharp(file).rotate();
  await save(`personal/${name}.webp`, img.clone().resize(480, 600, { fit: "cover", position: "attention" }));
  await save(`personal/${name}@2x.webp`, img.clone().resize(960, 1200, { fit: "cover", position: "attention" }));
}

for (const [name, file] of [["enroute", inputs.enroute], ["resqgrid", inputs.resqgrid], ["echoes", inputs.echoes]]) {
  const img = sharp(file).rotate();
  await save(`projects/${name}.webp`, img.clone().resize(600, 750, { fit: "cover", position: "attention" }));
  await save(`projects/${name}@2x.webp`, img.clone().resize(1200, 1500, { fit: "cover", position: "attention" }));
}
await save("textures/cream-paper-grain.webp", sharp(inputs.paper).resize(512, 512, { fit: "cover" }));
await save("textures/dark-purple-gradient-noise.webp", sharp(inputs.dark).resize(1200, 1200, { fit: "cover" }));

// Contact sheet: one labeled tile for every exported file.
const columns = 5;
const tileW = 400;
const tileH = 290;
const thumbH = 238;
const rows = Math.ceil(outputs.length / columns);
const composites = [];
for (let i = 0; i < outputs.length; i++) {
  const item = outputs[i];
  const imagePath = path.join(output, item.file);
  const thumb = await sharp(imagePath).resize(tileW - 20, thumbH - 12, { fit: "contain", background: "#19151f" }).png().toBuffer();
  const label = `${item.file}  •  ${item.width}×${item.height}  •  ${Math.round(item.bytes / 1024)} KB`;
  const svg = Buffer.from(`<svg width="${tileW}" height="${tileH - thumbH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0f0d13"/><text x="12" y="20" fill="#f4eee5" font-family="Arial,sans-serif" font-size="12">${label.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text></svg>`);
  const x = (i % columns) * tileW;
  const y = Math.floor(i / columns) * tileH;
  composites.push({ input: thumb, left: x + 10, top: y + 6 });
  composites.push({ input: svg, left: x, top: y + thumbH });
}
const sheet = sharp({ create: { width: columns * tileW, height: rows * tileH, channels: 3, background: "#19151f" } });
await sheet.composite(composites).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(output, "asset-contact-sheet.jpg"));
await fs.writeFile(path.join(output, "asset-manifest.json"), JSON.stringify(outputs, null, 2));
console.log(JSON.stringify(outputs, null, 2));

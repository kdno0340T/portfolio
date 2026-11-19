import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const size = 512;
const cell = 12;
const cells = Math.ceil(size / cell);
let seed = 281119;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const centers = Array.from({ length: cells * cells }, (_, index) => {
  const gx = index % cells;
  const gy = Math.floor(index / cells);
  return { x: (gx * cell + cell / 2 + (random() - .5) * 3.8 + size) % size, y: (gy * cell + cell / 2 + (random() - .5) * 3.8 + size) % size };
});
const cream = Buffer.alloc(size * size * 3);
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  let nearest = Infinity, second = Infinity;
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    const ix = (gx + ox + cells) % cells, iy = (gy + oy + cells) % cells;
    const point = centers[iy * cells + ix];
    const dx0 = Math.abs(x - point.x), dy0 = Math.abs(y - point.y);
    const dx = Math.min(dx0, size - dx0), dy = Math.min(dy0, size - dy0);
    const d = Math.hypot(dx, dy);
    if (d < nearest) { second = nearest; nearest = d; } else if (d < second) second = d;
  }
  const edge = smooth(.1, 3.3, second - nearest);
  const radius = smooth(2.2, 6.5, nearest);
  const grain = Math.sin((x * 17 + y * 29) * Math.PI * 2 / size) * .42 + Math.sin((x * 61 - y * 11) * Math.PI * 2 / size) * .32;
  const light = (edge - .55) * 8.5 + (radius - .5) * 1.6 + grain;
  const at = (y * size + x) * 3;
  cream[at] = Math.max(0, Math.min(255, 239 + light));
  cream[at + 1] = Math.max(0, Math.min(255, 230 + light));
  cream[at + 2] = Math.max(0, Math.min(255, 216 + light));
}
const dark = Buffer.alloc(size * size * 3);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const grain = Math.sin((x * 31 + y * 19) * Math.PI * 2 / size) * 1.1 + Math.sin((x * 67 - y * 23) * Math.PI * 2 / size) * .65 + Math.sin((x * 131 + y * 79) * Math.PI * 2 / size) * .25;
  const at = (y * size + x) * 3;
  dark[at] = 13 + grain; dark[at + 1] = 11 + grain; dark[at + 2] = 18 + grain;
}
await mkdir("public/images/textures", { recursive: true });
await sharp(cream, { raw: { width: size, height: size, channels: 3 } }).webp({ quality: 86, effort: 6 }).toFile("public/images/textures/cream-leather-grain.webp");
await sharp(dark, { raw: { width: size, height: size, channels: 3 } }).webp({ quality: 82, effort: 6 }).toFile("public/images/textures/dark-fine-grain.webp");
await mkdir(".qa/mission-2d", { recursive: true });
for (const [name, file] of [["cream", "public/images/textures/cream-leather-grain.webp"], ["dark", "public/images/textures/dark-fine-grain.webp"]]) {
  const tile = await sharp(file).png().toBuffer();
  await sharp({ create: { width: size * 2, height: size * 2, channels: 3, background: name === "cream" ? "#efe6d8" : "#0d0b12" } }).composite([
    { input: tile, left: 0, top: 0 }, { input: tile, left: size, top: 0 }, { input: tile, left: 0, top: size }, { input: tile, left: size, top: size },
  ]).png().toFile(`.qa/mission-2d/texture-tiling-${name}.png`);
}
console.log("Generated seamless 512x512 cream leather and dark grain tiles.");

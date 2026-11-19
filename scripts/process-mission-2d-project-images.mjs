import sharp from "sharp";

const jobs = [
  ["C:/Users/bhand/Downloads/ResQGrid EV Charging Dashboard.png", "public/images/projects/resqgrid-dashboard.webp"],
  ["C:/Users/bhand/Downloads/Echoes of Rivermist Cottage.png", "public/images/projects/echoes-rivermist.webp"],
];
for (const [source, destination] of jobs) {
  await sharp(source).rotate().resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(destination);
  const { size, width, height } = await sharp(destination).metadata();
  console.log(`${destination}: ${width}x${height}, ${size} bytes`);
}

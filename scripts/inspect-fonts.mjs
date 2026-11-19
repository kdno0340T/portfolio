import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

for (const file of await readdir("public/fonts")) {
  if (!file.endsWith(".ttf")) continue;
  const data = await readFile(path.join("public/fonts", file));
  const tables = data.readUInt16BE(4);
  for (let index = 0; index < tables; index += 1) {
    const record = 12 + index * 16;
    if (data.toString("ascii", record, record + 4) !== "name") continue;
    const offset = data.readUInt32BE(record + 8);
    const count = data.readUInt16BE(offset + 2);
    const strings = data.readUInt16BE(offset + 4);
    const values = new Map();
    for (let nameIndex = 0; nameIndex < count; nameIndex += 1) {
      const item = offset + 6 + nameIndex * 12;
      const platform = data.readUInt16BE(item);
      const id = data.readUInt16BE(item + 6);
      if (![1, 2, 4, 6, 16, 17].includes(id) || values.has(id)) continue;
      const length = data.readUInt16BE(item + 8);
      const position = offset + strings + data.readUInt16BE(item + 10);
      const raw = data.subarray(position, position + length);
      if (platform === 0 || platform === 3) {
        const littleEndian = Buffer.from(raw);
        for (let byte = 0; byte < littleEndian.length; byte += 2) {
          [littleEndian[byte], littleEndian[byte + 1]] = [littleEndian[byte + 1], littleEndian[byte]];
        }
        values.set(id, littleEndian.toString("utf16le"));
      } else values.set(id, raw.toString("latin1"));
    }
    console.log(file, Object.fromEntries(values));
  }
}

// src/app/icon.svg dosyasindan cok boyutlu electron/icon.ico uretir.
// Calistirma: npm run electron:icon
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const svg = readFileSync(new URL('../src/app/icon.svg', import.meta.url));

const images = await Promise.all(
  SIZES.map((size) => sharp(svg, { density: 2400 }).resize(size, size).png().toBuffer()),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // tur: simge
header.writeUInt16LE(images.length, 4);

let offset = header.length + images.length * 16;
const entries = images.map((png, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(SIZES[i] % 256, 0); // 256 piksel, ICO bicaminde 0 ile gosterilir
  entry.writeUInt8(SIZES[i] % 256, 1);
  entry.writeUInt16LE(1, 4); // renk duzlemi
  entry.writeUInt16LE(32, 6); // piksel basina bit
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += png.length;
  return entry;
});

writeFileSync(new URL('../electron/icon.ico', import.meta.url), Buffer.concat([header, ...entries, ...images]));

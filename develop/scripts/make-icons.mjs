// Generates extension-src/icons/icon{16,32,48,128}.png (shield + exclamation mark) with no dependencies.
// Usage: npm run icons
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../../extension-src/icons/', import.meta.url));
const SHIELD = [0x4f, 0x5b, 0x93]; // PHP-like indigo
const MARK = [0xff, 0xff, 0xff];

/** Shield outline in unit coordinates (0..1). */
function inShield(x, y) {
  const top = 0.06, mid = 0.45, bottom = 0.96, half = 0.4;
  const dx = Math.abs(x - 0.5);
  if (y < top || y > bottom) return false;
  if (y <= mid) return dx <= half;
  const t = (y - mid) / (bottom - mid); // 0..1 towards the point
  return dx <= half * Math.pow(1 - t, 0.75);
}

function inMark(x, y) {
  const bar = Math.abs(x - 0.5) <= 0.065 && y >= 0.2 && y <= 0.55;
  const dot = (x - 0.5) ** 2 + (y - 0.69) ** 2 <= 0.075 ** 2;
  return bar || dot;
}

function render(size) {
  // Chrome Web Store recommends 96x96 artwork inside a 128x128 canvas.
  const pad = size >= 128 ? 16 / 128 : size >= 48 ? 3 / 48 : 0;
  const ss = 4; // supersampling
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let shield = 0, mark = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = ((pxl + (sx + 0.5) / ss) / size - pad) / (1 - 2 * pad);
          const v = ((py + (sy + 0.5) / ss) / size - pad) / (1 - 2 * pad);
          if (inShield(u, v)) {
            shield++;
            if (inMark(u, v)) mark++;
          }
        }
      }
      const n = ss * ss;
      const a = shield / n;
      const m = shield ? mark / shield : 0;
      const i = (py * size + pxl) * 4;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(SHIELD[c] * (1 - m) + MARK[c] * m);
      px[i + 3] = Math.round(a * 255);
    }
  }
  return png(size, px);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(`${OUT}icon${size}.png`, render(size));
  console.log(`icon${size}.png`);
}

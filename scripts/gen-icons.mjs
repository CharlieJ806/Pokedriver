// 生成游戏图标 PNG(与 app/icon.svg 同款设计:藏青外圈精灵球 + 浅蓝渐变背景,不透明):
//   app/apple-icon.png  (180x180, iOS apple-touch-icon)
//   public/icon-192.png (192x192, PWA manifest)
//   public/icon-512.png (512x512, PWA manifest)
// 用法: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [
  { size: 180, out: join(ROOT, "app", "apple-icon.png") },
  { size: 192, out: join(ROOT, "public", "icon-192.png") },
  { size: 512, out: join(ROOT, "public", "icon-512.png") },
];

/* ---------- CRC32 ---------- */
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/* ---------- 绘制(64x64 坐标,与 app/icon.svg 一致) ---------- */
const lerp = (a, b, t) => a + (b - a) * t;

function sample(x, y) {
  // 背景:整块浅蓝渐变(#e8f4ff → #cde9fa)
  const bt = y / 64;
  const bg = [lerp(232, 205, bt), lerp(244, 233, bt), lerp(255, 250, bt)];
  const dx = x - 32, dy = y - 32;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 30) return [bg[0], bg[1], bg[2], 255];
  if (d > 28) return [23, 49, 79, 255]; // 外圈(藏青 #17314f)
  if (d <= 10.5) { // 中央按钮
    if (d <= 3.5) return [0, 180, 216, 255]; // 青色圆点
    if (d <= 7.5) return [255, 255, 255, 255]; // 白色按钮面
    return [23, 49, 79, 255]; // 按钮描边
  }
  if (y >= 29 && y <= 35) return [23, 49, 79, 255]; // 中带
  if (y < 29) { // 上半:青渐变(#4df7ff → #00b4d8)
    const t = (y - 4) / 28;
    return [lerp(77, 0, t), lerp(247, 180, t), lerp(255, 216, t), 255];
  }
  return [255, 255, 255, 255]; // 下半(白)
}

/* ---------- 栅格化 + PNG 编码 ---------- */
function renderPng(size) {
  const SS = 4; // 每像素 4x4 超采样抗锯齿
  const pixels = Buffer.alloc(size * size * 4);
  for (let iy = 0; iy < size; iy++) {
    for (let ix = 0; ix < size; ix++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((ix + (sx + 0.5) / SS) / size) * 64;
          const y = ((iy + (sy + 0.5) / SS) / size) * 64;
          const c = sample(x, y);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const o = (iy * size + ix) * 4;
      pixels[o] = Math.round(r / n);
      pixels[o + 1] = Math.round(g / n);
      pixels[o + 2] = Math.round(b / n);
      pixels[o + 3] = Math.round(a / n);
    }
  }

  const stride = size * 4;
  const raw = Buffer.alloc(size * (1 + stride));
  for (let iy = 0; iy < size; iy++) {
    raw[iy * (1 + stride)] = 0; // 行过滤:None
    pixels.copy(raw, iy * (1 + stride) + 1, iy * stride, (iy + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const t of TARGETS) {
  writeFileSync(t.out, renderPng(t.size));
  console.log("OK:", t.out, `${t.size}x${t.size}`);
}

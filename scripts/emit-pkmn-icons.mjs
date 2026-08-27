/**
 * 把 data/pokemon-icons.json(内嵌 base64 PNG)展开为 public/icons/<id>.png。
 * 图标不再打进 JS 主包,ICON(id) 直接返回静态资源 URL。
 * 运行: node scripts/emit-pkmn-icons.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "pokemon-icons.json");
const OUT_DIR = join(ROOT, "public", "icons");

mkdirSync(OUT_DIR, { recursive: true });

const icons = JSON.parse(readFileSync(SRC, "utf8"));
let n = 0;
for (const [id, dataUrl] of Object.entries(icons)) {
  const m = /^data:image\/png;base64,(.+)$/.exec(String(dataUrl));
  if (!m) {
    console.error(`跳过非法条目 #${id}`);
    continue;
  }
  writeFileSync(join(OUT_DIR, `${id}.png`), Buffer.from(m[1], "base64"));
  n++;
}
console.log(`已生成 ${n} 个图标 → public/icons/`);

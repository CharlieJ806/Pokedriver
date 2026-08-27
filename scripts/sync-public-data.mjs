/**
 * 把大体量数据 JSON 复制到 public/(静态导出后由运行时 fetch 加载),
 * 保持 data/ 为唯一源,构建时同步避免两份漂移。
 * 运行: node scripts/sync-public-data.mjs
 */
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
mkdirSync(OUT, { recursive: true });

for (const f of ["pokemon.json", "questions.json"]) {
  copyFileSync(join(ROOT, "data", f), join(OUT, f));
  console.log(`已同步 ${f} → public/data/`);
}

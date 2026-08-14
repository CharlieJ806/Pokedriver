// 从 PokeAPI 抓取全国图鉴进化链,生成 data/evolutions.json
// 用法:
//   node scripts/fetch-evolutions.mjs            # 完整抓取 + 修正
//   node scripts/fetch-evolutions.mjs --patch-only  # 仅对现有 evolutions.json 应用修正
// 说明: 只保留「源/目标都在 data/pokemon.json 中」的边,自动过滤地区形态等数据外物种。
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVO_PATH = join(ROOT, "data", "evolutions.json");
const PATCH_ONLY = process.argv.includes("--patch-only");

/* ============ 手工修正(PokeAPI 数据与官方游戏不一致/名称后缀不匹配的部分) ============ */
const PATCH = {
  // 地区形态专属进化错误地挂在普通形态链上 → 移除目标
  removeEdges: {
    52: [863], // 喵喵:喵头目来自伽勒尔喵喵
    194: [980], // 乌波:土王来自帕底亚乌波
    215: [903], // 狃拉:大狃拉来自洗翠狃拉
    562: [867], // 哭哭面具:死神板来自伽勒尔哭哭面具
  },
  // 普通形态无此进化,整条移除
  removeEntries: [83, 122, 211, 222, 264, 489], // 大葱鸭/魔墙人偶/千针鱼/太阳珊瑚/直冲熊/霏欧纳
  // PokeAPI 链名与数据名后缀不一致或链缺失 → 手工补全
  add: {
    412: [413, 414], // 结草儿 → 结草贵妇(wormadam-plant) | 绅士蛾
    808: [809], // 美录坦 → 美录梅塔(PokeAPI 链缺失)
    667: [668], // 小狮狮 → 火炎狮(pyroar-male)
    677: [678], // 妙喵 → 超能妙喵(meowstic-male)
    744: [745], // 岩狗狗 → 鬃岩狼人(lycanroc-midday)
    680: [681], // 双剑鞘 → 坚盾剑怪(aegislash-shield)
    710: [711], // 南瓜精 → 南瓜怪人(gourgeist-average)
    554: [555], // 火红不倒翁 → 达摩狒狒(darmanitan-standard)
    891: [892], // 熊徒弟 → 武道熊师(urshifu-single-strike)
    915: [916], // 爱吃豚 → 飘香豚(oinkologne-male)
    924: [925], // 一对鼠 → 一家鼠(maushold-family-of-four)
    963: [964], // 波普海豚 → 海豚侠(palafin-zero)
    206: [982], // 土龙弟弟 → 土龙节节(dudunsparce-two-segment)
    848: [849], // 电音婴 → 颤弦蝾螈(toxtricity-amped)
  },
};

function applyFixes(evo) {
  for (const [k, rm] of Object.entries(PATCH.removeEdges)) {
    if (evo[k]) evo[k] = evo[k].filter((t) => !rm.includes(t));
  }
  for (const k of PATCH.removeEntries) {
    delete evo[k];
  }
  for (const [k, targets] of Object.entries(PATCH.add)) {
    evo[k] = targets;
  }
  // 清理空条目 + 排序
  for (const [k, v] of Object.entries(evo)) {
    if (v.length === 0) delete evo[k];
    else evo[k] = [...new Set(v)].sort((a, b) => a - b);
  }
  return evo;
}

function writeEvo(evo) {
  writeFileSync(EVO_PATH, JSON.stringify(evo));
  console.log("written data/evolutions.json, entries:", Object.keys(evo).length);
}

/* ---- patch-only 模式 ---- */
if (PATCH_ONLY) {
  if (!existsSync(EVO_PATH)) {
    console.error("data/evolutions.json not found");
    process.exit(1);
  }
  const evo = JSON.parse(readFileSync(EVO_PATH, "utf8"));
  writeEvo(applyFixes(evo));
  process.exit(0);
}

/* ---- 完整抓取模式 ---- */
const pokemon = JSON.parse(
  readFileSync(join(ROOT, "data", "pokemon.json"), "utf8"),
);
const nameToId = new Map(); // 英文名(小写) → id
for (const p of pokemon) nameToId.set(p.n.toLowerCase(), p.id);
console.log("species in data:", pokemon.length);

const API = "https://pokeapi.co/api/v2/evolution-chain/";
const first = await fetch(API, { signal: AbortSignal.timeout(20000) }).then(
  (r) => r.json(),
);
const total = first.count;
console.log("evolution chains in PokeAPI:", total);

const evo = {}; // id → Set(target id)
const addEdge = (fromName, toName) => {
  const from = nameToId.get(fromName);
  const to = nameToId.get(toName);
  if (from == null || to == null) return; // 地区形态/数据外物种跳过
  (evo[from] ??= new Set()).add(to);
};
const walk = (chain) => {
  const from = chain.species.name;
  for (const e of chain.evolves_to) {
    addEdge(from, e.species.name);
    walk(e);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const queue = Array.from({ length: total }, (_, i) => i + 1);
let done = 0;
let failed = 0;

async function worker() {
  while (queue.length) {
    const id = queue.shift();
    try {
      const r = await fetch(API + id, { signal: AbortSignal.timeout(20000) });
      if (r.status === 429) {
        // 限流:放回队列稍后重试
        queue.push(id);
        await sleep(2000);
        continue;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      walk(j.chain);
    } catch (e) {
      failed++;
      console.error("chain", id, "failed:", e.message);
    }
    done++;
    if (done % 50 === 0) console.log("progress:", done, "/", total);
  }
}

await Promise.all(Array.from({ length: 4 }, worker));
console.log("done:", done, "failed:", failed);

const out = {};
for (const [k, v] of Object.entries(evo)) {
  out[k] = [...v].sort((a, b) => a - b);
}
if (Object.keys(out).length === 0) {
  console.error("no data fetched, NOT writing file");
  process.exit(1);
}
applyFixes(out);
writeEvo(out);

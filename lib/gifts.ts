/**
 * 版本福利(全服一次性发放)。
 *
 * 纯前端没有服务端,发福利只有一条路径:把发放内容写进代码 → 重新构建部署 →
 * 玩家下次打开游戏时,hydrate() 比对 meta.claimedGifts,未领取的自动到账。
 *
 * 发新福利 = 在 GIFTS 末尾加一条(注释里有模板)+ `npm run build` 重新部署。
 * 注意:奖励存在玩家浏览器里,改存档/改 JS 都能刷,只适合体验向福利,别发付费资产。
 */
import { MAX_TEAM_SIZE, POKE_BALLS } from "@/data/constants";
import { findCard } from "./cards";
import { getPkmName } from "./formulas";
import type { BallKey, MetaState } from "./types";

export type GiftItems = {
  /** 养成金币(metaGold) */
  gold?: number;
  /** 精灵球,存入 meta.pendingBalls,开新局/继续冒险时一次性并入对局 */
  balls?: Partial<Record<BallKey, number>>;
  /** 直接收录进图鉴的宝可梦 id */
  pkm?: number[];
  /** 直接解锁的技能卡 id */
  cards?: string[];
};

/** 三选一的一个候选项 */
export type GiftOption = {
  /** 选项唯一 id(存进 meta.giftChoices) */
  id: string;
  /** 展示名,缺省用宝可梦名 */
  label?: string;
  /** 副标题说明 */
  desc?: string;
  /** 选中后额外发放的道具 */
  items?: GiftItems;
  /** 选中后收录/上阵的宝可梦 */
  pkm?: number[];
};

export type GiftChoice = {
  prompt?: string;
  options: GiftOption[];
};

export type GiftDef = {
  /** 唯一 id,发放后记入 meta.claimedGifts,同 id 永不重复发(改 id 才会再发一次) */
  id: string;
  title: string;
  /** 提示里的说明文案 */
  desc?: string;
  /** 生效日 "YYYY-MM-DD"(含当天),省略 = 立即生效 */
  startAt?: string;
  /** 截止日 "YYYY-MM-DD"(含当天),省略 = 永久 */
  endAt?: string;
  /** 通用奖励,领取时直接发放 */
  items: GiftItems;
  /** 三选一:通用奖励发完后,再让玩家挑一个选项(选择结果记在 meta.giftChoices) */
  choice?: GiftChoice;
};

/**
 * 福利清单。加一条 = 发一次福利。
 * id 建议带上期号,避免与历史发放冲突。
 */
export const GIFTS: GiftDef[] = [
  {
    id: "gift-2026-11-legend",
    title: "传说三选一礼包",
    desc: "10 个大师球 + 盖欧卡 / 固拉多 / 烈空坐 任选其一",
    items: { balls: { master: 10 } },
    choice: {
      prompt: "选择一只传说宝可梦收进图鉴(队伍有空位会自动上阵)",
      options: [
        { id: "kyogre", pkm: [382], desc: "水系 · 高特攻,雨天之王" },
        { id: "groudon", pkm: [383], desc: "地面系 · 高物攻,晴天霸主" },
        { id: "rayquaza", pkm: [384], desc: "龙/飞行 · 全能,天空霸主" },
      ],
    },
  },

  // ── 复制这段改一改就是一次新福利 ──────────────────────────
  // {
  //   id: "gift-2026-11-10",              // 唯一 id,别和历史重复
  //   title: "版本更新补偿",
  //   desc: "补偿 500 金币 + 超级球 ×3",
  //   startAt: "2026-11-10",             // 生效日,可省略
  //   endAt: "2026-11-17",               // 截止日,可省略 = 永久
  //   items: { gold: 500, balls: { great: 3 } },
  // },
];

export function getGift(id: string): GiftDef | undefined {
  return GIFTS.find((g) => g.id === id);
}

/** "YYYY-MM-DD" → 当天 00:00 的本地时间戳 */
function dayStart(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 当前时间是否在福利有效期内(起止日均含当天) */
export function isGiftOpen(g: GiftDef, now = Date.now()): boolean {
  if (g.startAt && now < dayStart(g.startAt)) return false;
  if (g.endAt && now >= dayStart(g.endAt) + DAY_MS) return false;
  return true;
}

/** 未领取且仍在有效期内的福利 */
export function pendingGifts(meta: MetaState, now = Date.now()): GiftDef[] {
  const claimed = meta.claimedGifts || {};
  return GIFTS.filter((g) => isGiftOpen(g, now) && !claimed[g.id]);
}

/** 已发道具、但玩家还没选的三选一礼包 */
export function pendingGiftChoices(meta: MetaState): GiftDef[] {
  const claimed = meta.claimedGifts || {};
  const picked = meta.giftChoices || {};
  return GIFTS.filter((g) => !!g.choice && claimed[g.id] && !picked[g.id]);
}

/** 奖励摘要,如 "300 金币 · 大师球×10" */
export function describeItems(items: GiftItems): string {
  const parts: string[] = [];
  if (items.gold) parts.push(`${items.gold} 金币`);
  for (const [k, n] of Object.entries(items.balls || {}) as [BallKey, number][]) {
    if (n > 0) parts.push(`${POKE_BALLS[k]?.name ?? k}×${n}`);
  }
  for (const id of items.pkm || []) parts.push(getPkmName(id));
  for (const id of items.cards || []) {
    const c = findCard(id);
    if (c) parts.push(`技能卡「${c.name}」`);
  }
  return parts.join(" · ");
}

/** 把一组奖励写进 meta(原地修改),返回发放摘要 */
function applyItems(meta: MetaState, items: GiftItems): string {
  if (items.gold) {
    meta.metaGold = (meta.metaGold || 0) + items.gold;
  }
  for (const [k, n] of Object.entries(items.balls || {}) as [BallKey, number][]) {
    if (n > 0) meta.pendingBalls[k] = (meta.pendingBalls[k] || 0) + n;
  }
  for (const id of items.pkm || []) {
    meta.collected = { ...meta.collected, [String(id)]: true };
  }
  const owned = { ...(meta.ownedCards || {}) };
  let ownedChanged = false;
  for (const id of items.cards || []) {
    if (findCard(id) && !owned[id]) {
      owned[id] = true;
      ownedChanged = true;
    }
  }
  if (ownedChanged) meta.ownedCards = owned;
  return describeItems(items);
}

/**
 * 把一条福利写进 meta(原地修改并标记已领取),返回发放摘要。
 * 带 choice 的礼包此时只发通用奖励,选项等玩家调用 chooseGiftOption。
 * 调用方负责持久化。
 */
export function applyGift(meta: MetaState, g: GiftDef): string {
  meta.claimedGifts = { ...(meta.claimedGifts || {}), [g.id]: true };
  return applyItems(meta, g.items);
}

/**
 * 结算所有待发福利(原地修改 meta)。
 * 返回要提示给玩家的文案;没有待发福利时返回 null。
 */
export function grantPendingGifts(
  meta: MetaState,
  now = Date.now(),
): { count: number; message: string } | null {
  const list = pendingGifts(meta, now);
  if (list.length === 0) return null;

  const details = list.map((g) => `${g.title}(${applyGift(meta, g)})`);
  return {
    count: list.length,
    message: `🎁 福利到账:${details.join("、")}`,
  };
}

/** 三选一选项的展示名 */
export function optionLabel(g: GiftDef, opt: GiftOption): string {
  if (opt.label) return opt.label;
  const first = opt.pkm?.[0];
  return first != null ? getPkmName(first) : opt.id;
}

/**
 * 选择三选一礼包的选项(原地修改 meta),返回提示文案;无效/已选过返回 null。
 * 宝可梦会先收进图鉴,队伍有空位时自动上阵。
 */
export function chooseGiftOption(
  meta: MetaState,
  giftId: string,
  optionId: string,
): { message: string } | null {
  const g = getGift(giftId);
  const opt = g?.choice?.options.find((o) => o.id === optionId);
  if (!g || !opt) return null;
  if ((meta.giftChoices || {})[g.id]) return null;

  meta.giftChoices = { ...(meta.giftChoices || {}), [g.id]: opt.id };

  const parts: string[] = [];
  if (opt.items) {
    const s = applyItems(meta, opt.items);
    if (s) parts.push(s);
  }
  for (const id of opt.pkm || []) {
    meta.collected = { ...meta.collected, [String(id)]: true };
    parts.push(getPkmName(id));
    if (meta.team.length < MAX_TEAM_SIZE && !meta.team.includes(id)) {
      meta.team = [...meta.team, id];
      parts.push("已上阵");
    }
  }
  return { message: `🎁 已领取:${parts.join(" · ")}` };
}

import { POKEMON } from "@/data";
import { MAX_UPGRADE_LEVEL } from "@/data/constants";
import { ALL_CARDS } from "./cards";
import type { BallKey, MetaState } from "./types";

/**
 * 管理员模式:在本机(localhost/loopback)开启游戏时自动生效,
 * 提供无限金币 + 全解锁(全宝可梦、全技能卡、满级、满球)。
 * 上线部署(真实域名)不会触发,localStorage 按 origin 隔离,不影响线上存档。
 */

/** 有效"无限"金币:单局商店最贵 ~50 金,此值在任意一局内都花不完。 */
export const ADMIN_GOLD = 9_999_999;

/** 是否本机环境:仅 localhost / IPv4 / IPv6 回环地址命中。 */
export function isAdminEnv(): boolean {
  if (typeof window === "undefined") return false;
  const h = (window.location.hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0";
}

/** 跨局 meta 全解锁:满金币、满级、全图鉴、全技能卡、满球。 */
export function applyAdminMeta(meta: MetaState): void {
  meta.metaGold = ADMIN_GOLD;
  meta.metaHpLv = MAX_UPGRADE_LEVEL;
  meta.metaAtkLv = MAX_UPGRADE_LEVEL;
  meta.collected = {};
  for (const p of POKEMON) meta.collected[String(p.id)] = true;
  const owned: Record<string, boolean> = {};
  for (const c of ALL_CARDS) owned[c.id] = true;
  meta.ownedCards = owned;
  meta.pokeBalls = adminPokeBalls();
}

/** 本局满球:保证可捕获任意稀有度宝可梦。 */
export function adminPokeBalls(): Record<BallKey, number> {
  return { normal: 99, great: 99, ultra: 99, beast: 99, master: 99 };
}

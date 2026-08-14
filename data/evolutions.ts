/**
 * 全国图鉴进化链(from → 可能的目标,分支进化包含全部目标)。
 * 数据由 scripts/fetch-evolutions.mjs 从 PokeAPI 抓取并手工修正
 * (地区形态串链、名称后缀不匹配、PokeAPI 缺失链等,见该脚本 PATCH)。
 */
import evolutionsData from "./evolutions.json";

export const EVOLUTIONS: Record<number, number[]> = evolutionsData;

/** 进化经验成本:链中段进化(目标还能继续进化)=10,最终进化/单阶进化=20 */
export const EVOLVE_EXP_FIRST = 10;
export const EVOLVE_EXP_FINAL = 20;

/** 该宝可梦进化所需经验(战斗答对 1 题 / 重复捕捉 1 次 = 1 经验);不可进化返回 0 */
export function evolveCost(id: number): number {
  const targets = EVOLUTIONS[id] ?? [];
  if (targets.length === 0) return 0;
  // 目标还能继续进化 → 链中段(10);否则 → 最终进化/单阶进化(20)
  return (EVOLUTIONS[targets[0]!]?.length ?? 0) > 0
    ? EVOLVE_EXP_FIRST
    : EVOLVE_EXP_FINAL;
}

export function getEvoTargets(id: number): number[] {
  return EVOLUTIONS[id] ?? [];
}

export function isEvolvable(id: number): boolean {
  return (EVOLUTIONS[id]?.length ?? 0) > 0;
}

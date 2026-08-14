/**
 * 成就系统:数据驱动定义 + 原地解锁评估。
 * check 返回 {cur, need},cur >= need 即解锁;
 * 解锁时按 reward 发放养成金币(meta.metaGold 原地累加,仅发放一次)。
 */
import type { MetaState } from "./types";
import { TIER1_LEGEND, TIER2_LEGEND } from "@/data/constants";

export type AchievementDef = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  reward: number; // 解锁时发放的养成金币
  check: (m: MetaState) => { cur: number; need: number };
};

const collectedCount = (m: MetaState) => Object.keys(m.collected).length;
const ownedCardCount = (m: MetaState) =>
  Object.keys(m.ownedCards || {}).filter((k) => m.ownedCards![k]).length;
const legendCount = (m: MetaState, set: Set<number>) =>
  Object.keys(m.collected).filter((id) => set.has(Number(id))).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-run", icon: "🎮", name: "初次冒险", desc: "开始第一次冒险", reward: 20, check: (m) => ({ cur: m.totalRuns, need: 1 }) },
  { id: "runs-10", icon: "🔁", name: "老司机", desc: "累计冒险 10 次", reward: 60, check: (m) => ({ cur: m.totalRuns, need: 10 }) },
  { id: "floor-5", icon: "🗼", name: "初露锋芒", desc: "到达第 5 层", reward: 30, check: (m) => ({ cur: m.bestFloor, need: 5 }) },
  { id: "floor-10", icon: "🏔️", name: "高楼勇者", desc: "到达第 10 层", reward: 60, check: (m) => ({ cur: m.bestFloor, need: 10 }) },
  { id: "floor-15", icon: "🏙️", name: "层楼深处", desc: "到达第 15 层", reward: 100, check: (m) => ({ cur: m.bestFloor, need: 15 }) },
  { id: "floor-20", icon: "🏰", name: "地牢传奇", desc: "到达第 20 层", reward: 150, check: (m) => ({ cur: m.bestFloor, need: 20 }) },
  { id: "score-1000", icon: "🏆", name: "千分猎人", desc: "单局得分达到 1000", reward: 80, check: (m) => ({ cur: m.bestScore, need: 1000 }) },
  { id: "dex-10", icon: "📖", name: "图鉴新秀", desc: "收集 10 种宝可梦", reward: 20, check: (m) => ({ cur: collectedCount(m), need: 10 }) },
  { id: "dex-50", icon: "📚", name: "图鉴收藏家", desc: "收集 50 种宝可梦", reward: 60, check: (m) => ({ cur: collectedCount(m), need: 50 }) },
  { id: "dex-100", icon: "🏛️", name: "图鉴大师", desc: "收集 100 种宝可梦", reward: 100, check: (m) => ({ cur: collectedCount(m), need: 100 }) },
  { id: "dex-151", icon: "📕", name: "初代全图鉴", desc: "收集 151 种宝可梦", reward: 150, check: (m) => ({ cur: collectedCount(m), need: 151 }) },
  { id: "legend-1", icon: "🐉", name: "传说邂逅", desc: "捕获一只一级传说宝可梦", reward: 100, check: (m) => ({ cur: legendCount(m, TIER1_LEGEND), need: 1 }) },
  { id: "legend-2", icon: "🐲", name: "神兽猎人", desc: "捕获一只二级传说宝可梦", reward: 60, check: (m) => ({ cur: legendCount(m, TIER2_LEGEND), need: 1 }) },
  { id: "combo-5", icon: "✨", name: "渐入佳境", desc: "单局连击达到 5", reward: 20, check: (m) => ({ cur: m.maxComboEver, need: 5 }) },
  { id: "combo-10", icon: "🔥", name: "连击高手", desc: "单局连击达到 10", reward: 40, check: (m) => ({ cur: m.maxComboEver, need: 10 }) },
  { id: "combo-25", icon: "⚡", name: "连击传说", desc: "单局连击达到 25", reward: 80, check: (m) => ({ cur: m.maxComboEver, need: 25 }) },
  { id: "correct-100", icon: "✅", name: "百题斩", desc: "累计答对 100 题", reward: 30, check: (m) => ({ cur: m.totalCorrect, need: 100 }) },
  { id: "correct-1000", icon: "🧠", name: "千题斩", desc: "累计答对 1000 题", reward: 100, check: (m) => ({ cur: m.totalCorrect, need: 1000 }) },
  { id: "gold-500", icon: "💰", name: "小富翁", desc: "养成金币达到 500", reward: 50, check: (m) => ({ cur: m.metaGold, need: 500 }) },
  { id: "gold-2000", icon: "💎", name: "大富翁", desc: "养成金币达到 2000", reward: 150, check: (m) => ({ cur: m.metaGold, need: 2000 }) },
  { id: "cards-20", icon: "🎴", name: "技能收藏家", desc: "收集 20 张技能卡", reward: 40, check: (m) => ({ cur: ownedCardCount(m), need: 20 }) },
  { id: "cards-50", icon: "🃏", name: "卡牌大师", desc: "收集 50 张技能卡", reward: 80, check: (m) => ({ cur: ownedCardCount(m), need: 50 }) },
  { id: "evolve-1", icon: "🌱", name: "进化之光", desc: "完成第一次进化", reward: 30, check: (m) => ({ cur: m.evolveCount, need: 1 }) },
  { id: "evolve-10", icon: "🌟", name: "进化大师", desc: "累计进化 10 次", reward: 100, check: (m) => ({ cur: m.evolveCount, need: 10 }) },
  { id: "exam-pass", icon: "🎓", name: "科一合格", desc: "模拟考试达到 90 分", reward: 50, check: (m) => ({ cur: m.bestExamScore, need: 90 }) },
  { id: "exam-100", icon: "🥇", name: "满分状元", desc: "模拟考试满分 100 分", reward: 150, check: (m) => ({ cur: m.bestExamScore, need: 100 }) },
  { id: "team-3", icon: "⭐", name: "满编阵容", desc: "上阵队伍达到 3 只", reward: 20, check: (m) => ({ cur: (m.team || []).length, need: 3 }) },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** 计算并解锁成就(原地修改 meta.achievements 并发放奖励金币),返回新解锁的成就列表 */
export function evalAchievements(meta: MetaState): AchievementDef[] {
  if (!meta.achievements || typeof meta.achievements !== "object") {
    meta.achievements = {};
  }
  const newly: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.achievements[a.id]) continue;
    const { cur, need } = a.check(meta);
    if (cur >= need) {
      meta.achievements[a.id] = true;
      meta.metaGold = (meta.metaGold || 0) + a.reward;
      newly.push(a);
    }
  }
  return newly;
}

import gameRulesData from "./game_rules.json";
import bstData from "./bst.json";
import { GAME_CONST } from "./constants";

export type Rarity = "c" | "u" | "r" | "l";

export type Pokemon = {
  id: number;
  n: string;
  c: string;
  r: Rarity;
  i: number;
};

export type Question = {
  id: string;
  q: string;
  opts: string[];
  ans: number;
};

export type GameRules = {
  rarity_labels: Record<Rarity, string>;
  rarity_colors: Record<Rarity, string>;
  hp_formula: string;
  rarity_hp_mult: Record<Rarity, number>;
  speed_base: string;
  rarity_speed_mult: Record<Rarity, number>;
  icon_fallback_colors: string[];
};

/**
 * 大体积数据(图鉴/题库)不再打进 JS 主包:源文件放在 public/data/,
 * 启动时由 loadData() 拉取后填充。使用方在游戏启动完成前不会渲染,
 * 因此函数体内的读取总是拿到完整数据。
 */
export const POKEMON: Pokemon[] = [];
export const QUESTIONS: Question[] = [];

/** 小体量、启动早期就要用的数据仍随包内置。 */
export const PKM_BST = bstData as Record<string, number | null>;
export const GAME_RULES = gameRulesData as GameRules;

let loadPromise: Promise<void> | null = null;

/** 拉取图鉴与题库(幂等);失败时抛错,由调用方决定 UI。 */
export function loadData(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [pokemon, questions] = await Promise.all([
        fetch("/data/pokemon.json").then((r) => {
          if (!r.ok) throw new Error(`pokemon.json ${r.status}`);
          return r.json();
        }),
        fetch("/data/questions.json").then((r) => {
          if (!r.ok) throw new Error(`questions.json ${r.status}`);
          return r.json();
        }),
      ]);
      POKEMON.push(...(pokemon as Pokemon[]));
      QUESTIONS.push(...(questions as Question[]));
    })();
    // 失败允许重试:下一次调用重新发起
    loadPromise.catch(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export {
  TIER1_LEGEND,
  TIER2_LEGEND,
  MYTHICAL_PKMN,
  DEFAULT_POKEMON_ID,
  SPAWN_INTERVAL,
  SPAWN_MAX,
  MAX_UPGRADE_LEVEL,
  BANK_PAGE_SIZE,
  MAX_MONSTERS,
} from "./constants";

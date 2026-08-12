"use client";

import { useGameStore } from "@/lib/store";
import { getPkmName } from "@/lib/formulas";
import { ICON } from "@/lib/icon";
import { AudioEngine } from "@/lib/audio";

export default function TitleScreen() {
  const meta = useGameStore((s) => s.meta);
  const hasSave = useGameStore((s) => s.hasSave);
  const setScreen = useGameStore((s) => s.setScreen);
  const continueRun = useGameStore((s) => s.continueRun);

  const starterId = 25; // Pikachu 展示图

  const go = (id: string) => {
    AudioEngine.sfx("click");
    setScreen(id as never);
  };

  const startNew = () => {
    AudioEngine.sfx("click");
    setScreen("starter");
  };

  return (
    <section className="screen active" id="scr-title">
      <div className="title-bg">
        <div className="title-grid" />
        <div className="title-glow" />
      </div>
      <div className="title-inner">
        <div className="title-logo">
          <div className="logo-top">宝可驾</div>
          <div className="logo-sub">交 规 地 牢</div>
        </div>
        <div className="title-pkmn">
          {ICON(starterId) ? (
            <img src={ICON(starterId)} alt="Pikachu" />
          ) : null}
        </div>

        <div className="title-stats">
          <div>🏆 最佳记录: {meta.bestScore > 0 ? `${meta.bestScore} 分 (第${meta.bestFloor}层)` : "暂无"}</div>
          <div>📖 图鉴: {Object.keys(meta.collected).length} / 1010</div>
          <div>💰 养成金币: {meta.metaGold}</div>
        </div>

        <div className="title-team">
          当前上阵:
          {meta.team.length > 0 ? (
            meta.team.map((id) => (
              <span key={id} className="title-team-poke">
                {ICON(id) ? (
                  <img src={ICON(id)} alt="" />
                ) : (
                  <span>👾</span>
                )}
                <em>{getPkmName(id)}</em>
              </span>
            ))
          ) : (
            <span className="title-team-empty">尚未配置 — 在图鉴中选择</span>
          )}
        </div>

        <div className="title-menu">
          <button className="btn btn-primary" onClick={startNew}>
            🎮 新的冒险
          </button>
          <button
            className="btn"
            disabled={!hasSave()}
            onClick={() => {
              AudioEngine.sfx("click");
              continueRun();
            }}
          >
            📂 继续冒险
          </button>
        </div>

        <div className="title-menu-extra">
          <button className="btn-mini" onClick={() => go("train")}>🧬 养成</button>
          <button className="btn-mini" onClick={() => go("gacha")}>🎴 技能抽卡</button>
          <button className="btn-mini" onClick={() => go("deckbuild")}>🃏 构建牌组</button>
          <button className="btn-mini" onClick={() => go("dex")}>📖 图鉴</button>
          <button className="btn-mini" onClick={() => go("bank")}>📚 题库复习</button>
          <button className="btn-mini" onClick={() => go("study")}>🏫 学习中心</button>
          <button className="btn-mini" onClick={() => go("settings")}>⚙️ 设置</button>
        </div>

        <div className="title-foot">答题爬塔 · 捕捉宝可梦 · 组牌通关</div>
      </div>
    </section>
  );
}

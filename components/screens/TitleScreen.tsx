"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { getPkmName } from "@/lib/formulas";
import { ICON } from "@/lib/icon";
import { AudioEngine } from "@/lib/audio";

const STARTERS = [
  { src: "/art/starter-volt.webp", alt: "电系伙伴" },
  { src: "/art/starter-leaf.webp", alt: "叶系伙伴" },
  { src: "/art/starter-cloud.webp", alt: "云系伙伴" },
] as const;

export default function TitleScreen() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const continueRun = useGameStore((s) => s.continueRun);
  const [saveExists] = useState(() => useGameStore.getState().hasSave());

  const go = (id: string) => {
    AudioEngine.sfx("click");
    setScreen(id as never);
  };

  const startNew = () => {
    AudioEngine.sfx("click");
    setScreen("starter");
  };

  const onContinue = () => {
    AudioEngine.sfx("click");
    continueRun();
  };

  return (
    <section className="screen active" id="scr-title">
      <div className="title-inner">
        <div className="title-logo">
          <img
            className="logo-img"
            src="/art/ui-logo.webp"
            alt="宝可驾 · 交规地牢"
          />
        </div>

        <div className="title-starters">
          {STARTERS.map((s) => (
            <img key={s.src} src={s.src} alt={s.alt} />
          ))}
        </div>

        <div className="title-cta">
          {saveExists && (
            <button
              type="button"
              className="btn-plate"
              id="btn-continue"
              onClick={onContinue}
            >
              <img className="bp-bg" src="/art/ui-plate-gold-long.webp" alt="" />
              <span className="bp-content">
                <span className="bp-label bp-label-dark">
                  <img className="bp-play" src="/art/ui-play.webp" alt="" />
                  继续冒险
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            className="btn-plate"
            id="btn-start"
            onClick={startNew}
          >
            <img className="bp-bg" src="/art/ui-plate-blue.webp" alt="" />
            <span className="bp-content">
              <span className="bp-label">新的冒险</span>
            </span>
          </button>
        </div>

        <div className="title-grid-nav" aria-label="次要功能">
          <button
            type="button"
            className="title-nav-card tnc-dex"
            onClick={() => go("dex")}
          >
            <img className="tnc-icon" src="/art/icon-dex.webp" alt="" />
            <span className="tnc-label">图鉴</span>
            <span className="tnc-sub">
              {Object.keys(meta.collected).length}/1010
            </span>
          </button>
          <button
            type="button"
            className="title-nav-card tnc-study"
            onClick={() => go("study")}
          >
            <img className="tnc-icon" src="/art/icon-study.webp" alt="" />
            <span className="tnc-label">学习</span>
            <span className="tnc-sub">模考 · 错题</span>
          </button>
          <button
            type="button"
            className="title-nav-card tnc-train"
            onClick={() => go("train")}
          >
            <img className="tnc-icon" src="/art/icon-train.webp" alt="" />
            <span className="tnc-label">养成</span>
            <span className="tnc-sub">💰 {meta.metaGold}</span>
          </button>
          <button
            type="button"
            className="title-nav-card tnc-settings"
            onClick={() => go("settings")}
          >
            <img className="tnc-icon" src="/art/icon-settings.webp" alt="" />
            <span className="tnc-label">设置</span>
            <span className="tnc-sub">音量 · 数据</span>
          </button>
        </div>

        <div className="title-menu-extra">
          <button className="btn-mini" onClick={() => go("gacha")}>🎴 技能抽卡</button>
          <button className="btn-mini" onClick={() => go("deckbuild")}>🃏 构建牌组</button>
          <button className="btn-mini" onClick={() => go("bank")}>📚 题库复习</button>
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

        <div className="title-stats">
          <div>🏆 最佳记录: {meta.bestScore > 0 ? `${meta.bestScore} 分 (第${meta.bestFloor}层)` : "暂无"}</div>
          <div>📖 图鉴: {Object.keys(meta.collected).length} / 1010</div>
          <div>💰 养成金币: {meta.metaGold}</div>
        </div>

        <div className="title-foot">答题爬塔 · 捕捉宝可梦 · 组牌通关 · 驾考题库 1034 题</div>
      </div>
    </section>
  );
}

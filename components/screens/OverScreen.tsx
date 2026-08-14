"use client";

import { useGameStore } from "@/lib/store";
import { AudioEngine } from "@/lib/audio";

export default function OverScreen() {
  const gameOver = useGameStore((s) => s.gameOver);
  const setScreen = useGameStore((s) => s.setScreen);
  const newRun = useGameStore((s) => s.newRun);

  if (!gameOver) return null;

  const acc =
    gameOver.answered > 0
      ? Math.round((gameOver.correct / gameOver.answered) * 100)
      : 0;

  return (
    <section className="screen active" id="scr-over">
      <div className="over-inner">
        <div className={`over-title ${gameOver.win ? "win" : ""}`}>
          {gameOver.win ? "🏆 恭喜通关！" : "💀 冒险结束"}
        </div>
        <div className="over-stats">
          <div className="over-stat">
            到达: <b>第 {gameOver.floor} 层</b>
          </div>
          <div className="over-stat">
            得分: <b>{gameOver.score}</b>
            {gameOver.isRecord ? " 🏆新纪录！" : ""}
          </div>
          <div className="over-stat">
            答题正确率: <b>{acc}%</b>
          </div>
          <div className="over-stat">
            最大连击: <b>{gameOver.maxCombo}</b>
          </div>
          <div className="over-stat">
            收集宝可梦: <b>{gameOver.caught}</b>
          </div>
        </div>
        <div className="over-sub">
          剩余金币已存入养成 💰 (设置→养成查看)
        </div>
        <div className="over-btns">
          <button
            className="btn btn-primary"
            onClick={() => {
              AudioEngine.sfx("click");
              // 与标题页一致:仅首次游玩选择初始宝可梦,之后直接用现有队伍开局
              const st = useGameStore.getState();
              const firstTime =
                Object.keys(st.meta.collected).length === 0 &&
                st.meta.team.length === 0;
              if (firstTime) {
                setScreen("starter");
              } else {
                newRun();
              }
            }}
          >
            🎮 再来一局
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              AudioEngine.sfx("click");
              setScreen("title");
            }}
          >
            🏠 返回首页
          </button>
        </div>
      </div>
    </section>
  );
}

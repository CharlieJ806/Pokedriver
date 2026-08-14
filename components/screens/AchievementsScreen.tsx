"use client";

import { useGameStore } from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AudioEngine } from "@/lib/audio";

export default function AchievementsScreen() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const unlocked = meta.achievements || {};
  const done = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <section className="screen active" id="scr-achievements">
      <div className="title-inner" style={{ justifyContent: "flex-start", paddingTop: 16 }}>
        <div className="set-row">
          <button
            className="btn btn-ghost"
            onClick={() => {
              AudioEngine.sfx("click");
              setScreen("title");
            }}
          >
            ← 返回
          </button>
          <div style={{ fontWeight: 800 }}>
            🏆 成就 ({done}/{ACHIEVEMENTS.length})
          </div>
        </div>

        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const got = !!unlocked[a.id];
            const { cur, need } = a.check(meta);
            return (
              <div key={a.id} className={`ach-cell ${got ? "done" : "locked"}`}>
                <div className="ach-icon">{a.icon}</div>
                <div className="ach-body">
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc">{a.desc}</div>
                  <div className="ach-prog">
                    {got
                      ? `已达成 +${a.reward}金`
                      : `${Math.min(cur, need)}/${need} · +${a.reward}金`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

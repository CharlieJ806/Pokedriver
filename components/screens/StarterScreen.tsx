"use client";

import { STARTERS, useGameStore } from "@/lib/store";
import { getPkmById } from "@/lib/formulas";
import { ICON } from "@/lib/icon";
import { AudioEngine } from "@/lib/audio";

export default function StarterScreen() {
  const newRun = useGameStore((s) => s.newRun);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <section className="screen active" id="scr-starter">
      <div className="title-inner">
        <div className="title-logo">
          <div className="logo-top">选择伙伴</div>
          <div className="logo-sub">初始宝可梦</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "min(90vw, 360px)",
          }}
        >
          {STARTERS.map((s) => {
            const pkm = getPkmById(s.id);
            if (!pkm) return null;
            return (
              <button
                key={s.id}
                className="btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  padding: "14px 18px",
                }}
                onClick={() => {
                  AudioEngine.sfx("caught");
                  newRun(s.id);
                }}
              >
                <span style={{ fontSize: 34, width: 44, textAlign: "center" }}>
                  {ICON(s.id) ? (
                    <img
                      src={ICON(s.id)}
                      alt=""
                      style={{ width: 40, height: 40 }}
                    />
                  ) : (
                    "👾"
                  )}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 800 }}>
                    {pkm.c}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--dim)" }}>
                    {s.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="btn btn-ghost"
          onClick={() => {
            AudioEngine.sfx("click");
            setScreen("title");
          }}
        >
          ← 返回
        </button>
      </div>
    </section>
  );
}

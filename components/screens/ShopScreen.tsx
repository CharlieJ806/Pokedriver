"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { POKE_BALLS } from "@/data/constants";
import { rollShopCards } from "@/lib/shop";
import { hydrateCardList } from "@/lib/cards";
import { AudioEngine } from "@/lib/audio";
import type { BallKey } from "@/lib/types";

export default function ShopScreen() {
  const run = useGameStore((s) => s.run);
  const leaveShop = useGameStore((s) => s.leaveShop);
  const buyBall = useGameStore((s) => s.buyBall);
  const buyShopCard = useGameStore((s) => s.buyShopCard);
  const removeDeckCard = useGameStore((s) => s.removeDeckCard);
  const [stock] = useState(() => rollShopCards(4));

  if (!run) return null;
  const deckCards = hydrateCardList(run.deck);

  return (
    <section className="screen active" id="scr-shop">
      <div className="shop-list">
        <div className="shop-title">🏪 道具商店</div>
        <div className="shop-gold">
          当前金币: <b style={{ color: "var(--gold)" }}>{run.gold}</b> 🪙
        </div>

        <div className="shop-section">🔴 精灵球</div>
        {(Object.keys(POKE_BALLS) as BallKey[]).map((key) => {
          const ball = POKE_BALLS[key]!;
          const affordable = run.gold >= ball.price;
          return (
            <div
              key={key}
              className={`shop-item ${!affordable ? "empty" : ""}`}
              onClick={() => {
                AudioEngine.sfx("click");
                buyBall(key);
              }}
            >
              <div className="card-icon" style={{ fontSize: 26 }}>
                {ball.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{ball.name}</div>
                <div style={{ fontSize: 10, color: "var(--dim)" }}>
                  {ball.desc} · 库存 {run.pokeBalls[key] || 0}个
                </div>
              </div>
              <div className="shop-price">{ball.price}🪙</div>
            </div>
          );
        })}

        <div className="shop-section">🃏 技能卡片</div>
        {stock.map(({ card, price }, i) => (
          <div
            key={i}
            className={`shop-item type-${card.type} ${
              run.gold < price ? "empty" : ""
            }`}
            onClick={() => {
              AudioEngine.sfx("click");
              buyShopCard(card.id, price);
            }}
          >
            <div className="card-icon">{card.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{card.name}</div>
              <div style={{ fontSize: 10, color: "var(--dim)" }}>{card.desc}</div>
            </div>
            <div className="shop-price">{price}🪙</div>
          </div>
        ))}

        <div className="shop-section">🗑️ 移除卡牌 (75🪙/张 · 点击选择要移除的牌)</div>
        {deckCards.map((card) => (
          <div
            key={card.id}
            className={`shop-item${run.gold < 75 || run.deck.length <= 5 ? " empty" : ""}`}
            onClick={() => {
              AudioEngine.sfx("click");
              removeDeckCard(card.id);
            }}
          >
            <div className="card-icon">{card.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{card.name}</div>
              <div style={{ fontSize: 10, color: "var(--dim)" }}>{card.desc}</div>
            </div>
            <div className="shop-price">🗑️ 移除</div>
          </div>
        ))}
      </div>

      {/* 底部固定操作区(参考线上版:主按钮固定在底部,不随列表滚动) */}
      <div className="shop-foot">
        <button
          className="btn btn-primary"
          onClick={() => {
            AudioEngine.sfx("click");
            leaveShop();
          }}
        >
          离开商店
        </button>
      </div>
    </section>
  );
}

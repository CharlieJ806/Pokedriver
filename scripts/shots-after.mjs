/**
 * 优化后截图巡检:移动端 390x844 + 桌面。
 * 截关键屏幕(标题/图鉴/战斗)存 scripts/shots/,并做 DOM 取证:
 * - 横向溢出检测
 * - 图鉴外置图标:可见区全部解码 + 全 DOM 零损坏 + 服务端抽样 8 个可达
 * - 战斗屏 fx3d 动态包就绪(fx-3d 类 + WebGL canvas 尺寸)
 * 运行: 先起静态服务器(out/ 目录 @ :3000),再 node scripts/shots-after.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "shots");
mkdirSync(OUT, { recursive: true });

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const URL = "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

/** 当前激活屏幕 id */
async function activeScreen() {
  return page.evaluate(
    () => document.querySelector(".screen.active")?.id ?? "(无)",
  );
}

/** 清存档。失败通常意味着当前文档不是应用页(服务器挂了/错误页)。 */
async function resetSave() {
  const ok = await page.evaluate(() => {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  });
  if (!ok || !(await page.url()).startsWith(URL)) {
    throw new Error(`无法访问应用上下文(url=${page.url()})——静态服务器可能已退出`);
  }
}

/** 点击第一个包含指定文本的按钮 */
async function clickButton(text) {
  return page.evaluate((t) => {
    const el = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(t),
    );
    el?.click();
    return !!el;
  }, text);
}

async function waitForScreen(id, ms = 4000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if ((await activeScreen()) === id) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}

async function gotoApp() {
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
  await resetSave();
  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000)); // boot 门 + 数据 fetch
  const scr = await activeScreen();
  if (scr !== "scr-title") throw new Error(`启动后不在标题页: ${scr}`);
}

async function snapshot(name) {
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`📸 ${file}`);
}

async function overflowCheck(label) {
  const s = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      overflowX: doc.scrollWidth > doc.clientWidth,
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
    };
  });
  console.log(
    `   [${label}] 溢出X=${s.overflowX ? `是 ⚠️ (${s.scrollW}>${s.clientW})` : "否 ✅"}`,
  );
}

/** 图鉴图标审计:懒加载语义下,只断言"已加载零损坏+视口内全解码" */
async function iconAudit() {
  return page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img[src^="/icons/"]')];
    const visible = imgs.filter((im) => {
      const r = im.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    });
    await Promise.all(
      visible.map((im) =>
        im.complete
          ? Promise.resolve()
          : new Promise((res) => {
              im.addEventListener("load", res, { once: true });
              im.addEventListener("error", res, { once: true });
              setTimeout(res, 5000);
            }),
      ),
    );
    return {
      gridCells: document.querySelectorAll(".dex-cell").length,
      total: imgs.length,
      broken: imgs.filter((im) => im.complete && im.naturalWidth === 0).length,
      visibleTotal: visible.length,
      visibleOk: visible.filter((im) => im.naturalWidth > 0).length,
    };
  });
}

/** 服务端抽样:取 8 个格子请求其图标 URL,验证可达且非空 */
async function iconSampleCheck() {
  return page.evaluate(async () => {
    const cells = [...document.querySelectorAll(".dex-cell .dc-id")].map(
      (el) => el.textContent?.replace("#", "") ?? "",
    );
    const picks = [];
    while (picks.length < 8 && cells.length) {
      const id = cells[Math.floor(Math.random() * cells.length)];
      if (!picks.includes(id)) picks.push(id);
    }
    const results = await Promise.all(
      picks.map(async (id) => {
        try {
          const res = await fetch(`/icons/${id}.png`, { cache: "no-store" });
          const buf = await res.arrayBuffer();
          return res.ok && buf.byteLength > 0;
        } catch {
          return false;
        }
      }),
    );
    return results.every(Boolean);
  });
}

/** 清档 → 新冒险(兼容 starter 两步流)→ 点地图节点进战斗 */
async function enterBattleFromFreshRun() {
  await resetSave();
  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000));
  if (!(await clickButton("新的冒险"))) throw new Error("找不到 新的冒险 按钮");
  // localhost = admin 全解锁(collected/team 非空)→ 直接进地图;清档真首次则走 starter
  if (await waitForScreen("scr-starter", 1500)) {
    await page.evaluate(
      () => document.querySelectorAll(".starter-card")[0]?.click(),
    );
    if (!(await waitForScreen("scr-map", 4000)))
      throw new Error(`选完初始伙伴未进地图: ${await activeScreen()}`);
  } else if (!(await waitForScreen("scr-map", 1500))) {
    throw new Error(`点新的冒险后既非 starter 也非 map: ${await activeScreen()}`);
  }
  const entered = await page.evaluate(async () => {
    const canvas = document.querySelector("#map-canvas");
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // 与 lib/map.ts computeLayout 相同公式
    const nodeR = 18 * dpr;
    const marginY = Math.max(72 * dpr, nodeR + 16 * dpr + 36 * dpr * 0.5);
    const topPad = marginY + 36 * dpr * 0.25;
    const botPad = marginY + 18 * dpr * 0.25;
    const usableH = Math.max(1, canvas.height - topPad - botPad);
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const marginX = Math.max(50 * dpr, nodeR + 16 * dpr + 8 * dpr);
    for (let row = 0; row < 3; row++) {
      const y = topPad + (row / 2) * usableH;
      canvas.dispatchEvent(
        new MouseEvent("click", {
          clientX: rect.left + marginX * scaleX,
          clientY: rect.top + y * scaleY,
          bubbles: true,
        }),
      );
      await new Promise((res) => setTimeout(res, 400));
      if (document.querySelector(".screen.active")?.id === "scr-battle")
        return true;
    }
    return false;
  });
  if (!entered)
    throw new Error(`点击地图节点未进入战斗: ${await activeScreen()}`);
  await new Promise((r) => setTimeout(r, 2500)); // 等 fx3d 动态包 + 首帧
}

async function battleFxProbe() {
  return page.evaluate(() => {
    const wrap = document.querySelector(".enemy-sprite-wrap");
    const stage = document.getElementById("battle-stage");
    const canvas = document.getElementById("battle-fx-canvas");
    return {
      stage3d: !!stage?.classList.contains("fx-3d"),
      sprite2dHidden: wrap ? getComputedStyle(wrap).display === "none" : null,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      options: document.querySelectorAll(".battle-opt-btn").length,
    };
  });
}

async function runViewport(name, width, height, dsf) {
  console.log(`\n=== ${name} ${width}x${height}@${dsf}x ===`);
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: dsf,
    isMobile: dsf > 1,
  });

  /* 标题页 */
  await gotoApp();
  await snapshot(`${name}-title`);
  await overflowCheck("标题");

  /* 图鉴 */
  if (!(await clickButton("图鉴"))) throw new Error("找不到 图鉴 按钮");
  if (!(await waitForScreen("scr-dex")))
    throw new Error(`点击图鉴未切换: ${await activeScreen()}`);
  const icons = await iconAudit();
  const sampleOk = await iconSampleCheck();
  const iconsPass =
    icons.gridCells > 0 &&
    icons.broken === 0 &&
    icons.visibleTotal === icons.visibleOk &&
    sampleOk;
  console.log(
    `   [图鉴] 格子=${icons.gridCells} 可见图标 ${icons.visibleOk}/${icons.visibleTotal} 损坏=${icons.broken} 抽样=${sampleOk ? "✅" : "❌"} ${iconsPass ? "✅" : "⚠️"}`,
  );
  await snapshot(`${name}-dex`);
  await overflowCheck("图鉴");

  /* 地图 → 战斗 */
  await enterBattleFromFreshRun();
  const fx = await battleFxProbe();
  console.log(
    `   [战斗] 3D场景=${fx.stage3d ? "✅" : "❌"} 2D精灵隐藏=${fx.sprite2dHidden} canvas=${fx.canvasSize} 答题项=${fx.options}`,
  );
  await snapshot(`${name}-battle`);
  await overflowCheck("战斗");
}

try {
  await runViewport("mobile", 390, 844, 2);
  await runViewport("desktop", 1280, 800, 1);
} catch (e) {
  console.error("\n❌ 巡检中断:", e.message);
  process.exitCode = 1;
} finally {
  console.log("\n页面错误:", errors.length ? errors.slice(0, 10) : "无 ✅");
  await browser.close();
}

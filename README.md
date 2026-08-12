# 宝可驾 · 交规地牢 — Next.js 卡牌版(交接文档)

> 本工程由 `Z:\Files\Games\pokedriver2_standalone`(纯 HTML/CSS/JS 卡牌版)迁移而来,于 2026-08-12 完成代码迁移,待升级 Node ≥20.9 后做运行验证。

## 1. 项目背景与版本关系

同一游戏「宝可驾 · 交规地牢」存在多个版本:

| 目录 | 形态 | 说明 |
|---|---|---|
| `Z:\Files\Games\pokedriver_standalone` | Next.js 16 版(**在线版源码**,game01.hariketsu.tech) | 纯答题战斗(无卡牌),有考试/学习/错题/初始选择;其 `standalone/` 子目录是纯前端备份 |
| `Z:\Files\Games\pokedriver2_standalone` | 纯 HTML/CSS/JS **卡牌版**(可双击运行) | 卡牌战斗(答题攒能量→出牌)、抽卡、组牌;存档键 `dungeonDrive_*` |
| **`pokedriver2_next`(本工程)** | Next.js 16 + React 19 + zustand 5 + TS | **卡牌战斗 + 在线版全部功能**的合并版;存档兼容 `dungeonDrive_*` |

**迁移方式**:复制 `pokedriver_standalone` 的 Next.js 版为工程骨架(复用工程配置、数据文件、UI 组件、音频引擎),再把 `pokedriver2_standalone` 的卡牌系统移植进来,并按线上版行为补全考试/学习/错题本/初始选择。

## 2. 环境与运行

- **Node ≥ 20.9 必须**(Next 16 要求;本机当时为 18.19.1,待升级)
- 升级:`winget install OpenJS.NodeJS.LTS` 或 `nvm install 22 && nvm use 22`
- 依赖已安装(`node_modules` 就绪)

```bash
npm run dev      # 开发
npm run build    # 构建(验证用)
npm start        # 生产运行
```

## 3. 目录结构

```
app/                 layout.tsx(引入 globals.css + cards.css) / page.tsx("use client" → GameApp)
data/                pokemon.json(1010只) questions.json(1034题) pokemon-icons.json(1010 图标)
                     bst.json(1010种族值,新增) constants.ts(稀有度/精灵球/考试常量) index.ts
lib/                 游戏逻辑(纯函数 + zustand store,无 React)
  types.ts           全部类型(卡牌/地图/存档/Meta/Run/屏幕/考试)
  cards.ts           ALL_CARDS 80+张卡定义 + findCard/hydrateCard/applyCardFx
  battle.ts          卡牌战斗流程:startTurn/enterCardPhase/endTurn/playCardOn/answerBattle/startBattleOn
  map.ts             列节点地图:generateMapNodes/renderMap(canvas)/hitTest/applyNodeSelection
  store.ts           核心 store(全部 action)
  save.ts            存档:dungeonDrive_* 键 + 旧存档迁移
  formulas.ts        数值公式(getEnemyStats BST 公式/养成/抽卡权重)+ 通用工具
  exam.ts            考试:100题/45min/90分 + 判卷
  events.ts          4 种事件(神秘商人/温泉/训练师/宝可梦中心)
  questions.ts       题库源(导入 → 内置)与导入解析
  shop.ts            商店随机卡库存
  audio.ts           音频引擎(复用参考工程,含 BGM 能力)
  icon.ts / fx3d.ts / dom-fx.ts   图标与特效(复用参考工程)
components/
  GameApp.tsx        根:16 屏 if-链 + hydrate + 键盘(1-4 答题/E 结束回合) + 音频解锁
  ui/                Modal(捕获/奖励/事件/图鉴详情)、Toast
  screens/           Title Starter Map Battle Shop Rest Dex Bank Train Gacha
                     DeckBuild Settings Study Exam Wrong Over(16 个)
app/globals.css      基础主题(复制自参考工程)
app/cards.css        卡牌版扩展样式(手牌/卡面/题库/考试/商店等,从 standalone css 迁移)
```

## 4. 状态管理(store 核心)

zustand 单例,三个核心对象:

```
meta  (跨局,持久化 dungeonDrive_meta)
  bestScore/bestFloor/totalRuns/collected/team/pokeBalls/soundEnabled
  metaGold/metaHpLv/metaAtkLv/ownedCards/builtDeckIds
  + wrongQ{qid:错次数}/totalCorrect/totalAnswered/maxComboEver   ← 新字段

run   (单局,持久化 dungeonDrive_save)
  hp/maxHp/gold/score/floor/deck[]/hand[]/drawPile[]/discardPile[]/energy/block/combo...
  mapNodes/currentNodeIdx/team/pokeBalls
  + 战斗现场:enemyPkm/enemyHp/enemyBlock/enemyIntent/enemyStatus/turnPhase/turnCorrect...
  (牌组只存卡 id,渲染时 hydrate)

battle 状态不再单独存 —— 战斗现场并入 run(与本地版 GS 一致,断点续战完整)
```

派生值不存 store:`getPlayerAtk(metaAtkLv)` / `getMaxHpFromMeta(metaHpLv)` / `upgradeCost(lv)`。

**状态流原则**:所有游戏逻辑走 store action(clone → 修改 → set → 持久化);答题链 400ms 延迟出下一题由 BattleScreen 的 setTimeout 驱动(带状态守卫);特效/飘字走 fx 模块,不进 store。

## 5. 屏幕清单(16 屏)

| screen | 组件 | 入口 | 说明 |
|---|---|---|---|
| title | TitleScreen | 启动默认 | 全部入口 + 最佳记录 + 继续冒险 |
| starter | StarterScreen | 新的冒险 | 妙蛙种子/小火龙/杰尼龟三选一 → newRun(id) |
| map | MapScreen | starter/继续/boss后 | canvas 列节点地图 + 牌组侧栏 + 保存返回 |
| battle | BattleScreen | map 节点 | 答题链→出牌→泄能→敌方攻击;键盘 1-4/E |
| shop | ShopScreen | map | 5 种精灵球 + 4 张随机卡 + 移除牌(75金) |
| rest | RestScreen | map | 休息 30% / 特训(回复+3养成金) |
| dex | DexScreen | title | 图鉴网格 + 筛选 + 详情弹窗 |
| bank | BankScreen | title/study | 题库分页搜索 + 只看错题 + 10题快练 |
| train | TrainScreen | title | 养成(5+lv×2 费用,+3HP/+1ATK) |
| gacha | GachaScreen | title | 50金加权抽卡,不重复 |
| deckbuild | DeckBuildScreen | title | 牌组上限 12,已收集/未拥有过滤 |
| settings | SettingsScreen | title | 音效/统计/导入题库/重置 |
| study | StudyScreen | title | 学习中心:考试/错题/题库三入口 |
| exam | ExamScreen | study | 100题/45min/90分,计时/跳题/标记/交卷 |
| wrong | WrongScreen | study | 错题列表(按错次降序)+ 练习会话 |
| over | OverScreen | 败北/boss通关 | 结算统计 + 返回首页 |

## 6. 存档兼容方案(重点)

- **键名沿用**:`dungeonDrive_meta` / `dungeonDrive_save` / `dungeonDrive_importedQuestions`(见 `lib/save.ts`)
- **meta 迁移**:旧字段同名读取 + 默认值;新字段(wrongQ/totalCorrect/totalAnswered/maxComboEver)缺省填充 `{}`/0;加载后立即回写
- **run 迁移**:`deck/hand/drawPile/discardPile` 兼容「完整卡对象数组」与「id 字符串」两种旧格式(`cardIds()` 提取 id,渲染时 `hydrateCardList` 重建);`gameOver:true` 视为无存档;`mapNodes` 可达性按 `currentNodeIdx` 重算(`recomputeReachability`)
- **战斗现场补全**:旧版漏存的 enemyBlock/enemyStatus/enemyAtkMult/playerDmgMult/playerDefMult/questionHistory 在新版完整持久化(断点续战不丢)
- **写档时机**:每个 action 末尾显式持久化,与本地版行为一致;新版写档旧版(standalone)仍可读(双向兼容)
- 旧版玩出的存档 → 新版「继续冒险」→ 若存档 `inBattle=true` 直接进战斗屏断点续玩

## 7. 战斗系统(卡牌版,与本地版一致)

回合流程:`question`(答题链,答对 +1 能量 + 连击伤害)→ 答错/「停止答题」→ `enterCardPhase`(energy=答对数,抽 5 张)→ 打牌扣能量执行 fx → `endTurn`(泄能=剩余能量×攻击力、灼烧/中毒结算、敌方攻击)→ `startTurn`。

- 卡牌 5 类 80+ 张:atk/def/heal/control/status,稀有度 c/u/r/l
- fx 效果:dmg(含 hits/pierce/ignoreBlock)、block/selfBlock、healFlat/healPct/lifesteal、energy、mult/defMult/enemyWeak、status(灼烧/麻痹/中毒/睡眠/冰冻/混乱)、draw
- 敌方数值:BST 公式 + 稀有度倍率 + 楼层成长(每层 +12%);传说/幻兽为 BOSS(倍率×2~3)
- 捕获:5 种精灵球按稀有度概率;捕获后 3 选 1 奖励卡或跳过+25金

## 8. 错题本联动(线上版行为)

- **战斗**:答错 `wrongQ[qid]+1`(只增);答对 `delete wrongQ[qid]`(自动清除)
- **考试**:交卷后错题全部 `+1`(**只增不删**,答对不自动清除)
- **错题练习**:答对 `clearWrongQ` 移除 + toast「答对了,已从错题本移除」;答错计数+1

## 9. 验证状态(2026-08-12 更新)

### ✅ 已完成并验证
- [x] Node 升级至 v24.19.0
- [x] `npm run build` 通过(编译 + TS 检查 + 静态生成)
- [x] `npm run dev` 启动正常,首页 200 渲染
- [x] **图标补齐 1010/1010**:原数据仅 1-721 有图标(本地各版本同源,均无 722+);
      722-1010 的 289 只从 Pokemon Showdown gen5 CDN 抓取(`scripts/fetch-icons.mjs`),
      96×96 等比缩放为 40×40 后合并入 pokemon-icons.json(风格与现有 40×30 接近,
      图鉴 object-fit:contain 自适应);抓取产物在 `icons-fetch/`
- [x] **存档兼容自动化测试 27/27 通过**(`node scripts/test-save-runner.mjs`):
     旧 meta 字段迁移与新字段补全、旧 run 卡对象→id 提取、战斗现场缺省值、
     地图可达性重算(含修复 standalone 原版「当前节点 visited 丢失」缺陷)、
     gameOver 视为无档、损坏 JSON 容错

### ⏳ 待人工浏览器验证(dev 模式点玩)
- [ ] 主链路:新冒险→三选一→地图→战斗(答题/出牌/泄能/敌方攻击)→捕获→选卡→商店/营地/事件/宝箱→boss 通关→死亡结算
- [ ] 新功能:学习中心→考试(计时/跳题/标记/交卷,错题入本)→错题本练习(答对移除)→题库只看错题
- [ ] 真实旧存档(纯前端版玩出)→「继续冒险」断点续玩;新版写档旧版仍可读(双向兼容)
- [ ] 抽卡/组牌:不抽重复、12 上限、新开局按 builtDeckIds 构建
- [ ] 边界:重置数据、窗口 resize 地图重绘、移动端宽度
- [ ] 可选:`output:'export'` 纯静态部署

### 已知小问题(非阻塞)
- 设置页重置确认用 `window.confirm`(本地版有自定义确认弹窗,可后续替换为 Modal 的 confirm)
- `settings.diff`(答题限时难度)/BGM 开关未接入(本地版无此功能,按需求未引入)
- 旧版 `gameOverVictory`(通关胜利)不适用 —— 本版为无限层,BOSS 击败进下一层(与本地版一致)

## 10. 参考对照

- 卡牌/战斗逻辑源:`Z:\Files\Games\pokedriver2_standalone\js\battle.js`、`game.js`、`screens.js`、`main.js`
- 在线功能行为源(线上版构建产物分析):考试 100 题/45min/90 分、wrongQ 双写点、错题练习答对移除、初始三选一
- 工程骨架源:`Z:\Files\Games\pokedriver_standalone`(在线版 Next.js 源码)

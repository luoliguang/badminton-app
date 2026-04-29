# 项目联动规则总览

> 这是你的"改动影响地图"。改了 A，这里告诉你必须同步修改 B。

---

## 核心原则

所有联动规则都通过两种机制保障：
1. **TypeScript 类型** — 类型不匹配，编辑器直接报红
2. **共享逻辑函数** — `utils/gameLogic.ts` 里的函数，云函数和前端都引用同一份

---

## 改动影响地图

### 1. 改 `MatchType`（比赛类型）
文件：`miniprogram/types/index.ts` → `MatchType`

| 需要同步修改的地方 | 原因 |
|---|---|
| `MATCH_TYPE_CONFIG` | 配置对象要加新类型的配置 |
| `cloudfunctions/createRoom` | maxPlayers 计算 |
| `cloudfunctions/endMatch` | rankings 数量 |
| `pages/room/index.ts` | PlayerCard 槽位数 |
| `pages/result/index.ts` | 排名列表长度 |
| `components/PlayerCard` | 布局模式（单人 vs 双人） |
| `pages/home/index.ts` | 历史记录卡片图标类型 |

---

### 2. 改 `Ruleset`（赛制规则）
文件：`miniprogram/types/index.ts` → `Ruleset` / `DEFAULT_RULESET`

| 需要同步修改的地方 | 原因 |
|---|---|
| `utils/gameLogic.ts` → `isMatchPoint` | 赛点阈值判断 |
| `utils/gameLogic.ts` → `checkSetWinner` | 终局判断 |
| `utils/gameLogic.ts` → `checkMatchWinner` | 多局制判断 |
| `cloudfunctions/addScore` | 自动调用 gameLogic，**无需改** |
| `pages/score/index.ts` | 赛点高亮触发时机 |

---

### 3. 改 `UserProfile`（用户字段）
文件：`miniprogram/types/index.ts` → `UserProfile`

| 需要同步修改的地方 | 原因 |
|---|---|
| `cloudfunctions/login` | 新用户初始化字段 |
| `cloudfunctions/endMatch` | 更新字段 |
| `cloudfunctions/getStats` | 返回字段 |
| `pages/home/index.ts` | 展示字段 |

---

### 4. 改 `ScoreEvent`（计分事件结构）
文件：`miniprogram/types/index.ts` → `ScoreEvent`

| 需要同步修改的地方 | 原因 |
|---|---|
| `cloudfunctions/addScore` | 写入事件格式 |
| `utils/gameLogic.ts` → `replayScoreEvents` | 重放逻辑 |
| `pages/score/index.ts` | 历史记录渲染 |
| `pages/result/index.ts` | scoreHistory 展示 |

---

### 5. 改 `UserRank` / `RANK_THRESHOLDS`（等级阈值）
文件：`miniprogram/types/index.ts` → `RANK_THRESHOLDS`

| 需要同步修改的地方 | 原因 |
|---|---|
| `utils/gameLogic.ts` → `calcRank` | **自动适配，无需改** |
| `pages/home/index.ts` | 等级标签展示（如果硬编码了颜色） |

---

### 6. 改 `ERROR_CODES`（错误码）
文件：`miniprogram/types/index.ts` → `ERROR_CODES`

| 需要同步修改的地方 | 原因 |
|---|---|
| 所有云函数 | 返回错误码 |
| 所有前端页面 | 错误处理分支 |

> **建议**：前端页面用 `ERROR_CODES.ROOM_NOT_FOUND` 而不是写死数字 `4001`，
> 这样改错误码时只需改 `types/index.ts` 一处。

---

## 文件职责说明

```
miniprogram/
  types/index.ts          ← 唯一数据结构定义，改这里触发全局报错
  utils/gameLogic.ts      ← 唯一业务逻辑实现，云函数和前端共用
  pages/home/             ← 读 getStats 数据，展示用户统计
  pages/room/             ← 调用 createRoom / joinRoom / startMatch
  pages/score/            ← 调用 addScore（循环），监听 match 文档变化
  pages/result/           ← 调用 getMatchResult，展示结算数据
  components/PlayerCard/  ← 接收 RoomPlayer + state 属性，无业务逻辑

cloudfunctions/
  login/                  ← 读写 users 集合
  createRoom/             ← 写 rooms 集合
  joinRoom/               ← 更新 rooms.players[]
  startMatch/             ← 写 matches 集合，更新 rooms.status
  addScore/               ← 追加 matches.scoreEvents[]
  endMatch/               ← 更新 matches + users（联动最广）
  getStats/               ← 只读 users + matches
  getMatchResult/         ← 只读 matches
```

---

## VS Code 推荐插件

安装这些插件后，联动检查全自动化：

| 插件 | 作用 |
|---|---|
| `ESLint` | 代码规范检查 |
| `TypeScript Error Lens` | 类型错误在行内高亮显示 |
| `Todo Tree` | 扫描代码里的 `⚠️` 注释，快速定位联动点 |
| `Path Intellisense` | import 路径自动补全 |

在 `.vscode/settings.json` 里加：
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}

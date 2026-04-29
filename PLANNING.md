# 羽毛球小程序 · 项目规划

## 项目简介
个人羽毛球记录微信小程序，支持多人实时计分、历史记录、战绩统计和球友社区。
使用微信云开发（云函数 + 云数据库），无独立服务器。

---

## 数据库集合（云数据库）

### `users`
```
openid: string          微信唯一标识（由云函数自动获取）
nickName: string
avatarUrl: string
totalGames: number      总场次
winRate: number         胜率 0~1
currentStreak: number   当前连胜
rank: string            新手/铜牌/银牌/黄金/铂金/钻石
createdAt: Date
```

### `rooms`
```
code: string            6位数字口令
hostOpenid: string
matchType: string       singles/doubles/team
ruleset: object         { pointsToWin, deuceEnabled, setsToWin }
status: string          waiting/in_progress/finished
players: array          RoomPlayer 对象数组
maxPlayers: number      2 或 4（由 matchType 决定）
createdAt: Date
```

### `matches`
```
roomId: string
matchType: string
ruleset: object
status: string          in_progress/settling/finished
scoreEvents: array      计分事件流（只追加）
currentScore: object    { A, B, setNumber } 快照
players: array          玩家快照
winner: string          'A' 或 'B'
stats: object           比赛统计数据
startAt: Date
endAt: Date
```

### `posts`（Phase 2）
```
openid: string
nickName: string        冗余存储，避免 JOIN
avatarUrl: string       冗余存储
content: string
mediaFileIds: array     云存储 fileID
tags: array
likeCount: number
createdAt: Date
```

---

## 云函数清单

| 函数名 | 入参 | 出参 | 触发时机 |
|---|---|---|---|
| `login` | 无 | UserProfile, isNewUser | 小程序启动 |
| `getStats` | 无 | profile, heatmap[], recentMatches[] | 首页加载 |
| `createRoom` | matchType, ruleset? | Room, shareCode | 点击"创建房间" |
| `joinRoom` | code, team | Room | 输入口令加入 |
| `startMatch` | roomId | matchId, Match | 房主点开始 |
| `addScore` | matchId, team, delta | currentScore, isMatchPoint, shouldEnd | 计分台每次点击 |
| `endMatch` | matchId, forceWinner? | Match含stats | 赛点自动/手动结束 |
| `getMatchResult` | matchId | rankings[], scoreHistory[], stats | 结算页加载 |

---

## 页面清单（MVP Phase 1）

### `pages/home` — 首页
- 展示：胜率大数字卡、总场次、连胜、热力图
- 按钮：创建比赛房间、口令加入、扫码加入
- 列表：最近 5 场对局（MatchHistoryItem 组件）
- 调用：`getStats`
- 监听：无

### `pages/room` — 创建/加入房间
- 功能：选择比赛类型（单打/双打/团队）、设置赛制
- 展示：玩家列表（PlayerCard 组件，最多 4 槽位）
- 按钮：开始比赛（仅房主可见）
- 调用：`createRoom` / `joinRoom` / `startMatch`
- 监听：`rooms` 文档（实时刷新玩家列表）

### `pages/score` — 实时计分台
- 展示：双方比分大数字、本局历史记录
- 按钮：左右各一个加分按钮、撤销按钮
- 赛点：到达赛点时高亮提示
- 调用：`addScore`（每次点击）、`endMatch`（自动触发）
- 监听：`matches` 文档（实时同步所有玩家屏幕）

### `pages/result` — 结算页
- 展示：排名列表（PlayerCard）、比赛时长、趣味奖励
- 展示：全场MVP、最长回合、补水协议
- 按钮：返回首页
- 调用：`getMatchResult`
- 监听：无

---

## 组件清单

### `PlayerCard`
Props: `player(RoomPlayer)`, `state('host'|'ready'|'empty')`, `matchType`
用途: 房间等待页 + 结算排名页复用
联动: matchType=doubles 时显示双人布局

### `ScoreBoard`
Props: `scoreA(number)`, `scoreB(number)`, `setNumber(number)`, `isMatchPoint(bool)`
用途: 计分台核心显示区

### `MatchHistoryItem`
Props: `match(object)`, `result('win'|'lose')`
用途: 首页最近对局列表

---

## 开发阶段计划

### Phase 1（MVP）— 当前目标
- [x] 项目结构搭建（types + gameLogic）
- [ ] `login` 云函数 + app.ts 初始化
- [ ] `pages/home` 首页框架
- [ ] `createRoom` + `joinRoom` 云函数
- [ ] `pages/room` 房间页
- [ ] `startMatch` 云函数
- [ ] `addScore` + `endMatch` 云函数
- [ ] `pages/score` 计分台
- [ ] `getMatchResult` 云函数
- [ ] `pages/result` 结算页
- [ ] `getStats` 云函数
- [ ] 首页数据对接

### Phase 2（统计增强）
- [ ] 热力图真实数据
- [ ] 历史记录完整列表页
- [ ] 个人战绩详情

### Phase 3（社区）
- [ ] 球友动态流
- [ ] 发布动态

---

## 关键设计决策

**为什么用事件溯源存计分？**
`scoreEvents` 只追加，撤销通过追加 `delta=-1` 实现。
好处：完整历史可回放、天然支持撤销、结算时可重建任意时刻的比分。

**为什么 gameLogic.ts 要云函数和前端共用？**
计分判断逻辑（赛点、终局）如果各自实现，改赛制时需要改两处，容易不一致。
共用一份确保"前端预判"和"云函数裁定"结果完全一致。

**为什么 nickName/avatarUrl 要冗余存储？**
云数据库不支持 JOIN 查询。在 `rooms.players[]` 里冗余存用户名和头像，
避免展示玩家列表时还要再查一次 `users` 集合。

**实时同步怎么做？**
用微信云数据库的 `watch()` API 监听 `matches` 文档变化。
所有玩家订阅同一个 matchId，任何人加分 → 云端写入 → 所有人收到推送 → 界面刷新。
不需要自建 WebSocket 服务器。

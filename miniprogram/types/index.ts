// ============================================================
// 核心类型定义 — 整个项目的"单一真相来源"
//
// 【联动规则说明】
// 改这里的任何类型 → TypeScript 在所有引用处自动报红
// → 你立刻知道哪些文件需要同步修改，不会有遗漏
// ============================================================

// ── 比赛类型 ─────────────────────────────────────────────────
// ⚠️  改这里会同步影响:
//   cloudfunctions/createRoom  → maxPlayers 计算
//   cloudfunctions/addScore    → 队伍数量校验
//   cloudfunctions/endMatch    → rankings 数量
//   pages/room                 → PlayerCard 槽位数
//   pages/result               → 排名列表长度
//   components/PlayerCard      → 布局模式
//   pages/home                 → 历史记录图标
export type MatchType = 'singles' | 'doubles' | 'team'

export const MATCH_TYPE_CONFIG: Record<MatchType, {
  label: string
  maxPlayers: 2 | 4
  teamSize: 1 | 2
}> = {
  singles: { label: '单打', maxPlayers: 2, teamSize: 1 },
  doubles: { label: '双打', maxPlayers: 4, teamSize: 2 },
  team:    { label: '团队', maxPlayers: 4, teamSize: 2 },
}

// ── 赛制规则 ─────────────────────────────────────────────────
// ⚠️  改这里会同步影响:
//   cloudfunctions/addScore → pointsToWin 赛点阈值
//   cloudfunctions/addScore → setsToWin 终局判断
//   cloudfunctions/endMatch → 胜负结算逻辑
//   pages/score             → 赛点高亮触发时机
export interface Ruleset {
  pointsToWin: 11 | 15 | 21
  deuceEnabled: boolean
  setsToWin: 1 | 2 | 3
}

export const DEFAULT_RULESET: Ruleset = {
  pointsToWin: 21,
  deuceEnabled: true,
  setsToWin: 2,
}

// ── 用户 ─────────────────────────────────────────────────────
// ⚠️  改这里会同步影响:
//   cloudfunctions/login    → 新用户初始化字段
//   cloudfunctions/endMatch → winRate/rank 更新逻辑
//   cloudfunctions/getStats → 返回字段
//   pages/home              → 胜率卡、等级标签显示
export type UserRank = '新手' | '铜牌' | '银牌' | '黄金' | '铂金' | '钻石'

export interface UserProfile {
  _id?: string
  openid: string
  nickName: string
  avatarUrl: string
  totalGames: number
  winRate: number           // 0~1，显示时 ×100 转百分比
  currentStreak: number
  rank: UserRank
  createdAt?: Date
}

// 等级阈值配置 — 改这里会影响 endMatch 里的 rank 计算
export const RANK_THRESHOLDS: Record<UserRank, number> = {
  '新手': 0,
  '铜牌': 0.3,
  '银牌': 0.45,
  '黄金': 0.55,
  '铂金': 0.65,
  '钻石': 0.75,
}

// ── 队伍标识 ─────────────────────────────────────────────────
export type Team = 'A' | 'B'

// ── 房间玩家快照 ─────────────────────────────────────────────
// 发布时冗余存储 nickName/avatarUrl，避免跨集合查询
export interface RoomPlayer {
  openid: string
  nickName: string
  avatarUrl: string
  team: Team
  isHost: boolean
  isReady: boolean
}

// ── 房间 ─────────────────────────────────────────────────────
// ⚠️  改 RoomStatus 会影响:
//   cloudfunctions/joinRoom    → status=waiting 校验
//   cloudfunctions/startMatch  → status 状态机转换
export type RoomStatus = 'waiting' | 'in_progress' | 'finished'

export interface Room {
  _id?: string
  code: string              // 6位数字口令
  hostOpenid: string
  matchType: MatchType
  ruleset: Ruleset
  status: RoomStatus
  players: RoomPlayer[]
  maxPlayers: 2 | 4         // 由 MATCH_TYPE_CONFIG[matchType].maxPlayers 决定
  createdAt?: Date
}

// ── 计分事件（事件溯源）─────────────────────────────────────
// 只追加，不修改。撤销 = 追加 delta=-1
// ⚠️  改这里会影响:
//   cloudfunctions/addScore    → 事件写入格式
//   cloudfunctions/endMatch    → 事件重放计算
//   pages/score                → 历史记录列表渲染
//   pages/result               → scoreHistory 展示
export interface ScoreEvent {
  team: Team
  delta: 1 | -1
  snapA: number             // 事件发生后 A 队实时分数
  snapB: number             // 事件发生后 B 队实时分数
  byOpenid: string
  ts: Date
}

// ── 当前比分快照 ─────────────────────────────────────────────
export interface Score {
  A: number
  B: number
  setNumber: number         // 当前第几局（1-based）
}

// ── 比赛 ─────────────────────────────────────────────────────
export type MatchStatus = 'in_progress' | 'settling' | 'finished'

export interface MatchStats {
  durationSeconds: number
  longestRally: number
  maxSpeedKmh?: number
  mvpOpenid: string
  funRewards: Record<string, string>  // 可扩展，不需要改类型
}

export interface Match {
  _id?: string
  roomId: string
  matchType: MatchType
  ruleset: Ruleset
  status: MatchStatus
  scoreEvents: ScoreEvent[]
  currentScore: Score
  players: RoomPlayer[]
  winner?: Team
  stats?: MatchStats
  startAt: Date
  endAt?: Date
}

// ── 结算排名 ─────────────────────────────────────────────────
// ⚠️  length 由 matchType 决定：singles=2，doubles/team=4
export interface RankingItem {
  rank: 1 | 2 | 3 | 4
  openid: string
  nickName: string
  avatarUrl: string
  team: Team
  score: number
}

// ── 云函数统一响应格式 ───────────────────────────────────────
export interface CloudResult<T = unknown> {
  code: number
  message: string
  data: T | null
}

// ── 云函数入参类型（前端调用时有类型提示）───────────────────
export interface CreateRoomParams {
  matchType: MatchType
  ruleset?: Partial<Ruleset>
}

export interface JoinRoomParams {
  code: string
  team: Team
}

export interface StartMatchParams {
  roomId: string
}

export interface AddScoreParams {
  matchId: string
  team: Team
  delta: 1 | -1
}

export interface EndMatchParams {
  matchId: string
  forceWinner?: Team
}

export interface GetMatchResultParams {
  matchId: string
}

// ── 错误码（集中管理，改这里全局生效）──────────────────────
export const ERROR_CODES = {
  ROOM_NOT_FOUND:   4001,
  ROOM_FULL:        4002,
  ALREADY_STARTED:  4003,
  NOT_HOST:         4004,
  MATCH_NOT_FOUND:  4005,
  ALREADY_FINISHED: 4006,
  SERVER_ERROR:     5000,
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

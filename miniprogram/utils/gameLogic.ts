// ============================================================
// 核心业务逻辑 — 所有涉及联动的计算都在这里统一实现
//
// 【原则】
// 云函数和前端页面都 import 这里，不各自实现
// 改一次，所有地方同步生效
// ============================================================

import {
  MatchType, Ruleset, Score, ScoreEvent, Team,
  UserRank, MATCH_TYPE_CONFIG, RANK_THRESHOLDS,
  DEFAULT_RULESET, RankingItem, RoomPlayer
} from '../types/index'

// ── 比赛类型相关 ─────────────────────────────────────────────

/** 根据比赛类型获取最大玩家数 */
export function getMaxPlayers(matchType: MatchType): 2 | 4 {
  return MATCH_TYPE_CONFIG[matchType].maxPlayers
}

/** 根据比赛类型获取排名列表长度 */
export function getRankingsCount(matchType: MatchType): 2 | 4 {
  return MATCH_TYPE_CONFIG[matchType].maxPlayers
}

// ── 赛制计算（这里是所有计分逻辑的唯一来源）─────────────────

/**
 * 计算加分后的新比分
 * 云函数 addScore 和前端本地预测都调用这个
 */
export function calcNewScore(
  current: Score,
  team: Team,
  delta: 1 | -1
): Score {
  return {
    ...current,
    A: team === 'A' ? Math.max(0, current.A + delta) : current.A,
    B: team === 'B' ? Math.max(0, current.B + delta) : current.B,
  }
}

/**
 * 判断当前分数是否到达赛点
 * ⚠️  依赖 ruleset.pointsToWin — 改赛制这里自动适配
 */
export function isMatchPoint(score: Score, ruleset: Ruleset): boolean {
  const { pointsToWin, deuceEnabled } = ruleset
  const threshold = pointsToWin - 1

  if (deuceEnabled) {
    // 平分规则：双方都到达 pointsToWin-1 时，需要领先 2 分
    const both = score.A >= threshold && score.B >= threshold
    if (both) return false  // 平分状态，赛点还没到
  }

  return score.A >= threshold || score.B >= threshold
}

/**
 * 判断当前局是否结束，并返回赢家
 * ⚠️  依赖 ruleset.pointsToWin 和 deuceEnabled
 */
export function checkSetWinner(score: Score, ruleset: Ruleset): Team | null {
  const { pointsToWin, deuceEnabled } = ruleset

  if (deuceEnabled) {
    // 平分规则：需要领先 2 分
    if (score.A >= pointsToWin && score.A - score.B >= 2) return 'A'
    if (score.B >= pointsToWin && score.B - score.A >= 2) return 'B'
    return null
  }

  if (score.A >= pointsToWin) return 'A'
  if (score.B >= pointsToWin) return 'B'
  return null
}

/**
 * 从事件流重建当前完整比分（用于结算页回放、审计）
 * ⚠️  ScoreEvent 结构改变这里需要同步
 */
export function replayScoreEvents(events: ScoreEvent[]): Score {
  if (events.length === 0) return { A: 0, B: 0, setNumber: 1 }
  const last = events[events.length - 1]
  return { A: last.snapA, B: last.snapB, setNumber: 1 }
}

/**
 * 判断比赛是否应该结束
 * ⚠️  依赖 ruleset.setsToWin — 改局数设置自动适配
 */
export function checkMatchWinner(
  setScores: Array<{ winner: Team }>,
  ruleset: Ruleset
): Team | null {
  const { setsToWin } = ruleset
  const winsA = setScores.filter(s => s.winner === 'A').length
  const winsB = setScores.filter(s => s.winner === 'B').length
  if (winsA >= setsToWin) return 'A'
  if (winsB >= setsToWin) return 'B'
  return null
}

// ── 用户等级计算 ─────────────────────────────────────────────

/**
 * 根据胜率计算用户等级
 * ⚠️  RANK_THRESHOLDS 改变这里自动适配
 *    云函数 endMatch 调用此函数更新 rank
 */
export function calcRank(winRate: number): UserRank {
  const ranks = Object.entries(RANK_THRESHOLDS)
    .sort(([, a], [, b]) => b - a) as [UserRank, number][]
  for (const [rank, threshold] of ranks) {
    if (winRate >= threshold) return rank
  }
  return '新手'
}

/**
 * 更新胜率（增量计算，避免重新统计全部记录）
 */
export function calcNewWinRate(
  current: { totalGames: number; winRate: number },
  isWin: boolean
): { totalGames: number; winRate: number; rank: UserRank } {
  const totalGames = current.totalGames + 1
  const totalWins = Math.round(current.winRate * current.totalGames) + (isWin ? 1 : 0)
  const winRate = totalWins / totalGames
  return { totalGames, winRate, rank: calcRank(winRate) }
}

// ── 结算数据生成 ─────────────────────────────────────────────

/**
 * 生成结算页排名列表
 * ⚠️  matchType 改变时，返回长度自动变为 2 或 4
 */
export function buildRankings(
  players: RoomPlayer[],
  winner: Team
): RankingItem[] {
  const winners = players.filter(p => p.team === winner)
  const losers  = players.filter(p => p.team !== winner)

  const items: RankingItem[] = []
  winners.forEach((p, i) => items.push({
    rank: (i + 1) as 1 | 2,
    openid: p.openid,
    nickName: p.nickName,
    avatarUrl: p.avatarUrl,
    team: p.team,
    score: 0,
  }))
  losers.forEach((p, i) => items.push({
    rank: (winners.length + i + 1) as 1 | 2 | 3 | 4,
    openid: p.openid,
    nickName: p.nickName,
    avatarUrl: p.avatarUrl,
    team: p.team,
    score: 0,
  }))
  return items
}

/**
 * 生成趣味奖励（可扩展，加新奖励不影响其他逻辑）
 */
export function buildFunRewards(
  players: RoomPlayer[],
  events: ScoreEvent[],
  winner: Team
): Record<string, string> {
  const loserPlayers = players.filter(p => p.team !== winner)
  const loserName = loserPlayers[0]?.nickName ?? '败方'
  const winnerPlayers = players.filter(p => p.team === winner)
  const winnerName = winnerPlayers[0]?.nickName ?? '胜方'

  return {
    '补水协议': `${loserName} 请 ${winnerName} 喝一瓶运动饮料`,
    '总得分数': `${events.filter(e => e.delta === 1).length} 分`,
    '撤销次数': `${events.filter(e => e.delta === -1).length} 次`,
  }
}

// ── 房间口令生成 ─────────────────────────────────────────────

/** 生成 6 位随机数字口令 */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ── 格式化工具 ───────────────────────────────────────────────

/** 比赛时长格式化：秒 → "42 分钟" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  return `${minutes} 分钟`
}

/** 胜率格式化：0.74 → "74%" */
export function formatWinRate(winRate: number): string {
  return `${Math.round(winRate * 100)}%`
}

/** 比分格式化 → "21-18, 21-15" */
export function formatScore(events: ScoreEvent[]): string {
  if (events.length === 0) return '-'
  const last = events[events.length - 1]
  return `${last.snapA}-${last.snapB}`
}

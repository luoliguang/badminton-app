// miniprogram/utils/gameLogic.js
const MATCH_TYPE_CONFIG = {
  singles: { label: '单打', maxPlayers: 2, teamSize: 1 },
  doubles: { label: '双打', maxPlayers: 4, teamSize: 2 },
  team: { label: '团队', maxPlayers: 4, teamSize: 2 },
}

const DEFAULT_RULESET = {
  pointsToWin: 21,
  deuceEnabled: true,
  setsToWin: 2,
}

const RANK_THRESHOLDS = {
  '新手': 0,
  '铜牌': 0.3,
  '银牌': 0.45,
  '黄金': 0.55,
  '铂金': 0.65,
  '钻石': 0.75,
}

function getMaxPlayers(matchType) {
  return MATCH_TYPE_CONFIG[matchType].maxPlayers
}

function getRankingsCount(matchType) {
  return MATCH_TYPE_CONFIG[matchType].maxPlayers
}

function calcNewScore(current, team, delta) {
  return {
    ...current,
    A: team === 'A' ? Math.max(0, current.A + delta) : current.A,
    B: team === 'B' ? Math.max(0, current.B + delta) : current.B,
  }
}

function isMatchPoint(score, ruleset) {
  const { pointsToWin, deuceEnabled } = ruleset
  const threshold = pointsToWin - 1

  if (deuceEnabled) {
    const both = score.A >= threshold && score.B >= threshold
    if (both) return false
  }

  return score.A >= threshold || score.B >= threshold
}

function checkSetWinner(score, ruleset) {
  const { pointsToWin, deuceEnabled } = ruleset

  if (deuceEnabled) {
    if (score.A >= pointsToWin && score.A - score.B >= 2) return 'A'
    if (score.B >= pointsToWin && score.B - score.A >= 2) return 'B'
    return null
  }

  if (score.A >= pointsToWin) return 'A'
  if (score.B >= pointsToWin) return 'B'
  return null
}

function replayScoreEvents(events) {
  if (!events || events.length === 0) return { A: 0, B: 0, setNumber: 1 }
  const last = events[events.length - 1]
  return { A: last.snapA, B: last.snapB, setNumber: 1 }
}

function checkMatchWinner(setScores, ruleset) {
  const { setsToWin } = ruleset
  const winsA = setScores.filter(s => s.winner === 'A').length
  const winsB = setScores.filter(s => s.winner === 'B').length
  if (winsA >= setsToWin) return 'A'
  if (winsB >= setsToWin) return 'B'
  return null
}

function calcRank(winRate) {
  const ranks = Object.entries(RANK_THRESHOLDS).sort(([, a], [, b]) => b - a)
  for (const [rank, threshold] of ranks) {
    if (winRate >= threshold) return rank
  }
  return '新手'
}

function calcNewWinRate(current, isWin) {
  const totalGames = current.totalGames + 1
  const totalWins = Math.round(current.winRate * current.totalGames) + (isWin ? 1 : 0)
  const winRate = totalWins / totalGames
  return { totalGames, winRate, rank: calcRank(winRate) }
}

function buildRankings(players, winner) {
  const winners = players.filter(p => p.team === winner)
  const losers = players.filter(p => p.team !== winner)

  const items = []
  winners.forEach((p, i) => items.push({
    rank: i + 1,
    openid: p.openid,
    nickName: p.nickName,
    avatarUrl: p.avatarUrl,
    team: p.team,
    score: 0,
  }))
  losers.forEach((p, i) => items.push({
    rank: winners.length + i + 1,
    openid: p.openid,
    nickName: p.nickName,
    avatarUrl: p.avatarUrl,
    team: p.team,
    score: 0,
  }))
  return items
}

function buildFunRewards(players, events, winner, ruleset) {
  const pointsToWin = (ruleset && ruleset.pointsToWin) || 21
  const loserTeam = winner === 'A' ? 'B' : 'A'
  const winnerPlayers = players.filter(p => p.team === winner)
  const loserPlayers = players.filter(p => p.team !== winner)
  const pointEvents = events.filter(e => e.delta === 1)

  const getName = (openid) => {
    const p = players.find(p => p.openid === openid)
    return p ? p.nickName : '未知'
  }

  const rewards = {}

  // ── 胜方称号 ────────────────────────────────────────────

  // 今日霸主：胜方代表
  if (winnerPlayers.length > 0) {
    rewards['🏆 今日霸主'] = winnerPlayers[0].nickName
  }

  // 连得王：最长连续得分段
  let maxStreakLen = 0, maxStreakTeam = null, curTeam = null, curLen = 0
  for (const e of pointEvents) {
    curLen = e.team === curTeam ? curLen + 1 : 1
    curTeam = e.team
    if (curLen > maxStreakLen) { maxStreakLen = curLen; maxStreakTeam = curTeam }
  }
  if (maxStreakLen >= 3) {
    const streakOwner = maxStreakTeam === winner
      ? (winnerPlayers[0] && winnerPlayers[0].nickName) || '胜方'
      : (loserPlayers[0] && loserPlayers[0].nickName) || '败方'
    rewards['🔥 连得王'] = `${streakOwner}（${maxStreakLen}连分）`
  }

  // 最快终结：胜方得分效率（胜方得分 / 总得分）≥ 55%
  const totalPts = pointEvents.length
  const winnerPts = pointEvents.filter(e => e.team === winner).length
  if (winnerPlayers.length > 0 && totalPts > 0 && winnerPts / totalPts >= 0.55) {
    rewards['⚡ 最快终结'] = `${winnerPlayers[0].nickName}（得分率${Math.round(winnerPts / totalPts * 100)}%）`
  }

  // 稳如泰山：胜方最大领先分差 ≥ 5
  let maxLead = 0
  for (const e of pointEvents) {
    const lead = winner === 'A' ? e.snapA - e.snapB : e.snapB - e.snapA
    if (lead > maxLead) maxLead = lead
  }
  if (maxLead >= 5 && winnerPlayers.length > 0) {
    rewards['🪨 稳如泰山'] = `${winnerPlayers[0].nickName}（最大领先${maxLead}分）`
  }

  // ── 败方称号 ────────────────────────────────────────────

  // 越战越勇：败方最长连续追分段 ≥ 3
  let maxChase = 0, curChase = 0
  for (const e of pointEvents) {
    curChase = e.team === loserTeam ? curChase + 1 : 0
    if (curChase > maxChase) maxChase = curChase
  }
  if (maxChase >= 3 && loserPlayers.length > 0) {
    rewards['⚔️ 越战越勇'] = `${loserPlayers[0].nickName}（最长追${maxChase}分）`
  }

  // 赛点逃生：败方曾到达赛点分数线（但最终未赢）
  const loserHadMatchPoint = events.some(e => {
    const s = loserTeam === 'A' ? e.snapA : e.snapB
    return s >= pointsToWin - 1
  })
  if (loserHadMatchPoint && loserPlayers.length > 0) {
    rewards['🛡️ 赛点逃生'] = `${loserPlayers[0].nickName}（曾逼近赛点）`
  }

  // 坚持到底：兜底——败方未获得任何称号时给予
  if (!rewards['⚔️ 越战越勇'] && !rewards['🛡️ 赛点逃生'] && loserPlayers.length > 0) {
    rewards['💪 坚持到底'] = loserPlayers[0].nickName
  }

  // ── 全场唯一（无关胜负）────────────────────────────────

  // 最后一击：最后一个 delta=1 的操作者
  const lastPoint = pointEvents[pointEvents.length - 1]
  if (lastPoint && lastPoint.byOpenid) {
    rewards['🦅 最后一击'] = getName(lastPoint.byOpenid)
  }

  // 运气王：撤销次数最多的玩家
  const undoCounts = {}
  events.filter(e => e.delta === -1).forEach(e => {
    if (e.byOpenid) undoCounts[e.byOpenid] = (undoCounts[e.byOpenid] || 0) + 1
  })
  const undoTop = Object.entries(undoCounts).sort(([, a], [, b]) => b - a)[0]
  if (undoTop && undoTop[1] > 0) {
    rewards['🎲 运气王'] = `${getName(undoTop[0])}（${undoTop[1]}次撤销）`
  }

  // ── 补水协议（固定生成）────────────────────────────────
  const loserName = (loserPlayers[0] && loserPlayers[0].nickName) || '败方'
  const winnerName = (winnerPlayers[0] && winnerPlayers[0].nickName) || '胜方'
  rewards['💧 补水官'] = `${loserName} 请 ${winnerName} 喝运动饮料`

  return rewards
}

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  return `${minutes} 分钟`
}

function formatWinRate(winRate) {
  return `${Math.round(winRate * 100)}%`
}

function formatScore(events) {
  if (!events || events.length === 0) return '-'
  const last = events[events.length - 1]
  return `${last.snapA}-${last.snapB}`
}

module.exports = {
  MATCH_TYPE_CONFIG,
  DEFAULT_RULESET,
  RANK_THRESHOLDS,
  getMaxPlayers,
  getRankingsCount,
  calcNewScore,
  isMatchPoint,
  checkSetWinner,
  replayScoreEvents,
  checkMatchWinner,
  calcRank,
  calcNewWinRate,
  buildRankings,
  buildFunRewards,
  generateRoomCode,
  formatDuration,
  formatWinRate,
  formatScore,
}

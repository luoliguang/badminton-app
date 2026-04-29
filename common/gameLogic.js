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
  winners.forEach((p, i) => items.push({ rank: i + 1, openid: p.openid, nickName: p.nickName, avatarUrl: p.avatarUrl, team: p.team, score: 0 }))
  losers.forEach((p, i) => items.push({ rank: winners.length + i + 1, openid: p.openid, nickName: p.nickName, avatarUrl: p.avatarUrl, team: p.team, score: 0 }))
  return items
}

function buildFunRewards(players, events, winner) {
  const loserPlayers = players.filter(p => p.team !== winner)
  const loserName = loserPlayers[0] && loserPlayers[0].nickName ? loserPlayers[0].nickName : '败方'
  const winnerPlayers = players.filter(p => p.team === winner)
  const winnerName = winnerPlayers[0] && winnerPlayers[0].nickName ? winnerPlayers[0].nickName : '胜方'
  return {
    '补水协议': `${loserName} 请 ${winnerName} 喝一瓶运动饮料`,
    '总得分数': `${events.filter(e => e.delta === 1).length} 分`,
    '撤销次数': `${events.filter(e => e.delta === -1).length} 次`,
  }
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

module.exports = {
  MATCH_TYPE_CONFIG,
  DEFAULT_RULESET,
  RANK_THRESHOLDS,
  getMaxPlayers,
  calcNewScore,
  isMatchPoint,
  checkSetWinner,
  calcRank,
  calcNewWinRate,
  buildRankings,
  buildFunRewards,
  generateRoomCode,
  formatDuration,
  formatWinRate,
}

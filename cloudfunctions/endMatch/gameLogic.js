function calcRank(winRate) {
  if (winRate >= 0.75) return '钻石'
  if (winRate >= 0.65) return '铂金'
  if (winRate >= 0.55) return '黄金'
  if (winRate >= 0.45) return '银牌'
  if (winRate >= 0.3) return '铜牌'
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

  if (winnerPlayers.length > 0) {
    rewards['🏆 今日霸主'] = winnerPlayers[0].nickName
  }

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

  const totalPts = pointEvents.length
  const winnerPts = pointEvents.filter(e => e.team === winner).length
  if (winnerPlayers.length > 0 && totalPts > 0 && winnerPts / totalPts >= 0.55) {
    rewards['⚡ 最快终结'] = `${winnerPlayers[0].nickName}（得分率${Math.round(winnerPts / totalPts * 100)}%）`
  }

  let maxLead = 0
  for (const e of pointEvents) {
    const lead = winner === 'A' ? e.snapA - e.snapB : e.snapB - e.snapA
    if (lead > maxLead) maxLead = lead
  }
  if (maxLead >= 5 && winnerPlayers.length > 0) {
    rewards['🪨 稳如泰山'] = `${winnerPlayers[0].nickName}（最大领先${maxLead}分）`
  }

  let maxChase = 0, curChase = 0
  for (const e of pointEvents) {
    curChase = e.team === loserTeam ? curChase + 1 : 0
    if (curChase > maxChase) maxChase = curChase
  }
  if (maxChase >= 3 && loserPlayers.length > 0) {
    rewards['⚔️ 越战越勇'] = `${loserPlayers[0].nickName}（最长追${maxChase}分）`
  }

  const loserHadMatchPoint = events.some(e => {
    const s = loserTeam === 'A' ? e.snapA : e.snapB
    return s >= pointsToWin - 1
  })
  if (loserHadMatchPoint && loserPlayers.length > 0) {
    rewards['🛡️ 赛点逃生'] = `${loserPlayers[0].nickName}（曾逼近赛点）`
  }

  if (!rewards['⚔️ 越战越勇'] && !rewards['🛡️ 赛点逃生'] && loserPlayers.length > 0) {
    rewards['💪 坚持到底'] = loserPlayers[0].nickName
  }

  const lastPoint = pointEvents[pointEvents.length - 1]
  if (lastPoint && lastPoint.byOpenid) {
    rewards['🦅 最后一击'] = getName(lastPoint.byOpenid)
  }

  const undoCounts = {}
  events.filter(e => e.delta === -1).forEach(e => {
    if (e.byOpenid) undoCounts[e.byOpenid] = (undoCounts[e.byOpenid] || 0) + 1
  })
  const undoTop = Object.entries(undoCounts).sort(([, a], [, b]) => b - a)[0]
  if (undoTop && undoTop[1] > 0) {
    rewards['🎲 运气王'] = `${getName(undoTop[0])}（${undoTop[1]}次撤销）`
  }

  const loserName = (loserPlayers[0] && loserPlayers[0].nickName) || '败方'
  const winnerName = (winnerPlayers[0] && winnerPlayers[0].nickName) || '胜方'
  rewards['💧 补水官'] = `${loserName} 请 ${winnerName} 喝运动饮料`

  return rewards
}

module.exports = { calcRank, calcNewWinRate, buildRankings, buildFunRewards }

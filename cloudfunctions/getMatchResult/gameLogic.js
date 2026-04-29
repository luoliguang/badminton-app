function buildRankings(players, winner) {
  const winners = players.filter(p => p.team === winner)
  const losers = players.filter(p => p.team !== winner)
  const items = []
  winners.forEach((p, i) => items.push({ rank: i + 1, openid: p.openid, nickName: p.nickName, avatarUrl: p.avatarUrl, team: p.team, score: 0 }))
  losers.forEach((p, i) => items.push({ rank: winners.length + i + 1, openid: p.openid, nickName: p.nickName, avatarUrl: p.avatarUrl, team: p.team, score: 0 }))
  return items
}

module.exports = { buildRankings }

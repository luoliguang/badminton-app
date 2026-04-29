// cloudfunctions/endMatch/index.js
//
// ⚠️  联动最广的云函数，执行后影响：
//   1. match.status → finished
//   2. users.winRate / rank / totalGames / currentStreak → 首页 getStats 自动反映
//   3. match.stats → 结算页 getMatchResult 读取

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const {
  calcNewWinRate,
  buildRankings,
  buildFunRewards,
} = require('./gameLogic')

const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 4000,
  MATCH_NOT_FOUND: 4012,
  NO_WINNER: 4013,
  SERVER_ERROR: 5000,
}

exports.main = async (event, context) => {
  const { matchId, forceWinner } = event

  try {
    const matchDoc = await db.collection('matches').doc(matchId).get()
    const match = matchDoc.data
    if (!match) return { code: 4005, message: '比赛不存在', data: null }

    const winner = forceWinner || match.winner || (match.currentScore?.A > match.currentScore?.B ? 'A' : match.currentScore?.B > match.currentScore?.A ? 'B' : null)
    if (!winner) return { code: 4000, message: '未能确定胜者', data: null }

    const events = match.scoreEvents || []
    const endAt = new Date()
    const durationSeconds = Math.round(
      (endAt.getTime() - new Date(match.startAt).getTime()) / 1000
    )

    // ── 计算统计数据 ─────────────────────────────────────────
    const longestRally = calcLongestRally(events)
    const mvpOpenid = calcMVP(match.players, events, winner)
    const funRewards = buildFunRewards(match.players, events, winner, match.ruleset)

    const stats = {
      durationSeconds,
      longestRally,
      mvpOpenid,
      funRewards,
    }

    // ── 更新 match 文档 ──────────────────────────────────────
    await db.collection('matches').doc(matchId).update({
      data: { status: 'finished', winner, stats, endAt }
    })

    // ── 批量更新所有参与者的用户数据 ─────────────────────────
    // ⚠️  UserProfile 字段改变 → calcNewWinRate 和这里需要同步
    const updatePromises = match.players.map(async (player) => {
      const isWin = player.team === winner
      const userDoc = await db.collection('users')
        .where({ openid: player.openid }).get()

      if (userDoc.data.length === 0) return

      const user = userDoc.data[0]
      const updated = calcNewWinRate(
        { totalGames: user.totalGames, winRate: user.winRate },
        isWin
      )

      return db.collection('users').doc(user._id).update({
        data: {
          totalGames: updated.totalGames,
          winRate: updated.winRate,
          rank: updated.rank,
          currentStreak: isWin ? _.inc(1) : 0,
        }
      })
    })

    await Promise.all(updatePromises)

    // ── 返回结算数据 ─────────────────────────────────────────
    const rankings = buildRankings(match.players, winner)

    return {
      code: 0,
      message: 'ok',
      data: { matchId, winner, stats, rankings }
    }

  } catch (err) {
    console.error('endMatch error:', err)
    return { code: 5000, message: err.message, data: null }
  }
}

// ── 内部辅助函数 ─────────────────────────────────────────────

function calcLongestRally(events) {
  // 简化实现：连续同队得分之间的间隔作为回合数
  return Math.max(1, Math.floor(events.length / 4))
}

function calcMVP(players, events, winner) {
  // 胜队中得分最多的玩家
  const winnerPlayers = players.filter(p => p.team === winner)
  if (winnerPlayers.length === 0) return ''
  // 单打直接返回唯一玩家
  if (winnerPlayers.length === 1) return winnerPlayers[0].openid
  // 双打：返回第一个（完整实现可以统计各自得分）
  return winnerPlayers[0].openid
}

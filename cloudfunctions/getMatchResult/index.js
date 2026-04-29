// cloudfunctions/getMatchResult/index.js
// 依赖 types/index.ts: Match, RankingItem, ERROR_CODES
// 调用 gameLogic: buildRankings

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const {
  buildRankings,
} = require('./gameLogic')

const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 4000,
  MATCH_NOT_FOUND: 4012,
  SERVER_ERROR: 5000,
}

function buildScoreHistory(events) {
  return (events || []).map(item => ({
    team: item.team,
    delta: item.delta,
    snapA: item.snapA,
    snapB: item.snapB,
    byOpenid: item.byOpenid,
    ts: item.ts,
  }))
}

exports.main = async (event, context) => {
  const { matchId } = event || {}

  try {
    if (!matchId) {
      return { code: ERROR_CODES.SERVER_ERROR, message: 'matchId 不能为空', data: null }
    }

    const matchDoc = await db.collection('matches').doc(matchId).get()
    const match = matchDoc.data
    if (!match) {
      return { code: ERROR_CODES.MATCH_NOT_FOUND, message: '比赛不存在', data: null }
    }

    const rankings = match.winner ? buildRankings(match.players || [], match.winner) : []
    const scoreHistory = buildScoreHistory(match.scoreEvents || [])
    const stats = match.stats || null

    return {
      code: 0,
      message: 'ok',
      data: {
        match,
        rankings,
        scoreHistory,
        stats: stats ? { ...stats, mvpNickName: (match.players || []).find((p) => p.openid === stats.mvpOpenid)?.nickName || '' } : null,
      },
    }
  } catch (err) {
    console.error('getMatchResult error:', err)
    return { code: ERROR_CODES.SERVER_ERROR, message: err.message || '获取结算结果失败', data: null }
  }
}

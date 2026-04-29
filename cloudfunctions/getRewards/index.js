const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { limit = 30 } = event || {}

  try {
    const matchRes = await db.collection('matches')
      .where({
        status: 'finished',
        players: _.elemMatch({ openid: OPENID }),
      })
      .orderBy('startAt', 'desc')
      .limit(limit)
      .get()

    const matches = matchRes.data.map(m => {
      const myPlayer = (m.players || []).find(p => p.openid === OPENID)
      const isWin = myPlayer ? myPlayer.team === m.winner : false
      const funRewards = (m.stats && m.stats.funRewards) || {}
      // 找出当前用户获得的称号
      const myAwards = Object.entries(funRewards)
        .filter(([, val]) => typeof val === 'string' && val.includes(myPlayer && myPlayer.nickName || ''))
        .map(([key]) => key)

      return {
        _id: m._id,
        matchType: m.matchType,
        winner: m.winner,
        isWin,
        setScores: m.setScores || { A: 0, B: 0 },
        sets: m.sets || [],
        startAt: m.startAt,
        durationSeconds: (m.stats && m.stats.durationSeconds) || 0,
        funRewards,
        myAwards,
        players: (m.players || []).map(p => ({ nickName: p.nickName, team: p.team })),
      }
    })

    return { code: 0, message: 'ok', data: { matches } }
  } catch (err) {
    console.error('getRewards error:', err)
    return { code: 5000, message: err.message || '获取记录失败', data: null }
  }
}

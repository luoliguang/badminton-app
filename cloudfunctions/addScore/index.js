const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const {
  calcNewScore,
  isMatchPoint,
  checkSetWinner,
} = require('./gameLogic')

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { matchId, team, delta } = event

  if (!matchId || !team || ![-1, 1].includes(delta)) {
    return { code: 4000, message: '参数错误', data: null }
  }

  try {
    const matchDoc = await db.collection('matches').doc(matchId).get()
    const match = matchDoc.data

    if (!match) return { code: 4005, message: '比赛不存在', data: null }
    if (match.status !== 'in_progress') return { code: 4006, message: '比赛已结束', data: null }

    const newScore = calcNewScore(match.currentScore, team, delta)
    const ruleset = match.ruleset

    const newEvent = {
      team,
      delta,
      snapA: newScore.A,
      snapB: newScore.B,
      setNumber: match.currentScore.setNumber,
      byOpenid: OPENID,
      ts: db.serverDate(),
    }

    const setWinner = checkSetWinner(newScore, ruleset)
    let shouldEnd = false
    let matchWinner = null

    const updateData = {
      scoreEvents: _.push(newEvent),
      currentScore: newScore,
      isMatchPoint: isMatchPoint(newScore, ruleset),
    }

    if (setWinner) {
      const completedSet = {
        winner: setWinner,
        scoreA: newScore.A,
        scoreB: newScore.B,
        setNumber: match.currentScore.setNumber,
      }

      const newSetScores = {
        A: (match.setScores?.A || 0) + (setWinner === 'A' ? 1 : 0),
        B: (match.setScores?.B || 0) + (setWinner === 'B' ? 1 : 0),
      }

      updateData.sets = _.push(completedSet)
      updateData.setScores = newSetScores

      const setsToWin = ruleset.setsToWin || 2
      if (newSetScores.A >= setsToWin || newSetScores.B >= setsToWin) {
        matchWinner = newSetScores.A >= setsToWin ? 'A' : 'B'
        shouldEnd = true
        updateData.winner = matchWinner
        updateData.status = 'finished'
        updateData.isMatchPoint = false
      } else {
        // 新局开始，重置当前分
        updateData.currentScore = { A: 0, B: 0, setNumber: match.currentScore.setNumber + 1 }
        updateData.isMatchPoint = false
      }
    }

    await db.collection('matches').doc(matchId).update({ data: updateData })

    return {
      code: 0,
      message: 'ok',
      data: {
        currentScore: updateData.currentScore,
        setScores: updateData.setScores || match.setScores,
        isMatchPoint: updateData.isMatchPoint,
        setWinner: setWinner || null,
        shouldEnd,
        matchWinner,
      },
    }
  } catch (err) {
    console.error('addScore error:', err)
    return { code: 5000, message: err.message, data: null }
  }
}

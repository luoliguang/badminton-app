// cloudfunctions/startMatch/index.js
// 依赖 types/index.ts: Match, Room, ERROR_CODES
// 调用 gameLogic: calcNewScore/replayScoreEvents 不需要；仅创建比赛快照

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 4000,
  ROOM_NOT_FOUND: 4009,
  NOT_HOST: 4011,
  ALREADY_STARTED: 4007,
  SERVER_ERROR: 5000,
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId } = event || {}

  try {
    if (!roomId) {
      return { code: ERROR_CODES.SERVER_ERROR, message: 'roomId 不能为空', data: null }
    }

    const roomDoc = await db.collection('rooms').doc(roomId).get()
    const room = roomDoc.data
    if (!room) {
      return { code: ERROR_CODES.ROOM_NOT_FOUND, message: '房间不存在', data: null }
    }
    if (room.hostOpenid !== OPENID) {
      return { code: ERROR_CODES.NOT_HOST, message: '仅房主可开始比赛', data: null }
    }
    if (room.status !== 'waiting') {
      return { code: ERROR_CODES.ALREADY_STARTED, message: '比赛已开始', data: null }
    }

    const players = room.players || []
    if (players.length < 2) {
      return { code: ERROR_CODES.INVALID_PARAMS, message: '至少需要 2 名玩家才能开始比赛', data: null }
    }

    const teamA = players.filter(p => p.team === 'A').length
    const teamB = players.filter(p => p.team === 'B').length
    if (teamA === 0 || teamB === 0) {
      return { code: ERROR_CODES.INVALID_PARAMS, message: '两支队伍都需要至少 1 名玩家', data: null }
    }

    const matchData = {
      roomId: room._id,
      matchType: room.matchType,
      ruleset: room.ruleset,
      status: 'in_progress',
      scoreEvents: [],
      currentScore: { A: 0, B: 0, setNumber: 1 },
      setScores: { A: 0, B: 0 },
      sets: [],
      players: room.players || [],
      startAt: db.serverDate(),
    }

    const addRes = await db.collection('matches').add({ data: matchData })
    const match = { _id: addRes._id, ...matchData }

    await db.collection('rooms').doc(room._id).update({
      data: { status: 'in_progress' },
    })

    return {
      code: 0,
      message: 'ok',
      data: { matchId: addRes._id, match },
    }
  } catch (err) {
    console.error('startMatch error:', err)
    return { code: ERROR_CODES.SERVER_ERROR, message: err.message || '开始比赛失败', data: null }
  }
}

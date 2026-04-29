// cloudfunctions/createRoom/index.js
// 依赖 types/index.ts: MatchType, Ruleset, Room, ERROR_CODES
// 调用 gameLogic: getMaxPlayers, generateRoomCode

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const {
  getMaxPlayers,
  generateRoomCode,
  ensureUser,
} = require('./gameLogic')

const DEFAULT_RULESET = {
  pointsToWin: 21,
  setsToWin: 2,
  deuceEnabled: true,
}

const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 4000,
  NOT_FOUND: 4005,
  ALREADY_STARTED: 4007,
  FULL: 4008,
  SERVER_ERROR: 5000,
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { matchType, ruleset } = event || {}

  try {
    if (!matchType) {
      return { code: ERROR_CODES.SERVER_ERROR, message: 'matchType 不能为空', data: null }
    }

    const mergedRuleset = { ...DEFAULT_RULESET, ...(ruleset || {}) }
    const maxPlayers = mergedRuleset.playerCount || getMaxPlayers(matchType)
    const shareCode = generateRoomCode()

    // 房主自动加入，分配到 A 队
    const host = await ensureUser(db, OPENID)
    const hostPlayer = {
      openid: OPENID,
      nickName: host.nickName,
      avatarUrl: host.avatarUrl,
      team: 'A',
      isHost: true,
      isReady: true,
    }

    const roomData = {
      code: shareCode,
      hostOpenid: OPENID,
      matchType,
      ruleset: mergedRuleset,
      status: 'waiting',
      players: [hostPlayer],
      maxPlayers,
      createdAt: db.serverDate(),
    }

    const addRes = await db.collection('rooms').add({ data: roomData })
    const room = {
      _id: addRes._id,
      ...roomData,
    }

    return {
      code: 0,
      message: 'ok',
      data: { room, shareCode },
    }
  } catch (err) {
    console.error('createRoom error:', err)
    return { code: ERROR_CODES.SERVER_ERROR, message: err.message || '创建房间失败', data: null }
  }
}

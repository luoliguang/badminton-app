// cloudfunctions/joinRoom/index.js
// 依赖 types/index.ts: Room, RoomPlayer, ERROR_CODES
// 调用 gameLogic: 无

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 4000,
  NOT_FOUND: 4005,
  ALREADY_STARTED: 4007,
  ROOM_NOT_FOUND: 4009,
  ROOM_FULL: 4010,
  SERVER_ERROR: 5000,
}

async function ensureUser(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length) return userRes.data[0]
  const profile = {
    openid,
    nickName: '羽球新手',
    avatarUrl: '',
    totalGames: 0,
    winRate: 0,
    currentStreak: 0,
    rank: '新手',
    createdAt: db.serverDate(),
  }
  const addRes = await db.collection('users').add({ data: profile })
  return { ...profile, _id: addRes._id }
}

function assignTeam(players) {
  const countA = players.filter(p => p.team === 'A').length
  const countB = players.filter(p => p.team === 'B').length
  return countA <= countB ? 'A' : 'B'
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { code } = event || {}

  try {
    if (!code) {
      return { code: ERROR_CODES.SERVER_ERROR, message: '参数错误', data: null }
    }

    const roomRes = await db.collection('rooms').where({ code }).get()
    if (!roomRes.data.length) {
      return { code: ERROR_CODES.ROOM_NOT_FOUND, message: '房间不存在', data: null }
    }

    const room = roomRes.data[0]
    if (room.status !== 'waiting') {
      return { code: ERROR_CODES.ALREADY_STARTED, message: '房间已开始', data: null }
    }
    if ((room.players || []).length >= room.maxPlayers) {
      return { code: ERROR_CODES.ROOM_FULL, message: '房间已满', data: null }
    }

    const user = await ensureUser(OPENID)

    const players = room.players || []
    if (players.some(p => p.openid === OPENID)) {
      return { code: 0, message: 'ok', data: room }
    }

    const newPlayer = {
      openid: OPENID,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      team: assignTeam(players),
      isHost: room.hostOpenid === OPENID,
      isReady: false,
    }

    players.push(newPlayer)
    await db.collection('rooms').doc(room._id).update({
      data: { players },
    })

    return {
      code: 0,
      message: 'ok',
      data: { ...room, players },
    }
  } catch (err) {
    console.error('joinRoom error:', err)
    return { code: ERROR_CODES.SERVER_ERROR, message: err.message || '加入房间失败', data: null }
  }
}

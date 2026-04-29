const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ERROR = {
  INVALID_PARAMS: 4000,
  NOT_FOUND: 4005,
  NOT_HOST: 4011,
  SERVER_ERROR: 5000,
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, roomId, targetOpenid } = event || {}

  if (!roomId || !action) {
    return { code: ERROR.INVALID_PARAMS, message: '参数错误', data: null }
  }

  try {
    const snap = await db.collection('rooms').doc(roomId).get()
    const room = snap.data
    if (!room) return { code: ERROR.NOT_FOUND, message: '房间不存在', data: null }
    if (room.hostOpenid !== OPENID) return { code: ERROR.NOT_HOST, message: '仅房主可操作', data: null }

    // 解散房间
    if (action === 'dissolve') {
      await db.collection('rooms').doc(roomId).update({ data: { status: 'dissolved' } })
      return { code: 0, message: 'ok', data: { dissolved: true } }
    }

    // 踢出玩家
    if (action === 'kick') {
      if (!targetOpenid) return { code: ERROR.INVALID_PARAMS, message: '缺少 targetOpenid', data: null }
      if (targetOpenid === OPENID) return { code: ERROR.INVALID_PARAMS, message: '不能踢出自己', data: null }

      const newPlayers = (room.players || []).filter(p => p.openid !== targetOpenid)
      await db.collection('rooms').doc(roomId).update({ data: { players: newPlayers } })
      return { code: 0, message: 'ok', data: { players: newPlayers } }
    }

    return { code: ERROR.INVALID_PARAMS, message: '未知操作', data: null }
  } catch (err) {
    console.error('manageRoom error:', err)
    return { code: ERROR.SERVER_ERROR, message: err.message || '操作失败', data: null }
  }
}

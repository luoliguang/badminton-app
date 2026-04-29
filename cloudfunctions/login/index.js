const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function buildDefaultProfile(openid) {
  return {
    openid,
    nickName: '羽球新手',
    avatarUrl: '',
    totalGames: 0,
    winRate: 0,
    currentStreak: 0,
    rank: '新手',
    createdAt: db.serverDate(),
  }
}

async function ensureUser(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length > 0) return { ...userRes.data[0], isNewUser: false }

  const profile = buildDefaultProfile(openid)
  const addRes = await db.collection('users').add({ data: profile })
  return {
    ...profile,
    _id: addRes._id,
    isNewUser: true,
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const user = await ensureUser(OPENID)
    return {
      code: 0,
      message: 'ok',
      data: user,
    }
  } catch (err) {
    console.error('login error:', err)
    return { code: 5000, message: err.message || '登录失败', data: null }
  }
}

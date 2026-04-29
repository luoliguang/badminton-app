// cloudfunctions/getStats/index.js
// 统计页数据聚合：即使 users / matches 集合尚未创建，也返回安全默认值

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 4000,
  NOT_FOUND: 4005,
  ALREADY_ENDED: 4006,
  SERVER_ERROR: 5000,
}

const EMPTY_PROFILE = {
  nickName: '羽球新手',
  avatarUrl: '',
  totalGames: 0,
  winRate: 0,
  currentStreak: 0,
  rank: '新手',
}

function safeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function buildHeatmap(matches) {
  const days = []
  const now = new Date()
  for (let i = 179; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, count: 0 })
  }

  const counts = new Map()
  ;(matches || []).forEach((match) => {
    const dt = safeDate(match.endAt) || safeDate(match.startAt)
    if (!dt) return
    const key = dt.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  return days.map(day => ({
    date: day.date,
    count: counts.get(day.date) || 0,
  }))
}

async function safeGet(collection, queryBuilder) {
  try {
    const query = db.collection(collection)
    return await queryBuilder(query)
  } catch (err) {
    if ((err && err.message && err.message.includes('collection not exists')) || (err && err.errMsg && err.errMsg.includes('collection not exists'))) {
      return { data: [] }
    }
    throw err
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await safeGet('users', (query) => query.where({ openid: OPENID }).get())
    const profile = userRes.data[0] || EMPTY_PROFILE

    const recentRes = await safeGet('matches', (query) => query.orderBy('endAt', 'desc').limit(5).get())
    const allRes = await safeGet('matches', (query) => query.get())
    const userMatches = (allRes.data || []).filter(m => (m.players || []).some(p => p.openid === OPENID))
    const heatmap = buildHeatmap(userMatches)

    const recentMatches = (recentRes.data || []).map(match => ({
      _id: match._id,
      title: `${match.matchType === 'singles' ? '单打' : match.matchType === 'doubles' ? '双打' : '团队'} · ${match.currentScore?.A ?? 0}:${match.currentScore?.B ?? 0}`,
      result: match.winner === 'A' ? 'win' : 'lose',
      time: match.endAt || match.startAt,
    }))

    return {
      code: 0,
      message: 'ok',
      data: { profile, heatmap, recentMatches },
    }
  } catch (err) {
    console.error('getStats error:', err)
    return { code: ERROR_CODES.SERVER_ERROR, message: err.message || '获取统计失败', data: null }
  }
}

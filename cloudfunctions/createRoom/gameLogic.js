const MATCH_TYPE_CONFIG = {
  singles: { label: '单打', maxPlayers: 2, teamSize: 1 },
  doubles: { label: '双打', maxPlayers: 4, teamSize: 2 },
  team: { label: '团队', maxPlayers: 6, teamSize: 3 },
}

function getMaxPlayers(matchType) {
  const config = MATCH_TYPE_CONFIG[matchType] || MATCH_TYPE_CONFIG.doubles
  return config.maxPlayers
}

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function ensureUser(db, openid) {
  const res = await db.collection('users').where({ openid }).get()
  if (res.data.length) return res.data[0]
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

module.exports = { getMaxPlayers, generateRoomCode, ensureUser }

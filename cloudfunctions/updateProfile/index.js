const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickName, avatarUrl } = event || {}

  if (!nickName && !avatarUrl) {
    return { code: 4000, message: '没有需要更新的字段', data: null }
  }

  try {
    const userRes = await db.collection('users').where({ openid: OPENID }).get()
    if (!userRes.data.length) {
      return { code: 4005, message: '用户不存在', data: null }
    }

    const userId = userRes.data[0]._id
    const updateFields = {}
    if (nickName) updateFields.nickName = nickName.trim().slice(0, 20)
    if (avatarUrl) updateFields.avatarUrl = avatarUrl

    await db.collection('users').doc(userId).update({ data: updateFields })

    const updated = { ...userRes.data[0], ...updateFields }
    return { code: 0, message: 'ok', data: updated }
  } catch (err) {
    console.error('updateProfile error:', err)
    return { code: 5000, message: err.message || '更新失败', data: null }
  }
}

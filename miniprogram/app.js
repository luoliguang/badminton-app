const { login: cloudLogin } = require('./utils/cloudHelper')

const USER_CACHE_KEY = 'badminton_user_profile'

App({
  globalData: {
    userInfo: null,
  },

  async onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 以上的基础库以支持云能力')
      return
    }

    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true,
    })

    const cachedUser = wx.getStorageSync(USER_CACHE_KEY)
    if (cachedUser && cachedUser.openid) {
      this.globalData.userInfo = cachedUser
    }

    try {
      const res = await cloudLogin()
      if (res.code === 0 && res.data) {
        this.globalData.userInfo = res.data
        wx.setStorageSync(USER_CACHE_KEY, res.data)
      }
    } catch (err) {
      console.error('app login error:', err)
    }
  },
})

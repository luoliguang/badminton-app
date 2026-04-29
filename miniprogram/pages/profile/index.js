const { login, updateProfile, safeAvatarUrl } = require('../../utils/cloudHelper')

const CACHE_TTL_MS = 5 * 60 * 1000

Page({
  data: {
    nickname: '羽球新手',
    avatarUrl: '',
    rank: '新手',
    totalGames: 0,
    winRate: '0%',
    currentStreak: 0,
    loading: false,
    editing: false,
    editNickname: '',
    saving: false,
    uploadingAvatar: false,
  },

  onShow() {
    const app = getApp()
    const cached = app.globalData.userInfo
    if (cached) this._applyUser(cached)

    const lastFetch = app.globalData.userInfoFetchedAt || 0
    if (Date.now() - lastFetch > CACHE_TTL_MS) this._fetchUser()
  },

  async _fetchUser() {
    this.setData({ loading: true })
    try {
      const res = await login()
      if (res.code === 0 && res.data) {
        const app = getApp()
        app.globalData.userInfo = res.data
        app.globalData.userInfoFetchedAt = Date.now()
        wx.setStorageSync('badminton_user_profile', res.data)
        this._applyUser(res.data)
      }
    } catch (err) {
      console.error('profile fetch error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  _applyUser(user) {
    this.setData({
      nickname: user.nickName || '羽球新手',
      avatarUrl: safeAvatarUrl(user.avatarUrl),
      rank: user.rank || '新手',
      totalGames: user.totalGames || 0,
      winRate: `${Math.round((user.winRate || 0) * 100)}%`,
      currentStreak: user.currentStreak || 0,
    })
  },

  // 微信头像选择回调（open-type="chooseAvatar"）
  async onChooseAvatar(e) {
    const tempFilePath = e.detail.avatarUrl
    if (!tempFilePath) return
    this.setData({ uploadingAvatar: true })
    wx.showLoading({ title: '上传头像中…' })
    try {
      // 上传到云存储
      const app = getApp()
      const openid = (app.globalData.userInfo || {}).openid || 'unknown'
      const ext = tempFilePath.split('.').pop() || 'jpg'
      const cloudPath = `avatars/${openid}_${Date.now()}.${ext}`

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      })

      const avatarUrl = uploadRes.fileID
      // 保存到数据库
      const res = await updateProfile({ avatarUrl })
      if (res.code === 0) {
        const app2 = getApp()
        app2.globalData.userInfo = res.data
        app2.globalData.userInfoFetchedAt = Date.now()
        wx.setStorageSync('badminton_user_profile', res.data)
        this.setData({ avatarUrl })
        wx.showToast({ title: '头像已更新', icon: 'success' })
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('upload avatar error:', err)
      wx.showToast({ title: '上传失败，请重试', icon: 'none' })
    } finally {
      this.setData({ uploadingAvatar: false })
      wx.hideLoading()
    }
  },

  onEditTap() {
    this.setData({ editing: true, editNickname: this.data.nickname })
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  onCancelEdit() {
    this.setData({ editing: false, editNickname: '' })
  },

  async onSaveProfile() {
    const nickName = this.data.editNickname.trim()
    if (!nickName) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      const res = await updateProfile({ nickName })
      if (res.code === 0) {
        const app = getApp()
        app.globalData.userInfo = res.data
        app.globalData.userInfoFetchedAt = Date.now()
        wx.setStorageSync('badminton_user_profile', res.data)
        this.setData({ nickname: nickName, editing: false, editNickname: '' })
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('save profile error:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },
})

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

  async onAvatarTap() {
    if (this.data.uploadingAvatar) return
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const tempFilePath = res && res.tempFilePaths && res.tempFilePaths[0]
      if (!tempFilePath) return
      await this._uploadAvatar(tempFilePath)
    } catch (err) {
      const errMsg = String((err && err.errMsg) || '')
      if (!errMsg.includes('cancel')) {
        console.error('choose avatar error:', err)
        wx.showToast({ title: '请选择头像后重试', icon: 'none' })
      }
    }
  },

  async _uploadAvatar(tempFilePath) {
    this.setData({ uploadingAvatar: true })
    wx.showLoading({ title: '上传头像中…' })
    try {
      const app = getApp()
      const openid = (app.globalData.userInfo || {}).openid || 'unknown'
      const ext = tempFilePath.split('.').pop() || 'jpg'
      const cloudPath = `avatars/${openid}_${Date.now()}.${ext}`

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      })

      const avatarUrl = uploadRes.fileID
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

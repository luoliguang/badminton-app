const { getStats } = require('../../utils/cloudHelper')
const { formatWinRate } = require('../../utils/gameLogic')

Page({
  data: {
    profile: {
      winRate: '0%',
      totalGames: 0,
      currentStreak: 0,
      rank: '新手',
    },
    recentMatches: [],
    heatmap: [],
    loading: true,
    joinCode: '',
    userInitial: '我',
    hasActiveRoom: false,
  },

  onShow() {
    const app = getApp()
    const cached = app.globalData.userInfo
    if (cached && cached.nickName) {
      this.setData({ userInitial: cached.nickName.charAt(0) })
    }
    // 检测是否有活跃房间（用户已创建但未开始的房间）
    this.setData({ hasActiveRoom: !!app.globalData.activeRoomId })
    this.loadStats()
  },

  onAvatarTap() {
    wx.switchTab({ url: '/pages/profile/index' })
  },

  async loadStats() {
    this.setData({ loading: true })
    try {
      const res = await getStats()
      if (!res) {
        console.error('getStats returned null')
        return
      }
      if (res.code === 0 && res.data) {
        const data = res.data
        this.setData({
          profile: {
            winRate: formatWinRate(data.profile?.winRate ?? 0),
            totalGames: data.profile?.totalGames ?? 0,
            currentStreak: data.profile?.currentStreak ?? 0,
            rank: data.profile?.rank ?? '新手',
          },
          recentMatches: data.recentMatches || [],
          heatmap: data.heatmap || [],
        })
      } else {
        console.error('getStats error:', res.message)
      }
    } catch (err) {
      console.error('load stats error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onCreateRoom() {
    const app = getApp()
    if (app.globalData.activeRoomId) {
      // 已有活跃房间，直接返回
      wx.navigateTo({ url: `/pages/room/index?roomId=${app.globalData.activeRoomId}` })
    } else {
      // 去配置页，手动创建
      wx.navigateTo({ url: '/pages/room/index?mode=create' })
    }
  },

  onJoinByCode() {
    wx.showModal({
      title: '输入口令',
      editable: true,
      placeholderText: '请输入 6 位房间口令',
      success: (res) => {
        if (res.confirm && res.content) {
          wx.navigateTo({ url: `/pages/room/index?mode=join&code=${res.content}` })
        }
      },
    })
  },

  onScanJoin() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        const code = res.result || ''
        if (code) {
          wx.navigateTo({ url: `/pages/room/index?mode=join&code=${code}` })
        }
      },
    })
  },
})

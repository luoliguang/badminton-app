import { getStats } from '../../utils/cloudHelper'
import { formatWinRate } from '../../utils/gameLogic'

Page({
  data: {
    profile: {
      winRate: '0%',
      totalGames: 0,
      currentStreak: 0,
      rank: '新手',
    },
    recentMatches: [] as Array<{ title: string; result: 'win' | 'lose'; time: string }>,
    heatmap: [] as Array<{ date: string; count: number }>,
    loading: true,
    joinCode: '',
  },

  async onShow() {
    await this.loadStats()
  },

  async loadStats() {
    this.setData({ loading: true })
    try {
      const res = await getStats()
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
      }
    } catch (err) {
      console.error('load stats error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onCreateRoom() {
    wx.navigateTo({ url: '/miniprogram/pages/room/index?mode=create' })
  },

  onJoinByCode() {
    wx.showModal({
      title: '输入口令',
      editable: true,
      placeholderText: '请输入 6 位房间口令',
      success: (res) => {
        if (res.confirm && res.content) {
          wx.navigateTo({ url: `/miniprogram/pages/room/index?mode=join&code=${res.content}` })
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
          wx.navigateTo({ url: `/miniprogram/pages/room/index?mode=join&code=${code}` })
        }
      },
    })
  },
})

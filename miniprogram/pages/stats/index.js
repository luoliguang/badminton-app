const { getStats } = require('../../utils/cloudHelper')

Page({
  data: {
    activeTab: 'all',
    winRate: '0%',
    totalGames: 0,
    recentMatches: [],
    filteredMatches: [],
  },

  async onLoad() {
    await this.loadStats()
  },

  async onPullDownRefresh() {
    await this.loadStats()
    wx.stopPullDownRefresh()
  },

  async loadStats() {
    try {
      const res = await getStats()
      if (res.code !== 0 || !res.data) return
      const recentMatches = (res.data.recentMatches || []).map((item, index) => ({
        matchType: index % 3 === 0 ? 'singles' : index % 3 === 1 ? 'doubles' : 'team',
        opponent: item.title,
        time: item.time,
        score: '21-18',
        result: item.result,
      }))
      this.setData({
        winRate: `${Math.round((res.data.profile && res.data.profile.winRate ? res.data.profile.winRate : 0) * 100)}%`,
        totalGames: res.data.profile ? res.data.profile.totalGames : 0,
        recentMatches,
      })
      this.applyFilter()
    } catch (error) {
      console.error(error)
    }
  },

  applyFilter() {
    const { activeTab, recentMatches } = this.data
    const filteredMatches = recentMatches.filter((item) => {
      if (activeTab === 'all') return true
      return item.matchType === activeTab
    })
    this.setData({ filteredMatches })
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.applyFilter()
  },
})

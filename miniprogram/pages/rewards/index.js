const { getRewards } = require('../../utils/cloudHelper')
const { formatDuration } = require('../../utils/gameLogic')

Page({
  data: {
    matches: [],
    loading: true,
    empty: false,
  },

  onShow() {
    this.loadRewards()
  },

  async loadRewards() {
    this.setData({ loading: true })
    try {
      const res = await getRewards({ limit: 30 })
      if (res.code === 0 && res.data) {
        const matches = res.data.matches.map(m => ({
          ...m,
          typeLabel: m.matchType === 'singles' ? '单打' : m.matchType === 'doubles' ? '双打' : '团队',
          dateLabel: m.startAt ? new Date(m.startAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '',
          durationLabel: formatDuration(m.durationSeconds || 0),
          rewardEntries: Object.entries(m.funRewards || {}).map(([key, value]) => ({ key, value })),
          setLabel: (m.sets || []).map(s => `${s.scoreA}-${s.scoreB}`).join('  '),
        }))
        this.setData({ matches, empty: matches.length === 0 })
      }
    } catch (err) {
      console.error('loadRewards error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },
})

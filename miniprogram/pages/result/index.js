const { getMatchResult, endMatch } = require('../../utils/cloudHelper')
const { formatDuration } = require('../../utils/gameLogic')

Page({
  data: {
    matchId: '',
    matchSummary: null,
    rankings: [],
    stats: {
      durationSeconds: 0,
      longestRally: 0,
      mvpNickName: '',
      maxSpeedKmh: 0,
    },
    intensityStars: '★★★★☆',
    rewardList: [],
    scoreHistory: [],
    loading: false,
  },

  async onLoad(query) {
    if (query.matchId) {
      this.setData({ matchId: query.matchId })
      await this.loadResult(query.matchId)
    }
  },

  async loadResult(matchId) {
    this.setData({ loading: true })
    try {
      const res = await getMatchResult({ matchId })
      if (res.code !== 0 || !res.data) return

      const { match, rankings, scoreHistory } = res.data
      let { stats } = res.data

      // 若 stats 为空（竞态：watcher 先跳转，endMatch 还未执行），补调一次
      if (!stats || !stats.funRewards) {
        const endRes = await endMatch({ matchId })
        if (endRes.code === 0 && endRes.data && endRes.data.stats) {
          stats = endRes.data.stats
        }
      }

      const rewardList = Object.entries((stats && stats.funRewards) || {})
        .map(([key, value]) => ({ key, value }))

      const mvpPlayer = (match.players || []).find(
        p => p.openid === (stats && stats.mvpOpenid)
      )

      const totalPts = (match.scoreEvents || []).filter(e => e.delta === 1).length
      const intensityStars = totalPts >= 50 ? '★★★★★'
        : totalPts >= 35 ? '★★★★☆'
        : totalPts >= 20 ? '★★★☆☆'
        : '★★☆☆☆'

      this.setData({
        matchSummary: {
          matchType: match.matchType,
          winner: match.winner,
          currentScore: match.currentScore,
          setScores: match.setScores,
          sets: match.sets || [],
        },
        rankings: rankings || [],
        stats: {
          durationSeconds: (stats && stats.durationSeconds) || 0,
          longestRally: (stats && stats.longestRally) || 0,
          mvpNickName: mvpPlayer ? mvpPlayer.nickName : (stats && stats.mvpNickName) || '未评选',
          maxSpeedKmh: (stats && stats.maxSpeedKmh) || 0,
        },
        intensityStars,
        rewardList,
        scoreHistory: scoreHistory || [],
      })
    } catch (err) {
      console.error('load match result error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onBackHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  formatDurationText(seconds) {
    return formatDuration(seconds)
  },
})

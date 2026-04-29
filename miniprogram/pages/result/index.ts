import { getMatchResult } from '../../utils/cloudHelper'
import { formatDuration } from '../../utils/gameLogic'

type RewardItem = { key: string; value: string }

Page({
  data: {
    matchId: '',
    winnerText: '比赛结束！',
    intensityStars: '★★★★☆',
    rankings: [] as Array<{ rank: number; nickName: string; team: string; score: number }>,
    stats: {
      durationSeconds: 0,
      longestRally: 0,
      mvpNickName: '',
      maxSpeedKmh: 0,
    },
    rewardList: [] as RewardItem[],
    scoreHistory: [] as Array<{ team: string; delta: 1 | -1; snapA: number; snapB: number }>,
  },

  async onLoad(query: Record<string, string>) {
    if (query.matchId) {
      this.setData({ matchId: query.matchId })
      await this.loadResult(query.matchId)
    }
  },

  async loadResult(matchId: string) {
    try {
      const res = await getMatchResult({ matchId })
      if (res.code !== 0 || !res.data) return

      const { match, rankings, scoreHistory, stats } = res.data
      const mvpOpenid = match.stats?.mvpOpenid || ''
      const mvpPlayer = (match.players || []).find((p) => p.openid === mvpOpenid)
      const rewardList = Object.entries(match.stats?.funRewards || {}).map(([key, value]) => ({ key, value }))

      this.setData({
        winnerText: match.winner ? '比赛结束！' : '比赛结束！',
        rankings: (rankings || []).map((item) => ({
          rank: item.rank,
          nickName: item.nickName,
          team: item.team,
          score: item.score,
        })),
        stats: {
          durationSeconds: match.stats?.durationSeconds || 0,
          longestRally: match.stats?.longestRally || 0,
          mvpNickName: mvpPlayer?.nickName || '未评选',
          maxSpeedKmh: match.stats?.maxSpeedKmh || 184,
        },
        rewardList,
        scoreHistory: scoreHistory || [],
      })
    } catch (err) {
      console.error('load match result error:', err)
    }
  },

  onBackHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  formatDurationText(seconds: number) {
    return formatDuration(seconds)
  },
})

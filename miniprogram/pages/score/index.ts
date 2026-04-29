import { addScore, endMatch } from '../../utils/cloudHelper'

Page({
  data: {
    matchId: '',
    scoreA: 0,
    scoreB: 0,
    setNumber: 1,
    isMatchPoint: false,
    eventLog: [] as string[],
    watcher: null as WechatMiniprogram.Cloud.DatabaseWatcher | null,
    scoreEvents: [] as Array<{ team: string; delta: 1 | -1; snapA: number; snapB: number; byOpenid: string; ts: Date }>,
  },

  onLoad(query: Record<string, string>) {
    if (query.matchId) {
      this.setData({ matchId: query.matchId })
      this.startWatch(query.matchId)
    }
  },

  onUnload() {
    this.data.watcher?.close()
    this.setData({ watcher: null })
  },

  startWatch(matchId: string) {
    const db = wx.cloud.database()
    const watcher = db.collection('matches').doc(matchId).watch({
      onChange: (snapshot) => {
        const match = snapshot.docs?.[0]
        if (!match) return
        const currentScore = match.currentScore || { A: 0, B: 0, setNumber: 1 }
        const scoreEvents = match.scoreEvents || []
        this.setData({
          scoreA: currentScore.A,
          scoreB: currentScore.B,
          setNumber: currentScore.setNumber || 1,
          isMatchPoint: !!match.isMatchPoint,
          scoreEvents,
          eventLog: scoreEvents.slice(-5).reverse().map((item: any) => `${item.team} 队 ${item.delta > 0 ? '+' : ''}${item.delta}`),
        })
        if (match.shouldEnd) {
          this.finishMatch()
        }
      },
      onError: (err) => {
        console.error('match watch error:', err)
      },
    })
    this.setData({ watcher })
  },

  async addPoint(e: WechatMiniprogram.CustomEvent) {
    const team = e.currentTarget.dataset.team as 'a' | 'b'
    try {
      const res = await addScore({
        matchId: this.data.matchId,
        team: team === 'a' ? 'A' : 'B',
        delta: 1,
      })
      if (res.code === 0 && res.data) {
        this.setData({
          scoreA: res.data.currentScore?.A ?? this.data.scoreA,
          scoreB: res.data.currentScore?.B ?? this.data.scoreB,
          isMatchPoint: res.data.isMatchPoint,
        })
        if (res.data.shouldEnd) {
          await this.finishMatch()
        }
      }
    } catch (err) {
      console.error('add score error:', err)
    }
  },

  async onUndoPoint(e: WechatMiniprogram.CustomEvent) {
    const team = e.currentTarget.dataset.team as 'a' | 'b'
    try {
      const res = await addScore({
        matchId: this.data.matchId,
        team: team === 'a' ? 'A' : 'B',
        delta: -1,
      })
      if (res.code === 0 && res.data) {
        this.setData({
          scoreA: res.data.currentScore?.A ?? this.data.scoreA,
          scoreB: res.data.currentScore?.B ?? this.data.scoreB,
          isMatchPoint: res.data.isMatchPoint,
        })
      }
    } catch (err) {
      console.error('undo score error:', err)
    }
  },

  async finishMatch() {
    try {
      await endMatch({ matchId: this.data.matchId })
      wx.redirectTo({ url: `/miniprogram/pages/result/index?matchId=${this.data.matchId}` })
    } catch (err) {
      console.error('end match error:', err)
    }
  },
})

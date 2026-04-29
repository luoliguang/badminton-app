const { addScore, endMatch } = require('../../utils/cloudHelper')

Page({
  data: {
    matchId: '',
    scoreA: 0,
    scoreB: 0,
    setNumber: 1,
    setScoreA: 0,
    setScoreB: 0,
    isMatchPoint: false,
    eventLog: [],
    watcher: null,
    scoreEvents: [],
    matchFinished: false,
    statusText: '等待开赛',
  },

  onLoad(query) {
    if (query.matchId) {
      this.setData({ matchId: query.matchId })
      this.startWatch(query.matchId)
    }
  },

  onUnload() {
    if (this.data.watcher) this.data.watcher.close()
    this.setData({ watcher: null })
  },

  startWatch(matchId) {
    const db = wx.cloud.database()
    const watcher = db.collection('matches').doc(matchId).watch({
      onChange: (snapshot) => {
        const match = snapshot.docs && snapshot.docs[0]
        if (!match) return
        const currentScore = match.currentScore || { A: 0, B: 0, setNumber: 1 }
        const setScores = match.setScores || { A: 0, B: 0 }
        const scoreEvents = match.scoreEvents || []
        this.setData({
          scoreA: currentScore.A,
          scoreB: currentScore.B,
          setNumber: currentScore.setNumber || 1,
          setScoreA: setScores.A,
          setScoreB: setScores.B,
          isMatchPoint: !!match.isMatchPoint,
          scoreEvents,
          statusText: match.status === 'finished' ? '比赛已结束' : '比赛进行中',
          eventLog: scoreEvents.slice(-5).reverse().map(
            (item) => `第${item.setNumber || 1}局 ${item.team}队 ${item.delta > 0 ? '+1' : '-1'}`
          ),
        })
        if (match.status === 'finished' && !this.data.matchFinished) {
          this.setData({ matchFinished: true })
          wx.redirectTo({ url: `/pages/result/index?matchId=${this.data.matchId}` })
        }
      },
      onError: (err) => {
        console.error('match watch error:', err)
      },
    })
    this.setData({ watcher })
  },

  async addPoint(e) {
    const team = e.currentTarget.dataset.team
    try {
      const res = await addScore({
        matchId: this.data.matchId,
        team: team === 'a' ? 'A' : 'B',
        delta: 1,
      })
      if (res.code === 0 && res.data) {
        this.setData({
          scoreA: res.data.currentScore ? res.data.currentScore.A : this.data.scoreA,
          scoreB: res.data.currentScore ? res.data.currentScore.B : this.data.scoreB,
          setScoreA: res.data.setScores ? res.data.setScores.A : this.data.setScoreA,
          setScoreB: res.data.setScores ? res.data.setScores.B : this.data.setScoreB,
          isMatchPoint: !!res.data.isMatchPoint,
        })
        if (res.data.shouldEnd && !this.data.matchFinished) {
          this.setData({ matchFinished: true })
          await endMatch({ matchId: this.data.matchId })
          wx.redirectTo({ url: `/pages/result/index?matchId=${this.data.matchId}` })
        }
      }
    } catch (err) {
      console.error('add score error:', err)
    }
  },

  async onUndoPoint(e) {
    const team = e.currentTarget.dataset.team
    try {
      const res = await addScore({
        matchId: this.data.matchId,
        team: team === 'a' ? 'A' : 'B',
        delta: -1,
      })
      if (res.code === 0 && res.data) {
        this.setData({
          scoreA: res.data.currentScore ? res.data.currentScore.A : this.data.scoreA,
          scoreB: res.data.currentScore ? res.data.currentScore.B : this.data.scoreB,
          isMatchPoint: !!res.data.isMatchPoint,
        })
      }
    } catch (err) {
      console.error('undo score error:', err)
    }
  },
})

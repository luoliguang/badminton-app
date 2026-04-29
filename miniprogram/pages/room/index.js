const { createRoom, joinRoom, startMatch, manageRoom, safeAvatarUrl } = require('../../utils/cloudHelper')

const SETTINGS_KEY = 'room_settings'

function loadSavedSettings() {
  try {
    const saved = wx.getStorageSync(SETTINGS_KEY)
    return saved || null
  } catch (e) { return null }
}

function saveSettings(matchType, ruleset) {
  try { wx.setStorageSync(SETTINGS_KEY, { matchType, ruleset }) } catch (e) {}
}

Page({
  data: {
    mode: 'create',
    roomId: '',
    roomCode: '',
    joinCode: '',
    matchType: 'doubles',
    ruleset: {
      pointsToWin: 21,
      deuceEnabled: true,
      setsToWin: 2,
      playerCount: 4,
    },
    room: null,
    players: [],
    isHost: false,
    loading: false,
    watcher: null,
  },

  async onLoad(query) {
    // 恢复上次配置
    const saved = loadSavedSettings()
    if (saved) {
      this.setData({ matchType: saved.matchType, ruleset: saved.ruleset })
    }
    // 直接用 roomId 恢复已有房间（从首页"返回我的房间"进来）
    if (query.roomId) {
      await this.resumeRoom(query.roomId)
      return
    }

    const mode = query.mode === 'join' ? 'join' : 'create'
    this.setData({ mode })

    if (mode === 'join' && query.code) {
      this.setData({ joinCode: query.code })
      await this.joinByCode(query.code)
    }
  },

  async resumeRoom(roomId) {
    try {
      const db = wx.cloud.database()
      const snap = await db.collection('rooms').doc(roomId).get()
      const room = snap.data
      if (!room) return
      const app = getApp()
      const openid = (app.globalData.userInfo || {}).openid
      const isHost = !!(room.players || []).find(p => p.openid === openid && p.isHost)
      this.setData({
        mode: 'create',
        room,
        roomId,
        roomCode: room.code,
        matchType: room.matchType,
        isHost,
        players: this.padPlayers(room.players || [], room.maxPlayers || 4),
      })
      this.watchRoom(roomId)
    } catch (err) {
      console.error('resumeRoom error:', err)
      wx.showToast({ title: '房间已失效', icon: 'none' })
      getApp().globalData.activeRoomId = null
    }
  },

  onUnload() {
    if (this.data.watcher) this.data.watcher.close()
    this.setData({ watcher: null })
  },

  onHide() {
    if (this.data.watcher) this.data.watcher.close()
    this.setData({ watcher: null })
  },

  padPlayers(players, maxPlayers) {
    const list = players.map(p => ({ ...p, avatarUrl: safeAvatarUrl(p.avatarUrl) }))
    while (list.length < maxPlayers) list.push({ empty: true })
    return list
  },

  async createNewRoom() {
    this.setData({ loading: true })
    saveSettings(this.data.matchType, this.data.ruleset)
    try {
      const res = await createRoom({ matchType: this.data.matchType, ruleset: this.data.ruleset })
      if (res.code !== 0 || !res.data) {
        wx.showToast({ title: res.message || '创建失败', icon: 'none' })
        return
      }
      const { room, shareCode } = res.data
      this.setData({
        room,
        roomId: room._id || '',
        roomCode: shareCode,
        isHost: true,
        players: this.padPlayers(room.players || [], room.maxPlayers || 4),
      })
      this.watchRoom(room._id || '')
      getApp().globalData.activeRoomId = room._id || ''
      wx.showToast({ title: '房间已创建', icon: 'success', duration: 1500 })
    } catch (error) {
      console.error('create room error:', error)
      wx.showToast({ title: '创建失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async joinByCode(code) {
    this.setData({ loading: true })
    try {
      const res = await joinRoom({ code })
      if (res.code !== 0 || !res.data) {
        wx.showToast({ title: res.message || '加入失败', icon: 'none' })
        return
      }
      const room = res.data
      this.setData({
        room,
        roomId: room._id || '',
        roomCode: room.code,
        isHost: false,
        players: this.padPlayers(room.players || [], room.maxPlayers || 4),
      })
      this.watchRoom(room._id || '')
    } catch (error) {
      console.error(error)
      wx.showToast({ title: '加入失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  watchRoom(roomId) {
    if (this.data.watcher) this.data.watcher.close()
    if (!roomId) return
    const db = wx.cloud.database()
    const watcher = db.collection('rooms').doc(roomId).watch({
      onChange: (snap) => {
        const room = snap.docs && snap.docs[0]
        if (!room) return
        // 房间被解散
        if (room.status === 'dissolved') {
          if (this.data.watcher) this.data.watcher.close()
          getApp().globalData.activeRoomId = null
          wx.showModal({ title: '房间已解散', content: '房主解散了房间', showCancel: false,
            success: () => wx.navigateBack() })
          return
        }
        this.setData({
          room,
          roomCode: room.code,
          players: this.padPlayers(room.players || [], room.maxPlayers || 4),
          isHost: !!(room.players || []).some((p) => p.isHost),
        })
      },
      onError: (err) => console.error('room watch error', err),
    })
    this.setData({ watcher })
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => wx.showToast({ title: '已复制口令', icon: 'success' }),
    })
  },

  onJoinInput(e) {
    this.setData({ joinCode: e.detail.value })
  },

  onMatchTypeSelect(e) {
    this.setData({ matchType: e.currentTarget.dataset.type })
  },

  onPointsChange(e) {
    const options = [11, 15, 21]
    this.setData({ ruleset: { ...this.data.ruleset, pointsToWin: options[Number(e.detail.value)] } })
  },

  onDeuceChange(e) {
    this.setData({ ruleset: { ...this.data.ruleset, deuceEnabled: !!e.detail.value } })
  },

  onSetsChange(e) {
    const options = [1, 2, 3]
    this.setData({ ruleset: { ...this.data.ruleset, setsToWin: options[Number(e.detail.value)] } })
  },

  onPlayerCountChange(e) {
    const options = [2, 3, 4, 5, 6, 7, 8]
    this.setData({ ruleset: { ...this.data.ruleset, playerCount: options[Number(e.detail.value)] } })
  },

  async onJoinTap() {
    const code = this.data.joinCode.trim()
    if (!code) return wx.showToast({ title: '请输入口令', icon: 'none' })
    await this.joinByCode(code)
  },

  async onCreateTap() {
    if (!this.data.room) {
      await this.createNewRoom()
    }
  },

  onDissolveRoom() {
    wx.showModal({
      title: '解散房间',
      content: '确定要解散这个房间吗？所有玩家将被移出。',
      confirmText: '解散',
      confirmColor: '#ae3200',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const r = await manageRoom({ action: 'dissolve', roomId: this.data.roomId })
          if (r.code === 0) {
            getApp().globalData.activeRoomId = null
            wx.showToast({ title: '房间已解散', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1200)
          } else {
            wx.showToast({ title: r.message || '操作失败', icon: 'none' })
          }
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      },
    })
  },

  onKickPlayer(e) {
    const { openid, nickname } = e.currentTarget.dataset
    wx.showModal({
      title: '踢出玩家',
      content: `确定将「${nickname}」移出房间？`,
      confirmText: '踢出',
      confirmColor: '#ae3200',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const r = await manageRoom({ action: 'kick', roomId: this.data.roomId, targetOpenid: openid })
          if (r.code !== 0) wx.showToast({ title: r.message || '操作失败', icon: 'none' })
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      },
    })
  },

  async onStartMatch() {
    if (!this.data.roomId) return
    const players = (this.data.players || []).filter(p => !p.empty)
    if (players.length < 2) {
      wx.showModal({ title: '人数不足', content: '至少需要 2 名玩家才能开始比赛', showCancel: false })
      return
    }
    try {
      const res = await startMatch({ roomId: this.data.roomId })
      if (res.code === 0 && res.data) {
        getApp().globalData.activeRoomId = null  // 比赛开始，房间结束
        wx.redirectTo({ url: `/pages/score/index?matchId=${res.data.matchId}` })
      } else {
        wx.showModal({ title: '无法开始', content: res.message || '开始失败，请稍后重试', showCancel: false })
      }
    } catch (err) {
      console.error('start match error:', err)
      wx.showModal({ title: '无法开始', content: '网络异常，请检查连接后重试', showCancel: false })
    }
  },
})

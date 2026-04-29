import { createRoom, joinRoom, startMatch } from '../../utils/cloudHelper'
import type { MatchType, Ruleset, Room, RoomPlayer } from '../../types/index'

Page({
  data: {
    mode: 'create' as 'create' | 'join',
    roomId: '',
    roomCode: '',
    joinCode: '',
    matchType: 'doubles' as MatchType,
    ruleset: {
      pointsToWin: 21,
      deuceEnabled: true,
      setsToWin: 2,
    } as Ruleset,
    room: null as Room | null,
    players: [] as Array<RoomPlayer | { empty: true }>,
    isHost: false,
    loading: false,
    watcher: null as WechatMiniprogram.Cloud.DatabaseWatcher | null,
  },

  async onLoad(query: Record<string, string>) {
    const mode = query.mode === 'join' ? 'join' : 'create'
    this.setData({ mode })

    if (mode === 'join' && query.code) {
      this.setData({ joinCode: query.code })
      await this.joinByCode(query.code)
      return
    }

    if (mode === 'create') {
      await this.createNewRoom()
    }
  },

  onUnload() {
    this.data.watcher?.close()
    this.setData({ watcher: null })
  },

  onHide() {
    this.data.watcher?.close()
    this.setData({ watcher: null })
  },

  padPlayers(players: RoomPlayer[], maxPlayers: number) {
    const list: Array<RoomPlayer | { empty: true }> = [...players]
    while (list.length < maxPlayers) list.push({ empty: true })
    return list
  },

  async createNewRoom() {
    this.setData({ loading: true })
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
    } catch (error) {
      console.error(error)
      wx.showToast({ title: '创建失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async joinByCode(code: string) {
    this.setData({ loading: true })
    try {
      const res = await joinRoom({ code, team: 'A' })
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

  watchRoom(roomId: string) {
    this.data.watcher?.close()
    if (!roomId) return
    const db = wx.cloud.database()
    const watcher = db.collection('rooms').doc(roomId).watch({
      onChange: (snap) => {
        const room = snap.docs?.[0]
        if (!room) return
        this.setData({
          room,
          roomCode: room.code,
          players: this.padPlayers(room.players || [], room.maxPlayers || 4),
          isHost: !!room.players?.some((p: RoomPlayer) => p.isHost),
        })
      },
      onError: (err) => console.error('room watch error', err),
    })
    this.setData({ watcher })
  },

  onJoinInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ joinCode: e.detail.value })
  },

  onMatchTypeSelect(e: WechatMiniprogram.CustomEvent) {
    this.setData({ matchType: e.currentTarget.dataset.type as MatchType })
  },

  onPointsChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ ruleset: { ...this.data.ruleset, pointsToWin: Number(e.detail.value) as 11 | 15 | 21 } })
  },

  onDeuceChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ ruleset: { ...this.data.ruleset, deuceEnabled: !!e.detail.value } })
  },

  onSetsChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ ruleset: { ...this.data.ruleset, setsToWin: Number(e.detail.value) as 1 | 2 | 3 } })
  },

  async onCreateTap() {
    if (!this.data.room) {
      await this.createNewRoom()
    }
  },

  async onJoinTap() {
    const code = this.data.joinCode.trim()
    if (!code) return wx.showToast({ title: '请输入口令', icon: 'none' })
    await this.joinByCode(code)
  },

  async onStartMatch() {
    if (!this.data.roomId) return
    const res = await startMatch({ roomId: this.data.roomId })
    if (res.code === 0 && res.data) {
      wx.redirectTo({ url: `/pages/score/index?matchId=${res.data.matchId}` })
    } else {
      wx.showToast({ title: res.message || '开始失败', icon: 'none' })
    }
  },
})

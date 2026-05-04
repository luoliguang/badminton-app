Page({
  data: {
    matchMode: 'duel', // duel | trio
    phase: 'playing',

    teamA: 'TEAM BLUE',
    teamB: 'TEAM RED',
    scoreA: 0,
    scoreB: 0,

    players: [
      { id: 'p1', name: 'PLAYER A', totalScore: 0 },
      { id: 'p2', name: 'PLAYER B', totalScore: 0 },
      { id: 'p3', name: 'PLAYER C', totalScore: 0 },
    ],
    onCourtLeftId: 'p1',
    onCourtRightId: 'p2',
    waitingId: 'p3',
    roundScoreLeft: 0,
    roundScoreRight: 0,
    roundIndex: 1,
    rankings: [],

    defaultTime: 10 * 60,
    timeLeft: 10 * 60,
    formattedTime: '10:00',
    isRunning: false,
    timer: null,
    isLeftLeading: false,
    isRightLeading: false,
    isALeading: false,
    isBLeading: false,
    isTimeCritical: false,
    touchStartYLeft: 0,
    touchStartYRight: 0,
    isMinimalTheme: false,
  },

  onLoad() {
    this.updateDerived();
  },

  onUnload() {
    this.clearTimer();
  },

  formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  },

  getPlayerById(id) {
    return this.data.players.find((p) => p.id === id);
  },

  updateDerived() {
    const {
      scoreA,
      scoreB,
      roundScoreLeft,
      roundScoreRight,
      timeLeft,
      onCourtLeftId,
      onCourtRightId,
      waitingId,
    } = this.data;

    const leftPlayer = this.getPlayerById(onCourtLeftId);
    const rightPlayer = this.getPlayerById(onCourtRightId);
    const waitingPlayer = this.getPlayerById(waitingId);

    this.setData({
      formattedTime: this.formatTime(timeLeft),
      isALeading: scoreA > scoreB,
      isBLeading: scoreB > scoreA,
      isLeftLeading: roundScoreLeft > roundScoreRight,
      isRightLeading: roundScoreRight > roundScoreLeft,
      isTimeCritical: timeLeft > 0 && timeLeft <= 60,
      leftPlayerName: leftPlayer ? leftPlayer.name : '',
      rightPlayerName: rightPlayer ? rightPlayer.name : '',
      waitingPlayerName: waitingPlayer ? waitingPlayer.name : '',
    });
  },

  startTimer() {
    if (this.data.timer || this.data.timeLeft <= 0 || this.data.phase !== 'playing') return;
    const timer = setInterval(() => {
      const next = this.data.timeLeft - 1;
      if (next <= 0) {
        this.clearTimer();
        this.setData({ timeLeft: 0, isRunning: false });
        this.updateDerived();
        return;
      }
      this.setData({ timeLeft: next });
      this.updateDerived();
    }, 1000);
    this.setData({ timer, isRunning: true });
  },

  pauseTimer() {
    this.clearTimer();
    this.setData({ isRunning: false });
  },

  clearTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  toggleTimer() {
    if (this.data.phase !== 'playing') return;
    this.data.isRunning ? this.pauseTimer() : this.startTimer();
  },

  resetTimer() {
    this.clearTimer();
    this.setData({ timeLeft: this.data.defaultTime, isRunning: false });
    this.updateDerived();
  },

  adjustTime(e) {
    if (this.data.isRunning || this.data.phase !== 'playing') return;
    const deltaMin = Number(e.currentTarget.dataset.delta || 0);
    const next = Math.max(0, this.data.timeLeft + deltaMin * 60);
    this.setData({ timeLeft: next, defaultTime: next });
    this.updateDerived();
  },

  changeScoreByGesture(side, delta) {
    if (this.data.phase !== 'playing') return;

    if (this.data.matchMode === 'duel') {
      if (side === 'LEFT') {
        this.setData({ scoreA: Math.max(0, this.data.scoreA + delta) });
      } else {
        this.setData({ scoreB: Math.max(0, this.data.scoreB + delta) });
      }
    } else {
      if (side === 'LEFT') {
        this.setData({ roundScoreLeft: Math.max(0, this.data.roundScoreLeft + delta) });
      } else {
        this.setData({ roundScoreRight: Math.max(0, this.data.roundScoreRight + delta) });
      }
    }

    this.updateDerived();
  },

  onScoreTouchStartA(e) {
    this.setData({ touchStartYLeft: e.touches[0].clientY });
  },

  onScoreTouchEndA(e) {
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - this.data.touchStartYLeft;
    if (Math.abs(deltaY) < 18) return;
    this.changeScoreByGesture('LEFT', deltaY < 0 ? 1 : -1);
  },

  onScoreTouchStartB(e) {
    this.setData({ touchStartYRight: e.touches[0].clientY });
  },

  onScoreTouchEndB(e) {
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - this.data.touchStartYRight;
    if (Math.abs(deltaY) < 18) return;
    this.changeScoreByGesture('RIGHT', deltaY < 0 ? 1 : -1);
  },

  updatePlayerNameById(playerId, value) {
    const upper = (value || '').toUpperCase();
    const players = this.data.players.map((p) => (p.id === playerId ? { ...p, name: upper } : p));
    this.setData({ players });
    this.updateDerived();
  },

  onTeamAInput(e) {
    if (this.data.matchMode === 'duel') {
      this.setData({ teamA: (e.detail.value || '').toUpperCase() });
      this.updateDerived();
      return;
    }
    this.updatePlayerNameById(this.data.onCourtLeftId, e.detail.value);
  },

  onTeamBInput(e) {
    if (this.data.matchMode === 'duel') {
      this.setData({ teamB: (e.detail.value || '').toUpperCase() });
      this.updateDerived();
      return;
    }
    this.updatePlayerNameById(this.data.onCourtRightId, e.detail.value);
  },

  finishRound() {
    if (this.data.phase !== 'playing' || this.data.matchMode !== 'trio') return;

    const { roundScoreLeft, roundScoreRight, onCourtLeftId, onCourtRightId, waitingId } = this.data;
    if (roundScoreLeft === roundScoreRight) {
      wx.showToast({ title: '平分请继续打', icon: 'none' });
      return;
    }

    let loserId = onCourtLeftId;
    let winnerId = onCourtRightId;
    let loserSide = 'left';

    if (roundScoreLeft > roundScoreRight) {
      loserId = onCourtRightId;
      winnerId = onCourtLeftId;
      loserSide = 'right';
    }

    const players = this.data.players.map((p) => {
      if (p.id === onCourtLeftId) return { ...p, totalScore: p.totalScore + roundScoreLeft };
      if (p.id === onCourtRightId) return { ...p, totalScore: p.totalScore + roundScoreRight };
      return p;
    });

    const nextState = {
      players,
      roundScoreLeft: 0,
      roundScoreRight: 0,
      roundIndex: this.data.roundIndex + 1,
      waitingId: loserId,
    };

    if (loserSide === 'left') {
      nextState.onCourtLeftId = waitingId;
      nextState.onCourtRightId = winnerId;
    } else {
      nextState.onCourtLeftId = winnerId;
      nextState.onCourtRightId = waitingId;
    }

    this.setData(nextState);
    this.updateDerived();
  },

  endMatch() {
    if (this.data.phase !== 'playing' || this.data.matchMode !== 'trio') return;
    if (this.data.roundScoreLeft !== 0 || this.data.roundScoreRight !== 0) {
      wx.showToast({ title: '请先结束当前局', icon: 'none' });
      return;
    }

    this.pauseTimer();
    const rankings = [...this.data.players].sort((a, b) => b.totalScore - a.totalScore);
    this.setData({ phase: 'finished', rankings });
  },

  restartMatch() {
    this.clearTimer();
    if (this.data.matchMode === 'duel') {
      this.setData({
        phase: 'playing',
        scoreA: 0,
        scoreB: 0,
        timeLeft: this.data.defaultTime,
        isRunning: false,
      });
      this.updateDerived();
      return;
    }

    this.setData({
      phase: 'playing',
      players: this.data.players.map((p, idx) => ({ ...p, totalScore: 0, id: `p${idx + 1}` })),
      onCourtLeftId: 'p1',
      onCourtRightId: 'p2',
      waitingId: 'p3',
      roundScoreLeft: 0,
      roundScoreRight: 0,
      roundIndex: 1,
      rankings: [],
      timeLeft: this.data.defaultTime,
      isRunning: false,
    });
    this.updateDerived();
  },

  applyMode(mode) {
    this.clearTimer();
    this.setData({
      matchMode: mode,
      phase: 'playing',
      scoreA: 0,
      scoreB: 0,
      players: [
        { id: 'p1', name: 'PLAYER A', totalScore: 0 },
        { id: 'p2', name: 'PLAYER B', totalScore: 0 },
        { id: 'p3', name: 'PLAYER C', totalScore: 0 },
      ],
      onCourtLeftId: 'p1',
      onCourtRightId: 'p2',
      waitingId: 'p3',
      roundScoreLeft: 0,
      roundScoreRight: 0,
      roundIndex: 1,
      rankings: [],
      timeLeft: this.data.defaultTime,
      isRunning: false,
    });
    this.updateDerived();
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.matchMode) return;

    const hasProgress =
      this.data.scoreA !== 0 ||
      this.data.scoreB !== 0 ||
      this.data.roundScoreLeft !== 0 ||
      this.data.roundScoreRight !== 0 ||
      this.data.players.some((p) => p.totalScore !== 0);

    if (!hasProgress) {
      this.applyMode(mode);
      return;
    }

    wx.showModal({
      title: '切换模式',
      content: '切换后将清空当前比分，是否继续？',
      success: (res) => {
        if (res.confirm) this.applyMode(mode);
      },
    });
  },

  toggleTheme() {
    this.setData({ isMinimalTheme: !this.data.isMinimalTheme });
  },
});
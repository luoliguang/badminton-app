const STORAGE_KEYS = {
  mode: 'score.matchMode',
  trioRules: 'score.trioRules',
};

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

    trioRuleTiePolicy: 'block', // block | leftLose | rightLose
    trioRuleEndMatchPolicy: 'block', // block | autoSettle

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
    actionHistory: [],
  },

  onLoad() {
    const mode = wx.getStorageSync(STORAGE_KEYS.mode);
    const trioRules = wx.getStorageSync(STORAGE_KEYS.trioRules) || {};

    if (mode === 'duel' || mode === 'trio') {
      this.setData({ matchMode: mode });
    }

    if (trioRules.tiePolicy || trioRules.endMatchPolicy) {
      this.setData({
        trioRuleTiePolicy: trioRules.tiePolicy || 'block',
        trioRuleEndMatchPolicy: trioRules.endMatchPolicy || 'block',
      });
    }

    if (this.data.matchMode === 'trio') {
      this.applyMode('trio');
      return;
    }

    this.updateDerived();
  },

  onUnload() {
    this.clearTimer();
  },

  snapshotState() {
    return JSON.parse(
      JSON.stringify({
        matchMode: this.data.matchMode,
        phase: this.data.phase,
        teamA: this.data.teamA,
        teamB: this.data.teamB,
        scoreA: this.data.scoreA,
        scoreB: this.data.scoreB,
        players: this.data.players,
        onCourtLeftId: this.data.onCourtLeftId,
        onCourtRightId: this.data.onCourtRightId,
        waitingId: this.data.waitingId,
        roundScoreLeft: this.data.roundScoreLeft,
        roundScoreRight: this.data.roundScoreRight,
        roundIndex: this.data.roundIndex,
        rankings: this.data.rankings,
      })
    );
  },

  pushHistory(type) {
    const item = { type, snapshot: this.snapshotState() };
    const next = [...this.data.actionHistory, item];
    if (next.length > 10) next.shift();
    this.setData({ actionHistory: next });
  },

  undoLastAction() {
    const history = this.data.actionHistory || [];
    if (!history.length) {
      wx.showToast({ title: '暂无可撤销操作', icon: 'none' });
      return;
    }

    const last = history[history.length - 1];
    const nextHistory = history.slice(0, -1);

    this.clearTimer();
    this.setData({ ...last.snapshot, actionHistory: nextHistory, isRunning: false });
    this.updateDerived();
    wx.showToast({ title: '已撤销', icon: 'none' });
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
      if (delta !== 0) this.pushHistory('duelScore');
      if (side === 'LEFT') {
        this.setData({ scoreA: Math.max(0, this.data.scoreA + delta) });
      } else {
        this.setData({ scoreB: Math.max(0, this.data.scoreB + delta) });
      }
    } else {
      if (delta !== 0) this.pushHistory('trioRoundScore');
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

  getTrioLoserInfo(roundScoreLeft, roundScoreRight) {
    if (roundScoreLeft > roundScoreRight) return { loserSide: 'right' };
    if (roundScoreRight > roundScoreLeft) return { loserSide: 'left' };

    if (this.data.trioRuleTiePolicy === 'leftLose') return { loserSide: 'left' };
    if (this.data.trioRuleTiePolicy === 'rightLose') return { loserSide: 'right' };
    return null;
  },

  finishRound() {
    if (this.data.phase !== 'playing') return;

    if (this.data.matchMode === 'duel') {
      this.pushHistory('duelFinishRound');
      this.setData({ scoreA: 0, scoreB: 0 });
      this.updateDerived();
      return;
    }

    const { roundScoreLeft, roundScoreRight, onCourtLeftId, onCourtRightId, waitingId } = this.data;
    const loserInfo = this.getTrioLoserInfo(roundScoreLeft, roundScoreRight);
    if (!loserInfo) {
      wx.showToast({ title: '平分请继续打', icon: 'none' });
      return;
    }

    this.pushHistory('trioFinishRound');

    const loserId = loserInfo.loserSide === 'left' ? onCourtLeftId : onCourtRightId;
    const winnerId = loserInfo.loserSide === 'left' ? onCourtRightId : onCourtLeftId;

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

    if (loserInfo.loserSide === 'left') {
      nextState.onCourtLeftId = waitingId;
      nextState.onCourtRightId = winnerId;
    } else {
      nextState.onCourtLeftId = winnerId;
      nextState.onCourtRightId = waitingId;
    }

    this.setData(nextState);
    this.updateDerived();
  },

  settleCurrentRoundIfNeeded() {
    if (this.data.roundScoreLeft === 0 && this.data.roundScoreRight === 0) return true;
    const loserInfo = this.getTrioLoserInfo(this.data.roundScoreLeft, this.data.roundScoreRight);
    if (!loserInfo) return false;
    this.finishRound();
    return true;
  },

  endMatch() {
    if (this.data.phase !== 'playing') return;

    if (this.data.matchMode === 'duel') {
      this.pushHistory('duelEndMatch');
      this.pauseTimer();
      const rankings = [
        { id: 'a', name: this.data.teamA || 'TEAM A', totalScore: this.data.scoreA },
        { id: 'b', name: this.data.teamB || 'TEAM B', totalScore: this.data.scoreB },
      ].sort((x, y) => y.totalScore - x.totalScore);
      this.setData({ phase: 'finished', rankings });
      return;
    }

    if (this.data.roundScoreLeft !== 0 || this.data.roundScoreRight !== 0) {
      if (this.data.trioRuleEndMatchPolicy === 'block') {
        wx.showToast({ title: '请先结束当前局', icon: 'none' });
        return;
      }

      const ok = this.settleCurrentRoundIfNeeded();
      if (!ok) {
        wx.showToast({ title: '平分无法自动结算', icon: 'none' });
        return;
      }
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
        actionHistory: [],
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
      lastAction: null,
    });
    this.updateDerived();
  },

  applyMode(mode) {
    this.clearTimer();
    wx.setStorageSync(STORAGE_KEYS.mode, mode);
    this.setData({
      matchMode: mode,
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
      timeLeft: this.data.defaultTime,
      isRunning: false,
      lastAction: null,
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

  onTiePolicyChange(e) {
    const idx = Number(e.detail.value);
    const map = ['block', 'leftLose', 'rightLose'];
    const value = map[idx] || 'block';
    this.setData({ trioRuleTiePolicy: value });
    wx.setStorageSync(STORAGE_KEYS.trioRules, {
      tiePolicy: value,
      endMatchPolicy: this.data.trioRuleEndMatchPolicy,
    });
  },

  onEndMatchPolicyChange(e) {
    const idx = Number(e.detail.value);
    const value = idx === 1 ? 'autoSettle' : 'block';
    this.setData({ trioRuleEndMatchPolicy: value });
    wx.setStorageSync(STORAGE_KEYS.trioRules, {
      tiePolicy: this.data.trioRuleTiePolicy,
      endMatchPolicy: value,
    });
  },

  toggleTheme() {
    this.setData({ isMinimalTheme: !this.data.isMinimalTheme });
  },
});
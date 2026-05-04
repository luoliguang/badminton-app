Page({
  data: {
    teamA: 'TEAM BLUE',
    teamB: 'TEAM RED',
    scoreA: 0,
    scoreB: 0,
    defaultTime: 10 * 60,
    timeLeft: 10 * 60,
    formattedTime: '10:00',
    isRunning: false,
    timer: null,
    isALeading: false,
    isBLeading: false,
    isTimeCritical: false,
    touchStartYA: 0,
    touchStartYB: 0,
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

  updateDerived() {
    const { scoreA, scoreB, timeLeft } = this.data;
    this.setData({
      formattedTime: this.formatTime(timeLeft),
      isALeading: scoreA > scoreB,
      isBLeading: scoreB > scoreA,
      isTimeCritical: timeLeft > 0 && timeLeft <= 60,
    });
  },

  startTimer() {
    if (this.data.timer || this.data.timeLeft <= 0) return;

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
    if (this.data.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  },

  resetTimer() {
    this.clearTimer();
    this.setData({
      timeLeft: this.data.defaultTime,
      isRunning: false,
    });
    this.updateDerived();
  },

  adjustTime(e) {
    if (this.data.isRunning) return;
    const deltaMin = Number(e.currentTarget.dataset.delta || 0);
    const next = Math.max(0, this.data.timeLeft + deltaMin * 60);
    this.setData({ timeLeft: next, defaultTime: next });
    this.updateDerived();
  },

  changeScoreByGesture(team, delta) {
    if (team === 'A') {
      this.setData({ scoreA: Math.max(0, this.data.scoreA + delta) });
    } else {
      this.setData({ scoreB: Math.max(0, this.data.scoreB + delta) });
    }
    this.updateDerived();
  },

  onScoreTouchStartA(e) {
    this.setData({ touchStartYA: e.touches[0].clientY });
  },

  onScoreTouchEndA(e) {
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - this.data.touchStartYA;
    if (Math.abs(deltaY) < 18) return;
    this.changeScoreByGesture('A', deltaY < 0 ? 1 : -1);
  },

  onScoreTouchStartB(e) {
    this.setData({ touchStartYB: e.touches[0].clientY });
  },

  onScoreTouchEndB(e) {
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - this.data.touchStartYB;
    if (Math.abs(deltaY) < 18) return;
    this.changeScoreByGesture('B', deltaY < 0 ? 1 : -1);
  },

  onTeamAInput(e) {
    this.setData({ teamA: e.detail.value.toUpperCase() });
  },

  onTeamBInput(e) {
    this.setData({ teamB: e.detail.value.toUpperCase() });
  },

  toggleTheme() {
    this.setData({ isMinimalTheme: !this.data.isMinimalTheme });
  },
});

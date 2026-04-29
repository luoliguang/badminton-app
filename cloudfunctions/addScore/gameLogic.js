function calcNewScore(current, team, delta) {
  return {
    ...current,
    A: team === 'A' ? Math.max(0, current.A + delta) : current.A,
    B: team === 'B' ? Math.max(0, current.B + delta) : current.B,
  }
}

function isMatchPoint(score, ruleset) {
  const { pointsToWin, deuceEnabled } = ruleset
  const threshold = pointsToWin - 1
  if (deuceEnabled) {
    const both = score.A >= threshold && score.B >= threshold
    if (both) return false
  }
  return score.A >= threshold || score.B >= threshold
}

function checkSetWinner(score, ruleset) {
  const { pointsToWin, deuceEnabled } = ruleset
  if (deuceEnabled) {
    if (score.A >= pointsToWin && score.A - score.B >= 2) return 'A'
    if (score.B >= pointsToWin && score.B - score.A >= 2) return 'B'
    return null
  }
  if (score.A >= pointsToWin) return 'A'
  if (score.B >= pointsToWin) return 'B'
  return null
}

module.exports = { calcNewScore, isMatchPoint, checkSetWinner }

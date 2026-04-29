const gameLogic = require('./gameLogic')

function callCloud(name, data) {
  return wx.cloud.callFunction({ name: name, data: data }).then((res) => res.result)
}

// 过滤掉数据库里残留的本地路径（以 / 开头），只保留 http/cloud:// URL
function safeAvatarUrl(url) {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('.')) return ''
  return url
}

function login() { return callCloud('login') }
function getStats() { return callCloud('getStats') }
function createRoom(params) { return callCloud('createRoom', params) }
function joinRoom(params) { return callCloud('joinRoom', params) }
function startMatch(params) { return callCloud('startMatch', params) }
function addScore(params) { return callCloud('addScore', params) }
function endMatch(params) { return callCloud('endMatch', params) }
function getMatchResult(params) { return callCloud('getMatchResult', params) }
function updateProfile(params) { return callCloud('updateProfile', params) }
function getRewards(params) { return callCloud('getRewards', params) }
function manageRoom(params) { return callCloud('manageRoom', params) }

module.exports = {
  callCloud,
  safeAvatarUrl,
  login,
  getStats,
  createRoom,
  joinRoom,
  startMatch,
  addScore,
  endMatch,
  getMatchResult,
  updateProfile,
  getRewards,
  manageRoom,
  gameLogic,
}

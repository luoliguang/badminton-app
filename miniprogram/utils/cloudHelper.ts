import type {
  AddScoreParams,
  CloudResult,
  CreateRoomParams,
  EndMatchParams,
  GetMatchResultParams,
  JoinRoomParams,
  Match,
  RankingItem,
  Room,
  RoomPlayer,
  StartMatchParams,
  UserProfile,
} from '../types/index'

export type LoginResult = UserProfile & { isNewUser: boolean }
export type StatsResult = {
  profile: UserProfile | null
  heatmap: Array<{ date: string; count: number }>
  recentMatches: Array<{ title: string; result: 'win' | 'lose'; time: string }>
}
export type CreateRoomResult = { room: Room; shareCode: string }
export type JoinRoomResult = Room
export type StartMatchResult = { matchId: string; match: Match }
export type AddScoreResult = {
  currentScore: Match['currentScore']
  isMatchPoint: boolean
  shouldEnd: boolean
  matchWinner: RoomPlayer['team'] | null
}
export type EndMatchResult = unknown
export type MatchResultData = {
  match: Match
  rankings: RankingItem[]
  scoreHistory: Array<{ team: string; delta: 1 | -1; snapA: number; snapB: number; byOpenid: string; ts: Date }>
  stats: Match['stats'] | null
}

export async function callCloud<T>(name: string, data?: Record<string, unknown>): Promise<CloudResult<T>> {
  const res = await wx.cloud.callFunction({ name, data })
  return res.result as CloudResult<T>
}

export async function login(): Promise<CloudResult<LoginResult>> {
  return callCloud<LoginResult>('login')
}

export async function getStats(): Promise<CloudResult<StatsResult>> {
  return callCloud<StatsResult>('getStats')
}

export async function createRoom(params: CreateRoomParams): Promise<CloudResult<CreateRoomResult>> {
  return callCloud<CreateRoomResult>('createRoom', params as Record<string, unknown>)
}

export async function joinRoom(params: JoinRoomParams): Promise<CloudResult<JoinRoomResult>> {
  return callCloud<JoinRoomResult>('joinRoom', params as Record<string, unknown>)
}

export async function startMatch(params: StartMatchParams): Promise<CloudResult<StartMatchResult>> {
  return callCloud<StartMatchResult>('startMatch', params as Record<string, unknown>)
}

export async function addScore(params: AddScoreParams): Promise<CloudResult<AddScoreResult>> {
  return callCloud<AddScoreResult>('addScore', params as Record<string, unknown>)
}

export async function endMatch(params: EndMatchParams): Promise<CloudResult<EndMatchResult>> {
  return callCloud<EndMatchResult>('endMatch', params as Record<string, unknown>)
}

export async function getMatchResult(params: GetMatchResultParams): Promise<CloudResult<MatchResultData>> {
  return callCloud<MatchResultData>('getMatchResult', params as Record<string, unknown>)
}

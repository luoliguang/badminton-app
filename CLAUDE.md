# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A WeChat Mini Program (微信小程序) for badminton scorekeeping, built with native WeChat cloud development (云开发). No independent server — everything runs through WeChat Cloud Functions and Cloud Database.

**Development tool**: WeChat DevTools (微信开发者工具). There is no CLI build/run/test command — all development, preview, and upload is done through the DevTools IDE.

## Current Implementation State

The project is partially implemented. Only `miniprogram/pages/score` is fully built; it runs **entirely offline** (no cloud calls). Cloud functions are mostly stubs (only `package.json` files exist for most). The planned TypeScript architecture in `.cursorrules` has not been implemented yet — the codebase is currently plain JavaScript.

## Architecture

### Source of Truth Files
- **`common/gameLogic.js`** — All game calculation logic (score math, rank calculation, room code generation, etc.). Both cloud functions and the frontend must import from here. Never duplicate this logic elsewhere.
- **`miniprogram/types/index.ts`** — Intended single location for all type definitions (not yet created). When TypeScript is adopted, all types go here.

### Directory Structure
```
miniprogram/        # Mini program frontend (WXML + WXSS + JS/TS)
  app.js            # Global App init, globalData.userInfo
  pages/score/      # Currently the only implemented page — offline scorekeeping
cloudfunctions/     # One directory per cloud function, each with index.js + package.json
common/             # Shared code between frontend and cloud functions
  gameLogic.js      # Shared game logic — cloud functions require() this
  index.js          # Common exports
```

### Cloud Functions
Each function returns `{ code: number, message: string, data: T | null }`. Use `ERROR_CODES` constants, never hardcoded numbers. All DB operations must be wrapped in try/catch.

Cloud functions access shared logic via:
```js
const { calcNewScore, isMatchPoint } = require('../../common/gameLogic')
```

### Score Page (`pages/score`)
The score page supports two modes stored in `wx.Storage`:
- **`duel`** — 2-team match, tracks `scoreA`/`scoreB`
- **`trio`** — 3-player rotation, tracks `roundScoreLeft`/`roundScoreRight` per round and `totalScore` per player

Score changes use swipe gestures (touch start/end Y delta). Undo works via a snapshot history stack (max 10 entries). All derived display state (`isALeading`, `isTimeCritical`, etc.) is computed in `updateDerived()` — never set these directly.

## Key Design Decisions

**Event sourcing for scores**: `scoreEvents` in cloud DB is append-only; undo appends `delta=-1`. This enables full replay and handles concurrent multi-device updates.

**Real-time sync**: Uses WeChat Cloud DB `watch()` API on the `matches` document. All players subscribe to the same `matchId`; any score write pushes to all subscribers automatically.

**Data denormalization**: `nickName` and `avatarUrl` are stored redundantly in `rooms.players[]` because Cloud DB has no JOIN support.

**Shared game logic**: `common/gameLogic.js` is imported by both cloud functions and the frontend so that match-point detection and set-winner logic cannot diverge between client prediction and server authority.

## Coupling Rules

When modifying these areas, check all downstream consumers:

| Changed | Must also update |
|---|---|
| `MatchType` enum | `MATCH_TYPE_CONFIG`, `createRoom` (maxPlayers), `endMatch` (rankings length), `PlayerCard` layout |
| `Ruleset` fields | `gameLogic.js` → `isMatchPoint`, `checkSetWinner`, `checkMatchWinner` |
| `UserProfile` fields | `login` cloud fn (init), `endMatch` (update), `getStats` (return), home page (display) |
| `ScoreEvent` structure | `addScore` (write), `gameLogic.replayScoreEvents` (replay), score page + result page (render) |
| `ERROR_CODES` | All cloud functions (return) + all pages (error handling) |

## Design Tokens

- Background: `#011B3E` (deep navy)
- Brand accent: `#CCFF00` (fluorescent yellow-green)
- Secondary button: `#AE3200` (brick red)
- Border/nav: `#1E3A8A` (deep blue)
- Nav selected: `#A3E635` (bright green)
- Secondary text: `#4A5F85` (mid blue)
- Card background: `#F1F5F9` (light gray)

Page horizontal padding: 24px. Card inner padding: 18–26px. Bottom nav height: `56px + env(safe-area-inset-bottom)`. Numbers use `font-variant-numeric: tabular-nums`.

## Constraints

- OpenID must always come from cloud function `getWXContext()`, never hardcoded
- Use `wx.getUserProfile` — `wx.getUserInfo` is deprecated
- Components must be pure props-in / `triggerEvent`-out; no cloud calls inside components
- Real-time watchers opened in `onLoad` must be closed in `onUnload`
- Cloud function calls go through `utils/cloudHelper.ts` (planned), not direct `wx.cloud.callFunction`

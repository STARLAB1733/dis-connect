# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

- Node version: `v23.10.0` (use `nvm use 23.10.0`)
- Install: `npm install --legacy-peer-deps`
- Copy `.example.env.local` → `.env.local` and fill in Firebase keys

## Commands

```bash
npm run dev      # Start dev server with Turbopack at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npm test         # Run 65 Vitest unit tests + React Testing Library
```

## Architecture

DISConnect is a **multiplayer real-time game** built on Next.js 15 (App Router) + Firebase (Firestore + Anonymous Auth). Players join lobbies, complete scenario chapters in parallel, and receive a persona/vocation recommendation at the end.

### Game Flow

```
/ (Home)  →  /lobby/[lobbyId]  →  /game/[lobbyId]  →  /results/[lobbyId]  →  /leaderboard
```

1. **Home** (`src/app/page.tsx`): Create or join a lobby by ID.
2. **Lobby** (`src/app/lobby/[lobbyId]/page.tsx`): Players join (Firebase Anonymous Auth), host sets team name (2+ players only). Lobby doc in Firestore tracks `players[]`, `started`, `currentRoles`, `rotationIdx`, `chapterIdx`.
3. **Game** (`src/app/game/[lobbyId]/page.tsx`): Real-time sync via `onSnapshot`. Each player sees their role's sub-scenario. When everyone submits (`roundAnswers`), host advances to next chapter. 12 individual chapters (3 arcs × 4 chapters) + group question phases at arc end.
4. **Group Question Phase** (`src/app/game/[lobbyId]/[groupQuestionMode]`): After each arc (2+ players only), team discusses and facilitator wagers/submits answer. Solo players skip this.
5. **Results** (`src/app/results/[lobbyId]/page.tsx`): Reads `logs` subcollection, computes persona/vocation, writes scores to Firestore leaderboard collections.
6. **Leaderboard** (`src/app/leaderboard/page.tsx`): Global view of team and individual scores (team scores only for 2+ player games).

### Scenario Content

- **Structure**: 3 arcs, 4 chapters each → 12 JSON files in `src/scenarios/arc{1-3}-ch{1-4}.json`.
- **Arc themes**: Arc 1 = NDP 2026, Arc 2 = Exercise Northstar, Arc 3 = Ops Resilience.
- Each scenario JSON has `subScenarios` keyed by role (`software-engineer`, `data-scientist`, `cloud-engineer`). Each player sees only their role's sub-scenario simultaneously.
- **Sub-scenario types** (defined in `src/types/scenario.ts`):
  - `drag-drop` (variant `order`): reorder a list; scored by positional correctness ratio.
  - `drag-drop` (variant `layout`): assign items to zones; scored by distance from correct zone.
  - `numeric-input`: guess a number; scored by proximity within tolerance.
  - `binary-choice`: pick an option; each option carries its own `axisImpact`.

### Role Rotation

`src/lib/roleRotation.ts` — Roles (`software-engineer`, `data-scientist`, `cloud-engineer`) rotate after each arc. `rotationIdx` increments at arc boundaries so players experience all three roles across the game.

### Scoring & Persona System

- **`ScenarioWrapper`** (`src/components/ScenarioWrapper.tsx`): Computes a `weightedImpact` (axis scores scaled by performance ratio) and writes it to `lobbies/{lobbyId}/logs`.
- **Axes** (`src/lib/persona.ts`): `Innovation`, `Stability`, `Speed`, `Precision`, `Cost-Conscious`, `Performance-First`, `Autonomy`, `Collaboration`. `computePersona()` normalizes summed impacts to 0–100.
- **Persona identity** (`src/lib/personaMapping.ts`): Maps top two axes to a named archetype (e.g. "The Visionary Architect"). SVG icons live in `public/personas/`.
- **Vocation**: The C4X role (SE / DS / CE) with the highest cumulative absolute axis impact becomes the recommended vocation.

### Firestore Data Model

```
lobbies/{lobbyId}
  ├── players[]           # { uid, name }
  ├── started, finished
  ├── arcIdx, chapterIdx, rotationIdx
  ├── currentRoles        # { uid → role }
  ├── roundAnswers        # { uid → true }
  ├── teamName
  └── logs/{docId}        # { playerId, role, axisImpact, result, timestamp, ... }

events/global/scores/{uid}  # Individual leaderboard entries
events/{teamName}/scores/{uid}

teams/{teamName}            # Team aggregate { playerScores, totalScore, avgScore }
```

### Key Libraries

- **`@dnd-kit`**: Drag-and-drop in `DragDropOrderStep` and `DragDropLayoutStep`.
- **`react-firebase-hooks`**: `useAuthState` for auth.
- **`react-chartjs-2` / `chart.js`**: Radar and bar charts on results page.
- **`react-qr-code`**: QR code for lobby sharing.
- **`AudioProvider`** (`src/components/AudioProvider.tsx`): Context providing BGM crossfade and SFX. Audio files live in `public/audio/` (`bgm-lobby.wav`, `bgm-game.wav`, `sfx-{select,success,advance,complete}.wav`). Mute preference persisted in `localStorage`.

### Adding a New Scenario

1. Create `src/scenarios/arc{N}-ch{M}.json` following the schema in `src/types/scenario.ts`.
2. Import and register it in `src/lib/scenarioLoader.ts` in the `ARCS` array.
3. Add a chapter illustration SVG to `public/chapters/`.

## Deployment

- **Vercel**: Project is auto-deployed to Vercel on push to `main` branch
- **Firebase**: Ensure Firestore and Auth are enabled; service account key required for admin scripts
- **Environment**: Set Firebase keys in `.env.local` (dev) or Vercel dashboard (production)
- **Leaderboard Reset**: Run `node scripts/clear-leaderboard.mjs` before new cohorts (requires `serviceAccountKey.json`)

## Testing

- **Run tests**: `npm test`
- **Coverage**: 65 tests covering persona system, role rotation, and scoring logic
- **Framework**: Vitest v2 + React Testing Library + happy-dom
- **Test files**: `src/**/__tests__/*.test.ts(x)`

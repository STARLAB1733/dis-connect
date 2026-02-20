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
```

No test suite is configured.

## Architecture

DISConnect is a **multiplayer real-time game** built on Next.js 15 (App Router) + Firebase (Firestore + Anonymous Auth). Players join lobbies, complete scenario chapters in parallel, and receive a persona/vocation recommendation at the end.

### Game Flow

```
/ (Home)  →  /lobby/[lobbyId]  →  /game/[lobbyId]  →  /results/[lobbyId]
```

1. **Home** (`src/app/page.tsx`): Create or join a lobby by ID.
2. **Lobby** (`src/app/lobby/[lobbyId]/page.tsx`): Players join (Firebase Anonymous Auth), host sets team name and starts the game. Lobby doc in Firestore tracks `players[]`, `started`, `currentRoles`, `rotationIdx`, `chapterIdx`.
3. **Game** (`src/app/game/[lobbyId]/page.tsx`): Real-time sync via `onSnapshot`. Each player sees their role's sub-scenario. When everyone submits (`roundAnswers`), the host advances to the next chapter. 12 total chapters (3 arcs × 4 chapters).
4. **Results** (`src/app/results/[lobbyId]/page.tsx`): Reads `logs` subcollection, computes persona/vocation, writes scores to Firestore leaderboard collections.
5. **Leaderboard** (`src/app/leaderboard/page.tsx`): Global view of team and individual scores.

### Scenario Content

- **Structure**: 3 arcs (`arc1`–`arc3`), 4 chapters each → 12 JSON files in `src/scenarios/`.
- **Arc themes**: Arc 0 = NDP 2026, Arc 1 = Exercise Northstar, Arc 2 = Ops Resilience.
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

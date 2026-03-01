# DISConnect

A real-time multiplayer decision-making game built for SAF Digital and Intelligence Service (DIS) recruitment events. Three players collaborate through 12 mission chapters, making role-based decisions that reveal their technical persona and recommended C4X vocation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / DB | Firebase Firestore (real-time) |
| Auth | Firebase Anonymous Auth |
| Drag & Drop | @dnd-kit |
| Charts | Chart.js + react-chartjs-2 |
| Testing | Vitest v2 + React Testing Library + happy-dom |
| Deployment | Vercel |

---

## Setup

**Prerequisites:** Node.js v23.10.0 (use `nvm use 23.10.0`)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp example.env.local .env.local
# Fill in your Firebase project keys in .env.local

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

Other commands:

```bash
npm run build   # Production build
npm run lint    # ESLint
npm test        # Run 65 automated tests
```

---

## How to Play

DISConnect is designed for **3 players** playing together on their own devices (phones or laptops).

### Setup (1 minute)
1. One player opens the game and clicks **Create Lobby**
2. The others scan the QR code or enter the lobby code to join
3. Each player enters their name and selects a role:
   - **Software Engineer**
   - **Data Engineer**
   - **Cloud Engineer**
4. Once all 3 roles are filled, the game starts automatically

### Game (15–20 minutes)
The game consists of **12 chapters** across 3 mission arcs:
- **Arc 1 — NDP 2026**: Infrastructure and systems operations
- **Arc 2 — Exercise Northstar**: Intelligence and data operations
- **Arc 3 — Ops Resilience**: Crisis response and recovery

Each chapter presents a mission scenario. Every player answers **simultaneously** from their role's perspective. Answer types include:
- **Binary choice** — pick an approach
- **Numeric estimate** — enter a value within tolerance
- **Drag to order** — rank items by priority
- **Drag to layout** — assign items to deployment zones

Roles **rotate between arcs** so every player experiences all three roles across the game. Once all players submit, the chapter advances automatically.

### Disconnection
- If a player drops out, the host sees a **Skip** button after 30 seconds
- After the first skip, all subsequent drops are skipped instantly
- A disconnected player can **rejoin** by re-entering the lobby URL — they'll be redirected straight back into the active game

### Results
After all 12 chapters, each player sees their personal **Persona Report**:
- **Score** and team ranking on the leaderboard
- **Recommended vocation** (SE / Data Engineer / Cloud Engineer) based on cumulative performance
- **Vocation breakdown** — score contribution per arc
- **Persona archetype** — named persona derived from 8 decision axes (e.g. *The Visionary Architect*)
- **Radar chart** of axis scores

---

## Contributors

ME4 Anthony Tan · ME4 Wilson Gwee · ME4 Keith Chew

Music by Matthew Pablo · CC BY 3.0 · opengameart.org

---

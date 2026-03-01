# DISConnect — Facilitator Admin Guide

This guide covers everything a game facilitator needs to run a session of DISConnect: how the game works, how scoring is calculated, what the correct answers are for every question and why, and how to manage game data.

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Setup & Running a Session](#2-setup--running-a-session)
3. [Game Flow in Detail](#3-game-flow-in-detail)
4. [Scoring System](#4-scoring-system)
5. [Persona & Vocation System](#5-persona--vocation-system)
6. [Scenarios: Correct Answers & Rationale](#6-scenarios-correct-answers--rationale)
   - [Arc 1 — NDP 2026: The Show Must Go On](#arc-1--ndp-2026-the-show-must-go-on)
   - [Arc 2 — Exercise Northstar: Digitise the Fight](#arc-2--exercise-northstar-digitise-the-fight)
   - [Arc 3 — Ops Resilience: Singapore Goes Dark](#arc-3--ops-resilience-singapore-goes-dark)
7. [Group Question Phase](#7-group-question-phase)
   - [Arc 1 Group Questions](#arc-1-group-questions)
   - [Arc 2 Group Questions](#arc-2-group-questions)
   - [Arc 3 Group Questions](#arc-3-group-questions)
8. [Admin Operations](#8-admin-operations)

---

## 1. Game Overview

DISConnect is a multiplayer technology decision-making simulation for student audiences. Players take on roles as digital professionals (Software Engineer, Data Engineer, Cloud Engineer) and work through crises across 3 arcs. At the end, each player receives a persona profile and a recommended C4X vocation based on their decision patterns.

**Core parameters:**
- 3 arcs × 4 chapters = **12 total chapters**
- Each chapter: all players work simultaneously on their own role-specific sub-scenario
- After each arc (if 2+ players): **Group Question Phase** — 2 team wager-and-vote questions facilitated by a rotating player
- Total game time (guided): approximately 45–90 minutes depending on group size and discussion depth

---

## 2. Setup & Running a Session

### Prerequisites
- A device (laptop/desktop) with `npm run dev` or a deployed production URL
- Firebase project configured (`.env.local` with Firebase keys)
- Players using phones, tablets, or laptops — any modern browser

### Starting a Session

1. **Facilitator opens** `http://localhost:3000` (or production URL) and clicks **Create Lobby**
2. The lobby generates a 6-character code — share this with players
3. Players open the URL and enter the lobby code to join
4. Facilitator (or any player) enters a **Team Name** — this is used for leaderboard tracking
5. Facilitator clicks **Start Game** when all players have joined

### Role Assignment at Start
Roles are assigned by player join order and rotate after each arc:

| Arc | Player 0 (joined first) | Player 1 | Player 2 |
|-----|------------------------|----------|----------|
| Arc 1 | Software Engineer | Data Engineer | Cloud Engineer |
| Arc 2 | Data Engineer | Cloud Engineer | Software Engineer |
| Arc 3 | Cloud Engineer | Software Engineer | Data Engineer |

With more than 3 players, the pattern repeats cyclically. With 1 player, they cycle through all three roles across arcs.

### Group Question Facilitator Rotation
The **group question facilitator** (the player who controls wager selection and answer submission) rotates per arc:
- Arc 1 → Player 0 (first to join)
- Arc 2 → Player 1
- Arc 3 → Player 2
- Wraps around if fewer than 3 players

The facilitator is the **only** player who can lock in a wager and submit the team's answer. All other players observe and discuss.

---

## 3. Game Flow in Detail

```
Lobby → Arc 1 Ch1 → Ch2 → Ch3 → Ch4 → [Group Q Phase] →
         Arc 2 Ch1 → Ch2 → Ch3 → Ch4 → [Group Q Phase] →
         Arc 3 Ch1 → Ch2 → Ch3 → Ch4 → [Group Q Phase] →
         Results Page
```

### Within Each Chapter
1. All players see their **own role's sub-scenario** simultaneously
2. Each player completes their question independently
3. When **all players have submitted**, the host device auto-advances to the next chapter
4. There is no waiting animation — the game moves when everyone submits

### Question Types

| Type | Description | Scoring |
|------|-------------|---------|
| `drag-drop (order)` | Reorder a list of 5 items | Score = fraction of items in correct position |
| `drag-drop (layout)` | Assign items to zones (Slot 1 = first priority, etc.) | Score = fraction of items matched to correct zone |
| `numeric-input` | Guess a number within a tolerance band | Score = `1 - (|guess - expected| / tolerance)`, clamped 0–1 |
| `binary-choice` | Pick one of 4 options | Score = 1.0 (full credit) regardless of option chosen |

The **score multiplier** (0.0–1.0) is applied to the question's `axisImpact` values when writing to Firestore logs. A perfect answer maximises the axis impact; a poor answer reduces it proportionally.

### Group Question Phase
Triggered after each arc if there are **2 or more players**.

- The facilitator player selects a **wager multiplier** (options vary per question: e.g. 1×, 2×, 3×)
- After wager is locked, the facilitator picks one of 4 options on behalf of the team
- The chosen option's `axisImpact` is multiplied by the wager and logged as `playerId: '__team__'`
- All players see a reveal screen, then the facilitator advances to the next question
- After both group questions, the game proceeds to the next arc

---

## 4. Scoring System

### Individual Axis Scoring

Each question carries an `axisImpact` object, e.g.:
```json
{ "Precision": 1.0, "Stability": 0.8, "Speed": -0.5 }
```

The **weighted impact** written to the log is:
```
weightedImpact[axis] = axisImpact[axis] × performanceScore
```

Where `performanceScore` ∈ [0, 1] based on answer accuracy (see table above).

Negative axis values are intentional — some choices trade off one axis against another. They are applied as-is (not clamped).

### Group Question Scoring

The team's wagered impact:
```
wageredImpact[axis] = option.axisImpact[axis] × wagerMultiplier
```

This is stored with `playerId: '__team__'` and `isGroupQuestion: true`. It does **not** count toward individual player persona scores; it contributes only to the team's group score displayed on the results page.

### Persona Computation (`computePersona`)

At game end, all individual log entries for a player are summed per axis:
```
totals[axis] = sum of all weightedImpact[axis] entries for that player
```

Then normalised to a 0–100 scale:
```
maxV = max(|totals[axis]|) across all axes (minimum 1)
normalised[axis] = round((totals[axis] / maxV) × 50 + 50)
```

This means:
- The axis with the highest absolute total always lands at **100** (if positive) or **0** (if negative)
- Axes with no impact land at **50** (neutral)
- The scale reflects relative strength, not absolute magnitude

### Vocation Scoring (`computePerRoleScores`)

The recommended vocation is determined by which role accumulated the **highest total absolute axis impact** across all chapters played in that role:
```
roleScore[role] = sum of |axisImpact[axis]| for every chapter played as that role
```

The role with the highest cumulative score becomes the recommended C4X vocation.

---

## 5. Persona & Vocation System

### The 8 Axes

| Axis | Represents |
|------|-----------|
| **Innovation** | Preference for novel, experimental approaches |
| **Stability** | Preference for reliable, proven, low-risk solutions |
| **Speed** | Prioritising fast delivery and quick wins |
| **Precision** | Prioritising accuracy, correctness, and thoroughness |
| **Cost-Conscious** | Awareness of resource efficiency and budget |
| **Performance-First** | Prioritising throughput, capacity, and raw performance |
| **Autonomy** | Preference for independent, self-directed working |
| **Collaboration** | Preference for team-based, shared-ownership approaches |

### Persona Archetypes

The top two normalised axes determine the player's archetype:

| Archetype | Top Two Axes |
|-----------|-------------|
| The Visionary Architect | Innovation + Autonomy |
| The Precision Engineer | Stability + Precision |
| The Rapid Deployer | Speed + Performance-First |
| The Strategic Coordinator | Cost-Conscious + Collaboration |
| The Creative Collaborator | Innovation + Collaboration |
| The Pragmatic Steward | Stability + Cost-Conscious |
| The Performance Tactician | Precision + Performance-First |
| The Cutting-Edge Sprinter | Innovation + Performance-First |
| The Steadfast Soloist | Autonomy + Stability |
| The Agile Team Player | Speed + Collaboration |
| The Balanced Integrator | (fallback — no strong top pair) |

If no two-axis match is found, the system falls back to matching on the single top axis. If still no match, "The Balanced Integrator" is returned.

### Vocations

| Vocation Label | Role Key |
|---------------|----------|
| Software Engineer | `software-engineer` |
| Data Science & AI | `data-scientist` |
| Cloud Engineer | `cloud-engineer` |

---

## 6. Scenarios: Correct Answers & Rationale

For **drag-drop order** questions, the correct sequence is listed step-by-step.
For **drag-drop layout** questions, the correct zone assignment is listed.
For **numeric-input** questions, the expected value and tolerance are listed.
For **binary-choice** questions, all options are listed with their axis impacts; the **recommended pick** is highlighted and explained.

---

### Arc 1 — NDP 2026: The Show Must Go On

The team is building and operating a companion app for 40,000 NDP 2026 attendees under extreme time pressure.

---

#### Arc 1, Chapter 1 — T-Minus 3 Weeks

**Software Engineer — "Plan the Parade App Feature" (drag-drop order)**

Correct sequence:
1. Write a shared rulebook so different parts of the team can build at the same time without conflicting
2. Build a quick test to see if the phone camera can recognise the parade floats
3. Set up the servers that send float information to phones
4. Test the new feature inside the existing NDP app to make sure nothing breaks
5. Simulate 40,000 people using the app at once to see if the servers can handle it

**Why:** The API specification comes first so parallel development doesn't create conflicts. The AR prototype (camera recognition) is the riskiest unknown and must be proven before investing in backend work. Integration testing happens before load testing — you test correctness before testing scale.

Axes awarded: Speed +1, Precision +0.5

---

**Data Engineer — "Forecast App Downloads" (numeric-input)**

Chart data: [8, 15, 28, 52] (thousands per week)
Expected answer: **95** (thousands) | Tolerance: ±25

**Why:** The weekly increase is accelerating: +7, +13, +24. The next gap is roughly double the last (+43), giving ~95. Players within ±25 (i.e., 70–120) receive full credit; the score degrades linearly outside that range.

Axes awarded: Precision +1, Cost-Conscious +0.5

---

**Cloud Engineer — "Pick a Hosting Plan" (binary-choice)**

| Option | Axes |
|--------|------|
| Serverless (auto-scale, cold-start risk) | Cost-Conscious +1, Innovation +0.5, Speed -0.3 |
| Reserved + Burst (reliable, always-on cost) | Stability +1, Performance-First +0.5, Cost-Conscious -0.5 |
| CDN Edge (fast static, slower live scanner) | Speed +1, Performance-First +0.5, Innovation -0.3 |
| **Hybrid Partner (gov-grade SLA, less control)** | **Collaboration +1, Stability +0.5, Autonomy -0.5** |

**Recommended pick:** **Serverless** — for a national event app that sits idle 364 days and spikes hard on one day, pay-as-you-go serverless is the most cost-effective and elastic choice. The 2-second cold-start affects only a small fraction of first-hour users. **Cloud Engineer/Hybrid Partner** is also strong for compliance-heavy government contexts.

There is no single "wrong" answer. Each option teaches a valid architectural trade-off.

---

#### Arc 1, Chapter 2 — Rehearsal Night Chaos

**Software Engineer — "Emergency Speed Fix" (binary-choice)**

| Option | Axes |
|--------|------|
| **Cache Layer (60% faster, minor staleness)** | **Speed +1, Performance-First +0.8, Precision -0.3** |
| Kill Features (disable scanner) | Stability +1, Speed +0.5, Innovation -0.5 |
| Optimise Queries (permanent fix, slow to apply) | Precision +1, Stability +0.5, Speed -0.5 |
| Queue Requests (loading spinner, no errors) | Collaboration +0.5, Stability +0.8, Performance-First -0.3 |

**Recommended pick:** **Cache Layer** — under a 20-minute countdown, a targeted fix that immediately improves 60% of the problem without risking the live system is the pragmatic choice. Float facts being a few minutes stale is acceptable during a rehearsal. Optimising queries is the right long-term answer but cannot be done safely under time pressure.

---

**Data Engineer — "Work Out How Many Servers You Need" (numeric-input)**

Chart data: [4, 12, 28, 40] (thousands of users online)
Expected answer: **11 servers** | Tolerance: ±3

**Why:** The data tops out around 40,000 users (the event capacity). Each server handles 5,000 users, so `ceil(40,000 / 5,000) = 8` minimum. With headroom for safe operation: 40,000 / 5,000 = 8 minimum, with headroom ~10–11 is the expected answer. Answers between 8–14 receive credit.

Axes awarded: Performance-First +1, Cost-Conscious +0.5

---

**Cloud Engineer — "Investigate the Infrastructure Failure" (drag-drop order)**

Correct sequence:
1. Pull up the live dashboard to see which parts of the system are under pressure
2. Look through the error logs from the last 10 minutes to spot repeating patterns
3. Match the spike timing to specific parts of the app to pinpoint where things are breaking
4. Follow individual slow requests through the system to see exactly where time is being lost
5. Write up the findings with charts so the rest of the team can act on them

**Why:** Start with the broadest view (dashboard) before narrowing to logs, then correlate the spike timing to isolate the component, then trace individual requests for root-cause depth. Report last — you document after you understand.

Axes awarded: Precision +1, Speed +0.5

---

#### Arc 1, Chapter 3 — Getting into the Show

**Software Engineer — "Rescue the Database" (drag-drop order)**

Correct sequence:
1. Immediately stop all new data from being written so nothing else gets corrupted
2. Compare the current state against the backup to see exactly what was lost
3. Restore from the 6-hour-old backup into a test environment first, not live
4. Replay the record of actions from the last 6 hours to recover the most recent changes
5. Run checks to confirm everything looks right, then switch the live app over to the restored database

**Why:** Stopping writes first is critical — any new write while the database is in an unknown state could compound the damage. Damage assessment before restoration prevents restoring to the wrong baseline. The backup goes to a test environment (never live) to validate before any cutover.

Axes awarded: Precision +1, Stability +0.8

---

**Data Engineer — "Recover the Lost Data" (binary-choice)**

| Option | Axes |
|--------|------|
| Rebuild Full (2 hours, complete) | Precision +1, Stability +0.5, Speed -0.5 |
| **Estimate Stats (30 min, 85% accurate)** | **Speed +1, Innovation +0.5, Precision -0.3** |
| Focus Forward (skip recovery, better tracking) | Speed +0.8, Innovation +0.8, Precision -0.5 |
| Crowdsource Data (collaborate with marketing) | Collaboration +1, Innovation +0.5, Autonomy -0.3 |

**Recommended pick:** **Estimate Stats** — marketing needs data to be useful *now*, before the gates open. An 85%-accurate estimate delivered in 30 minutes meets the requirement; a perfect report delivered after gates open does not. The "Focus Forward" option is also defensible if the facilitator wants to emphasise that pre-event rehearsal data has limited value compared to NDP day itself.

---

**Cloud Engineer — "Rebuild the Infrastructure" (drag-drop layout)**

Correct zone assignment:
- **Slot 1 (Restore First):** Main Database — everything else depends on it
- **Slot 2 (Parallel Track A):** App Servers — can spin up once the database is available
- **Slot 3 (Parallel Track B):** Speed Cache — parallel to app servers, populates from database
- **Slot 4 (Final Verification):** Health Monitor — verify system health before going live

Items that are distractors (Load Balancer, Backup Database): these belong in a full production setup but are not in the scored correct-order list; they can be placed anywhere.

**Why:** The database is the foundation — nothing works without data. App servers and cache can restore in parallel once the database is confirmed healthy. The health monitor verifies the full stack before accepting live traffic.

Axes awarded: Stability +1, Precision +0.5

---

#### Arc 1, Chapter 4 — Showtime

**Software Engineer — "Fix the Livestream" (binary-choice)**

| Option | Axes |
|--------|------|
| Reduce Quality (1080p, instant) | Speed +1, Stability +0.8, Performance-First -0.5 |
| **Parallel Encode (add machines, 10 min setup)** | **Innovation +1, Performance-First +0.8, Stability -0.3** |
| CDN Switch (backup network, lose stats) | Speed +0.8, Collaboration +0.5, Autonomy -0.5 |
| **Adaptive Bitrate (smart per-viewer quality)** | **Innovation +0.8, Collaboration +0.3, Performance-First +0.5** |

**Recommended pick:** **Adaptive Bitrate** — it preserves 4K for viewers with the bandwidth to receive it while ensuring no one's video freezes. This is the best outcome for all 6 million viewers simultaneously and is the industry standard for large-scale live events. If time pressure is a primary concern, **CDN Switch** gets points for speed of execution.

---

**Data Engineer — "Predict Viewer Drop-off" (numeric-input)**

Chart data: [850, 780, 690, 610] (thousands of viewers)
Expected answer: **530** (thousands) | Tolerance: ±60

**Why:** The drop per minute: -70, -90, -80. Average drop ≈ -80/min. Next value ≈ 610 - 80 = 530. Any answer between 470–590 receives credit.

Axes awarded: Precision +1, Speed +0.5

---

**Cloud Engineer — "Reroute the Traffic" (drag-drop order)**

Correct sequence:
1. Check that all backup servers in other regions are healthy and ready
2. Load the backup servers with the latest video so viewers don't get a blank screen
3. Update the internet's address book to point traffic to multiple regions
4. Move 30% of traffic to backup servers first as a test run
5. Once confirmed stable, spread traffic evenly across all healthy servers

**Why:** You must confirm backup servers are healthy before sending traffic. Pre-warming (loading them with video content) prevents black screens when DNS routes viewers to them. The gradual 30% test run validates stability before committing the full shift.

Axes awarded: Stability +1, Speed +0.5

---

### Arc 2 — Exercise Northstar: Digitise the Fight

The team builds and operates a real-time command screen for Exercise Northstar, a major SAF exercise with 3,000 personnel.

---

#### Arc 2, Chapter 1 — D-30

**Software Engineer — "Design the Command Screen Layout" (drag-drop layout)**

Correct zone assignment:
- **Slot 1 (Main Display):** Live Map with Unit Positions — primary reference commanders check constantly
- **Slot 2 (Left Panel):** Supply Level Charts — critical but supporting information
- **Slot 3 (Right Panel):** Unit List and Readiness — reference panel
- **Slot 4 (Status Bar):** Radio Network Status — lightweight status info at a glance

Items that are distractors: Alert Feed, Weather Overlay — these are not in the scored list but can be placed in remaining slots.

**Why:** The live map is what commanders scan every few seconds during an exercise — it gets the most screen real estate. Supply and unit readiness are important reference data shown in side panels. Comms status is a lightweight indicator suited to a status bar.

Axes awarded: Innovation +1, Precision +0.5

---

**Data Engineer — "Choose How to Handle the Data Flow" (binary-choice)**

| Option | Axes |
|--------|------|
| Stream Processing (real-time, heavy compute) | Speed +1, Performance-First +0.8, Stability -0.3 |
| **Micro-batch (5-second updates, clean data)** | **Precision +1, Stability +0.5, Speed -0.3** |
| Edge Compute (80% less radio, loses raw data) | Cost-Conscious +1, Innovation +0.5, Precision -0.3 |
| Hybrid (critical alerts live, rest batched) | Stability +0.8, Innovation +0.5, Speed +0.3 |

**Recommended pick:** **Micro-batch** — for a military command screen, data quality matters more than milliseconds. A 5-second maximum latency is imperceptible in an exercise context, and clean, validated data prevents commanders from acting on false readings. **Hybrid** is also a strong operational choice for a facilitator who wants to discuss the nuance of "not all data is equally urgent."

---

**Cloud Engineer — "Set Up the Field Network" (drag-drop order)**

Correct sequence:
1. Walk the training ground to find areas with no signal and note any obstacles
2. Set up portable network relay nodes at key positions across the area
3. Configure a satellite uplink as a backup for when mobile signal drops completely
4. Test data speeds from the furthest unit position back to the command post
5. Set up automatic switching so devices seamlessly jump to the best available network

**Why:** You must survey the terrain before you can place relay nodes intelligently. Satellite backup is configured next because it needs to be ready before testing proves the primary network insufficient. Testing validates the deployment before failover automation is configured — no point automating a system that hasn't been verified.

Axes awarded: Stability +1, Precision +0.5

---

#### Arc 2, Chapter 2 — D-7

**Software Engineer — "Fix the Too-Many-Users Problem" (binary-choice)**

| Option | Axes |
|--------|------|
| **Connection Pooling (50 share 1 stream, 1-sec delay)** | **Cost-Conscious +1, Performance-First +0.5, Speed -0.3** |
| Horizontal Scale (add servers, expensive) | Stability +1, Speed +0.5, Cost-Conscious -0.8 |
| Rewrite Async (10,000-user capacity, risky in 7 days) | Innovation +1, Performance-First +0.8, Stability -0.5 |
| Tiered Access (generals live, others delayed) | Precision +0.8, Cost-Conscious +0.5, Collaboration -0.3 |

**Recommended pick:** **Connection Pooling** — it eliminates 95% of the server load with a 1-second update delay, which is acceptable for a command screen. It requires code changes but is well-understood and can be implemented safely in 7 days. **Horizontal Scale** is also defensible if you want to avoid code risk — it's more expensive but needs zero code changes, a real consideration one week before a general's demo.

---

**Data Engineer — "Estimate Peak Active Users" (numeric-input)**

Chart data: [2, 5, 9, 14] (hundreds of peak simultaneous users across 4 previous exercises)
Expected answer: **20 (hundreds, i.e. ~2,000)** | Tolerance: ±5

**Why:** The increment grows: +3, +4, +5. Pattern suggests +6 next → 14 + 6 = 20. Answers between 15–25 receive credit.

Axes awarded: Precision +1, Cost-Conscious +0.5

---

**Cloud Engineer — "Run the Stress Test" (drag-drop order)**

Correct sequence:
1. Record normal performance with 100 simulated users as a starting reference
2. Gradually increase to 500 users and note where things start getting slow
3. Push beyond 500 users to find the exact moment the system breaks
4. Check server load, memory, and network at the breaking point to find the root cause
5. Apply the fix and run the entire test again from scratch to confirm the new limit

**Why:** You need a baseline before load testing — you can't spot degradation without a normal reference. Incremental ramp-up locates the start of degradation before finding the break point. Profiling at the break point identifies *why* it failed. The full re-test after fixing confirms the fix actually works at scale.

Axes awarded: Precision +1, Stability +0.5

---

#### Arc 2, Chapter 3 — D-Day

**Software Engineer — "Track Down the Stale Data" (drag-drop order)**

Correct sequence:
1. Confirm that GPS devices in the field are actually sending fresh updates
2. Check if updates are piling up somewhere between the field and the server
3. Check if the system is showing old saved answers instead of fetching fresh ones
4. Verify that the live connection between servers and commander screens is actually pushing updates
5. Deploy the fix and confirm fresh data starts flowing to screens

**Why:** Start at the data source (GPS devices), then trace the pipeline forward: field → server pipeline → server cache → websocket push to screens. This end-to-end trace isolates exactly where staleness enters. Deploying the fix is always the last step, after diagnosis.

Axes awarded: Speed +1, Precision +0.5

---

**Data Engineer — "Help Commanders Decide Now" (binary-choice)**

| Option | Axes |
|--------|------|
| **Predict Positions (extrapolate from last speed/direction)** | **Innovation +1, Speed +0.8, Precision -0.3** |
| Radio Reports (manual call-in, 100% accurate) | Stability +1, Precision +0.5, Innovation -0.5 |
| Confidence Overlay (show staleness visually) | Precision +1, Collaboration +0.5, Speed -0.3 |
| Drone Feed (live camera view) | Performance-First +1, Innovation +0.5, Cost-Conscious -0.5 |

**Recommended pick:** **Predict Positions** — dead reckoning (extrapolating from last known speed and direction) is standard military doctrine for short data gaps and is surprisingly accurate over 5–20 minute intervals. It lets commanders act confidently without waiting for engineers to fix the system. **Confidence Overlay** is also a strong pick for a facilitator who wants to discuss how data visualisation can honestly communicate uncertainty.

---

**Cloud Engineer — "Rebuild the Data Pipeline" (drag-drop layout)**

Correct zone assignment:
- **Stage 1 (Data Arrives):** Field Device Radio Hub (MQTT Broker)
- **Stage 2 (Processing A):** Live Data Sorter (Stream Processor)
- **Stage 3 (Processing B):** Old Data Cleaner (Cache Invalidator)
- **Stage 4 (Delivered to Screens):** Live Update Relay (WebSocket Gateway)

Items that are distractors: Failed Message Store (Dead-Letter Queue), System Health Watcher — these are important in production but are not part of the scored pipeline sequence.

**Why:** Data flows: field devices → message broker → stream processing → cache invalidation → websocket push to screens. Cache invalidation happens *before* the data reaches screens to ensure commanders never see stale cached data.

Axes awarded: Speed +1, Stability +0.5

---

#### Arc 2, Chapter 4 — After Action

**Software Engineer — "Build the Review Tool" (binary-choice)**

| Option | Axes |
|--------|------|
| Timeline Replay (full interactive, 2 weeks) | Performance-First +1, Innovation +0.8, Speed -0.5 |
| **Static Report (charts + screenshots, 3 days)** | **Speed +1, Cost-Conscious +0.5, Innovation -0.3** |
| AI Highlights (auto-find 20 key moments) | Innovation +1, Speed +0.5, Precision -0.3 |
| Collaborative Tool (unit commanders mark up) | Collaboration +1, Precision +0.5, Speed -0.5 |

**Recommended pick:** **Timeline Replay** is the most impressive and useful for commanders who want to understand how decisions played out in context — but it takes 2 weeks. For a 2-week deadline, it *just barely* fits. If the facilitator wants to discuss delivery risk, **Static Report** is a realistic safe choice that delivers ahead of the deadline and is easy to circulate. Both are defensible — use this as a discussion point about delivery speed vs. product quality.

---

**Data Engineer — "Calculate Unit Readiness Scores" (drag-drop order)**

Correct sequence:
1. Clean the raw data by removing sensor errors and duplicate entries
2. Agree with exercise planners on what readiness actually means and how to measure it
3. Calculate a readiness score for each unit using the agreed definition
4. Compare scores against what human observers reported to catch any mistakes
5. Show results to command with charts and an honest note on confidence levels

**Why:** Data cleaning must precede any analysis — garbage in, garbage out. Defining the metric *before* calculating it prevents the analyst from reverse-engineering a definition to fit a result. Cross-validation against human observer reports catches systematic errors before they reach the general. Presenting with confidence levels is intellectual honesty in data science.

Axes awarded: Precision +1, Collaboration +0.5

---

**Cloud Engineer — "Work Out How Much Storage You Need" (numeric-input)**

Chart data: [2, 3, 5, 8] (TB per day over the last 4 days of a 14-day exercise)
Expected answer: **82 TB** | Tolerance: ±20

**Why:** The daily data climbs quickly. The pattern (2, 3, 5, 8) follows a Fibonacci-like growth. A reasonable approach: average the 4 known days ≈ 4.5 TB/day × 14 days = 63 TB base, then × 1.3 overhead = ~82 TB. Players should also note that early exercise days are lighter than later days, so a simple average may underestimate. Any approach landing in 62–102 TB receives credit.

Axes awarded: Cost-Conscious +1, Precision +0.5

---

### Arc 3 — Ops Resilience: Singapore Goes Dark

The team responds to a sophisticated cyber intrusion into Singapore's power grid, containing the attack and restoring power to 200,000 homes.

---

#### Arc 3, Chapter 1 — First Signs

**Software Engineer — "Set Up the Early Warning System" (drag-drop order)**

Correct sequence:
1. Map all control system devices and how they're connected to each other
2. Install lightweight monitoring sensors on each control system device
3. Record 2 hours of normal behaviour to understand what a healthy system looks like
4. Set alert thresholds based on the baseline so anything unusual triggers a warning
5. Connect alerts to the security team so they're notified the moment something unusual appears

**Why:** You cannot deploy sensors to devices you haven't mapped. Sensors must be deployed before you can record normal behaviour. The baseline defines what "normal" looks like — only then can you set meaningful thresholds. Alert pipelines connect everything together last.

Axes awarded: Precision +1, Stability +0.5

---

**Data Engineer — "Estimate How Far It Has Spread" (numeric-input)**

Chart data: [2, 5, 12, 22] (% of 200 devices with unusual activity)
Expected answer: **70 devices** | Tolerance: ±20 devices

**Why:** The percentage trend: 2%, 5%, 12%, 22% — roughly doubling with an accelerating pattern. Next ≈ 35% → 35% × 200 = **70 devices**. Players should convert the percentage to an absolute device count. Answers between 50–90 devices receive credit.

Axes awarded: Precision +1, Cost-Conscious +0.5

---

**Cloud Engineer — "Deploy the Detection Toolkit" (binary-choice)**

| Option | Axes |
|--------|------|
| ML Classify (5 min, trained on known patterns only) | Speed +1, Innovation +0.5, Precision -0.3 |
| **Manual Analysis (30 min, high confidence)** | **Precision +1, Stability +0.5, Speed -0.5** |
| **Ensemble Method (3 methods, majority verdict)** | **Precision +0.8, Innovation +0.5, Speed -0.3** |
| Ally Intel (partner sharing, 10 min, exposure risk) | Collaboration +1, Speed +0.5, Autonomy -0.8 |

**Recommended pick:** **Ensemble Method** — the scenario explicitly states this attack pattern looks new. A single ML classifier trained only on known patterns is likely to miss it. Running three different detection methods and taking a majority verdict is both faster than full manual analysis *and* more robust than a single automated tool. This is standard practice in threat intelligence for novel attacks.

---

#### Arc 3, Chapter 2 — The Lights Go Out

**Software Engineer — "Stop the Attacker Spreading" (binary-choice)**

| Option | Axes |
|--------|------|
| **Network Isolation (cut 12 stations, manual control)** | **Stability +1, Speed +0.8, Autonomy -0.3** |
| Honeypot Divert (decoy systems, watch attacker) | Innovation +1, Precision +0.5, Stability -0.5 |
| Credential Rotation (emergency password reset) | Precision +1, Stability +0.3, Speed -0.3 |
| Deceptive Traffic (flood with fake signals) | Innovation +0.8, Speed +0.5, Precision -0.5 |

**Recommended pick:** **Network Isolation** — when an attacker is actively spreading in critical infrastructure, speed of containment is the top priority. Cutting network connections to the compromised substations immediately stops lateral movement. The 12 stations move to manual control — inconvenient but safe. Honeypots and deceptive traffic are interesting intelligence-gathering plays but risk the attacker continuing to spread while you wait.

---

**Data Engineer — "Reconstruct How They Got In" (drag-drop order)**

Correct sequence:
1. Gather logs from every network device, login system, and power station controller
2. Arrange all events in order using timestamps to build a chronological picture
3. Find the very first infected device by looking for the earliest unusual event
4. Trace how the attacker moved from device to device using login and connection records
5. Extract the attacker's digital fingerprints so you can block them from coming back

**Why:** You cannot analyse logs you haven't collected. Building a timeline orders the evidence. Patient-zero identification works backward from the timeline to find the earliest infection. Lateral movement mapping shows how far the attacker spread. Extracting indicators of compromise (IoCs) is the output — the actionable intelligence for defence.

Axes awarded: Precision +1, Speed +0.5

---

**Cloud Engineer — "Isolate the Network Zones" (drag-drop layout)**

Correct zone assignment:
- **Zone 1 (Fully Isolated):** The 12 Compromised Stations — attacker is in control, must be cut off
- **Zone 2 (Restricted Access):** Contractor Remote Access — external parties are the most likely initial attack vector
- **Zone 3 (Monitored Access):** Neighbouring Stations — at risk but not yet compromised; monitor closely
- **Zone 4 (Normal Operations):** Central Control Room — command must maintain situational awareness

Items that are distractors: Confirmed Safe Stations, Office IT Network — not in the scored list.

**Why:** The compromised stations need maximum isolation. Contractor remote access is restricted because external attack vectors are a common initial compromise point. Adjacent stations are monitored — they may become targets. The control room must stay operational to coordinate the response.

Axes awarded: Stability +1, Precision +0.5

---

#### Arc 3, Chapter 3 — Restoration Race

**Software Engineer — "Program the Restoration Automation Sequence" (drag-drop order)**

Correct sequence:
1. Confirm every compromised station has been wiped and is definitely clean
2. Bring back the main transmission stations that supply power to multiple zones
3. Run a test load to verify the backbone can handle the demand before connecting more
4. Restore district stations in priority order: hospitals and critical services first
5. Restore residential areas last, zone by zone based on grid capacity

**Why:** Never restore a system that hasn't been confirmed clean — you would hand the attacker back control. The backbone (transmission stations) must be stable before district stations can connect to it. A test load validates the backbone before adding more demand. Hospitals and emergency services are life-critical; residential areas are last.

Axes awarded: Stability +1, Precision +0.8

---

**Data Engineer — "Find the Safe Restoration Speed" (numeric-input)**

Chart data: [10, 22, 38, 51] (% of normal grid load safely handled per hour of testing)
Expected answer: **65%** | Tolerance: ±12%

**Why:** The safe limit increases each hour: +12, +16, +13. The increments are narrowing slightly — a reasonable next increment is ~14, giving 51 + 14 = **65%**. This is the ceiling of safe restoration for the next hour. Answers between 53–77% receive credit.

Axes awarded: Precision +1, Stability +0.8

---

**Cloud Engineer — "Secure the Stations Before Restoring Power" (binary-choice)**

| Option | Axes |
|--------|------|
| **Full Rebuild (100% certain, 6 hours)** | **Stability +1, Precision +0.8, Speed -0.8** |
| Forensic Patch (2 hours, 15% miss chance) | Speed +1, Cost-Conscious +0.5, Stability -0.5 |
| Shadow Monitor (watch for re-activation) | Innovation +1, Precision +0.5, Stability -0.8 |
| Hardware Swap (12 hours, eliminates all software risk) | Stability +0.8, Precision +1, Cost-Conscious -0.8 |

**Recommended pick:** **Full Rebuild** — with 200,000 homes still dark and hospitals on backup generators, the temptation is to rush. But bringing a station back online with a 15% chance the attacker left something behind means handing them a potential second attack. The 6-hour full rebuild is the operationally correct answer: it provides certainty before restoring live power. **Hardware Swap** is the most thorough option but takes 12 hours and is extremely expensive; it's a post-incident hardening measure, not an incident response action.

---

#### Arc 3, Chapter 4 — Never Again

**Software Engineer — "Design the Permanent Defence" (binary-choice)**

| Option | Axes |
|--------|------|
| **Zero-Trust OT (18-month rollout, gold standard)** | **Stability +1, Precision +0.8, Speed -0.5** |
| AI SOC (operational in 3 months, automated response) | Innovation +1, Speed +0.5, Cost-Conscious -0.5 |
| Air Gap (physically cut internet, no remote management) | Stability +1, Autonomy +0.5, Innovation -0.8 |
| Threat Sharing (regional programme, real-time alerts) | Collaboration +1, Innovation +0.5, Autonomy -0.5 |

**Recommended pick:** **Zero-Trust OT** — the attack succeeded because IT and OT (operational technology, i.e. power station control systems) networks were not properly segmented, allowing the attacker to move laterally from an office system into grid controls. Zero-trust architecture where every connection must be authenticated and authorised closes this gap at a systemic level. The 18-month timeline is a real trade-off to discuss — **AI SOC** is faster but doesn't address the fundamental architecture gap.

---

**Data Engineer — "Build the Evidence Case" (drag-drop order)**

Correct sequence:
1. Compare attacker methods against a database of known criminal groups
2. Trace network traffic backward through relay points to find the attack's origin
3. Study the malicious code for stylistic clues to identify who wrote it
4. Check when the attacks happened against working hours of suspected groups
5. Combine all evidence into a clear statement with an honest confidence note

**Why:** Attribution builds from the most concrete evidence (tool/technique matching) to increasingly circumstantial corroboration (code style, timing). Each step adds a layer of evidence. The confidence statement is last — it summarises what all the evidence points to, with honest uncertainty. A Parliament brief must be credible, not sensationalised.

Axes awarded: Precision +1, Collaboration +0.5

---

**Cloud Engineer — "Design the Resilience Architecture" (drag-drop layout)**

Correct zone assignment:
- **Layer 1 (Stop Attacks — Prevention):** Traffic Filter (WAF) and Weakness Finder (Vuln Scanner)
- **Layer 2 (Spot Attacks — Detection):** Threat Detection Console (SIEM)
- **Layer 3 (React to Attacks — Response):** Auto-Response Engine (SOAR)
- **Layer 4 (Recover and Restore):** Backup Control Centre (DR Site) and Protected Backup Vault

Note: The `correctOrder` array in the JSON is `["waf", "siem", "soar", "dr-site"]` — representing one item per zone. The Weakness Finder and Backup Vault are additional items that fit logically into Layers 1 and 4 respectively, even though they are not in the scored correctOrder.

**Why:** The four layers follow the NIST Cybersecurity Framework: Prevent → Detect → Respond → Recover. Each tool maps to exactly one function. The WAF filters bad traffic before it reaches systems. The SIEM watches for anomalies. The SOAR automates response actions. The DR site and backup vault enable recovery.

Axes awarded: Stability +1, Innovation +0.5

---

## 7. Group Question Phase

Group questions are team decisions. The facilitator leads a discussion, the team debates, and the facilitator submits on behalf of the group. The wager multiplier amplifies the axis impact — higher wagers mean bigger consequences if the group is aligned on a strong answer.

**There are no wrong answers in group questions** — they are designed for discussion. The "recommended pick" below is the option with the strongest positive axis impact and best alignment with the scenario's learning objectives. Use it as a discussion anchor, not a single correct answer.

---

### Arc 1 Group Questions

**Q1 — "The Debrief"** | Wager options: 1×, 2×, 3×

The NDP committee chair asks what really happened during the event.

| Option | Axes |
|--------|------|
| Full Transparency (tell her everything) | Collaboration +1.5, Stability +0.8, Autonomy -0.5 |
| Professional Frame (clean report, no detail) | Autonomy +1.2, Speed +0.8, Collaboration -1.0, Stability -0.5 |
| **Resilience Frame (problems + what we learned)** | **Precision +1.5, Collaboration +0.8, Innovation +0.5, Speed -0.3** |
| Data-Driven (show the uptime numbers) | Precision +1.2, Stability +0.5, Collaboration -0.3, Innovation -0.3 |

**Recommended pick:** **Resilience Frame** — it acknowledges the four crises honestly while framing the narrative around learning and forward action. This is the professional response that builds trust with leadership without unnecessary drama. It yields the highest combined positive axis impact. Use this as a jumping-off point for discussing crisis communication in government contexts.

**Discussion angle:** What are the long-term costs of the "Professional Frame" approach if the incidents eventually surface? What does psychological safety in a team look like when leadership learns about incidents?

---

**Q2 — "One Shot"** | Wager options: 1×, 2×, 4×

The Minister offers one funded investment to prevent a repeat.

| Option | Axes |
|--------|------|
| Command Centre (dedicated team + hardware) | Stability +2.0, Collaboration +0.5, Cost-Conscious -1.0, Innovation -0.3 |
| **Predictive AI (auto-scale, anomaly detection)** | **Innovation +2.0, Speed +0.8, Stability -0.3, Cost-Conscious -0.8** |
| Distributed Platform (microservices, isolated failures) | Innovation +1.5, Stability +1.0, Cost-Conscious -0.5 |
| Trained People (200 officers, step-by-step guides) | Collaboration +2.0, Precision +0.5, Innovation -0.5 |

**Recommended pick:** **Predictive AI** has the highest raw axis impact (Innovation +2.0, Speed +0.8) but at a stability cost. **Trained People** is equally strong from a human-capital perspective and yields Collaboration +2.0 — a strong answer if your group emphasises that technology only works when people know how to use it. **Distributed Platform** is the most balanced pick (both Innovation and Stability positive).

**Discussion angle:** The four crises were: 3-week build, rehearsal overload, contractor wiping the database, and livestream choking. Which root cause did each option actually address? What if only one is funded — what's the highest-leverage bet?

---

### Arc 2 Group Questions

**Q1 — "The General's Question"** | Wager options: 1×, 2×, 3×

The Chief of Army asks whether the stale-data failure was a network, design, or people problem.

| Option | Axes |
|--------|------|
| Network Problem (invest in portable relay + satellite) | Stability +1.5, Performance-First +0.8, Innovation -0.5, Cost-Conscious -0.5 |
| **Design Problem (system showed stale data as fresh)** | **Innovation +1.5, Precision +1.0, Stability -0.3** |
| Doctrine Problem (train commanders to cross-reference) | Collaboration +1.8, Precision +0.5, Performance-First -0.5 |
| All Three (phased plan over 3 years) | Precision +1.5, Stability +0.8, Speed -1.0, Cost-Conscious -0.5 |

**Recommended pick:** **Design Problem** — the scenario makes clear that the system displayed 20-minute-old data as if it were fresh, with no indicator of staleness. This is a design failure: the system should surface uncertainty, not hide it. A timestamp or staleness indicator on the map would have changed how commanders used the data, regardless of network issues. **Doctrine Problem** is the strongest response if your group focusses on the human layer.

**Discussion angle:** "All Three" is the technically accurate answer — but is it the right thing to say to a general who's asking for actionable clarity? What does it mean to give nuanced analysis vs. giving a decision-ready answer?

---

**Q2 — "The Next Generation"** | Wager options: 1×, 3×, 5×

The Chief asks what capability to build into the next five years of SAF training.

| Option | Axes |
|--------|------|
| Autonomous Battlefield AI | Innovation +2.5, Speed +0.8, Collaboration -1.0, Stability -0.5 |
| **Cyber-Physical Specialists** | **Collaboration +1.5, Precision +1.0, Innovation +0.5** |
| Resilient Communications | Stability +2.0, Performance-First +0.8, Innovation -0.5 |
| Data Literacy Across All Ranks | Collaboration +2.0, Precision +0.8, Speed -0.3, Autonomy -0.5 |

**Recommended pick:** **Cyber-Physical Specialists** is the most balanced option: strong Collaboration, Precision, and Innovation with no significant negatives. It directly addresses the Northstar lesson that the tech team and field commanders operated in separate worlds. **Data Literacy** is similarly strong if your group concludes the root problem was commanders trusting a screen they didn't understand.

**Discussion angle:** The 5× wager here is high-stakes — a big bet that shapes an entire generation of soldiers. What is Singapore's actual competitive edge, and which option plays to that strength?

---

### Arc 3 Group Questions

**Q1 — "What Does the PM Say?"** | Wager options: 1×, 2×, 3×

The PM asks what to tell six million Singaporeans about the blackout.

| Option | Axes |
|--------|------|
| Reassurance-First (calm the public, minimal detail) | Stability +1.0, Speed +1.0, Collaboration -1.5, Precision -0.5 |
| Radical Truth (tell everything, including severity) | Collaboration +2.0, Precision +1.0, Stability -0.5, Cost-Conscious -0.5 |
| **Measured Honesty (acknowledge, no dramatising, full review)** | **Stability +1.5, Collaboration +1.0, Precision +0.5, Speed -0.3** |
| Redirect Forward ($500M announcement, forward focus) | Innovation +1.0, Speed +0.8, Precision -1.0, Collaboration -0.5 |

**Recommended pick:** **Measured Honesty** — it has the best combined axis profile (all positive) and reflects good crisis communication practice. It acknowledges the incident without either minimising it (which risks credibility if details leak later) or causing unnecessary fear. **Radical Truth** is the strongest choice for groups who believe democratic accountability requires full disclosure of state failures.

**Discussion angle:** Singapore's social contract around trust in government institutions is central to this scenario. What's the cost of understatement vs. overstatement? What does "trust" mean in a crisis communication context?

---

**Q2 — "What Do We Build?"** | Wager options: 1×, 2×, 5×

Parliament approves $500M for national cybersecurity. Your team recommends the strategic direction.

| Option | Axes |
|--------|------|
| Fortress SG (zero-trust everything, air-gap sensitive systems) | Stability +2.5, Precision +0.8, Innovation -1.0, Collaboration -0.5, Speed -0.5 |
| **Adaptive Resilience (self-healing AI systems)** | **Innovation +2.0, Stability +1.0, Speed +0.5, Cost-Conscious -1.5** |
| Regional Alliance (ASEAN cyber defence pact) | Collaboration +2.5, Innovation +0.5, Autonomy -2.0 |
| Citizen Resilience (mass cyber literacy, reserve corps) | Collaboration +1.5, Precision +1.0, Cost-Conscious +0.5, Performance-First -0.5 |

**Recommended pick:** **Adaptive Resilience** has the highest positive net impact (Innovation +2.0, Stability +1.0, Speed +0.5) and directly addresses the lesson that the blackout lasted hours because recovery was manual. Self-healing infrastructure shortens response time from hours to minutes. **Regional Alliance** is the strongest geopolitical play if your group discusses Singapore's position in ASEAN.

**Discussion angle:** The 5× wager is the highest in the game — this is the capstone decision. What kind of digital nation does Singapore want to be? Use this to close the session with a big-picture discussion on national strategy vs. technical optimisation.

---

## 8. Admin Operations

### Clear Leaderboard Data

A script is provided to wipe all leaderboard data from Firestore. Use this between cohorts or at the start of a new session.

#### Prerequisites

1. Download your Firebase service account key from the Firebase Console:
   - Project Settings → Service Accounts → Generate new private key
   - Save as `serviceAccountKey.json` in the project root (this file is gitignored)

2. Ensure `firebase-admin` is installed:
   ```bash
   npm install firebase-admin
   ```

#### Dry Run (see what will be deleted without deleting)

```bash
node scripts/clear-leaderboard.mjs --dry-run
```

This lists every document that would be deleted: individual scores under `events/global/scores/`, team scores under `events/{teamName}/scores/`, and team aggregates under `teams/`.

#### Live Clear (delete for real)

```bash
node scripts/clear-leaderboard.mjs
```

Output confirms each deletion. Documents are deleted in batches of 400.

> **Warning:** This is irreversible. Take a Firestore export backup if you want to preserve historical data.

#### Manual Firestore Clear (alternative)

1. Open Firebase Console → Firestore Database
2. Delete the `teams` collection
3. Delete the `events` collection (contains individual and team score subcollections)
4. Lobby data (`lobbies/`) is **not** touched by the script and can be cleared separately if needed

---

### Firebase Console Quick Reference

| Task | Location in Firebase Console |
|------|------------------------------|
| View live game state | Firestore → `lobbies/{lobbyId}` |
| View score logs | Firestore → `lobbies/{lobbyId}/logs` |
| View individual leaderboard | Firestore → `events/global/scores` |
| View team leaderboard | Firestore → `teams` |
| View auth users | Authentication → Users |
| Monitor errors | Functions → Logs (if using Cloud Functions) |

---

### Starting a Fresh Session Checklist

- [ ] Clear leaderboard if starting a new cohort: `node scripts/clear-leaderboard.mjs`
- [ ] Confirm `.env.local` has the correct Firebase project keys
- [ ] Run `npm run dev` (or use the deployed production URL)
- [ ] Test lobby creation and join from a second device before players arrive
- [ ] Brief players: the game uses **anonymous authentication** — no account creation needed
- [ ] Remind players to stay on the same lobby URL throughout the session; refreshing is safe, but closing the tab loses the session if auth resets

---

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Team score not appearing on leaderboard | Team played with no team name set | Ensure team name is entered in lobby before starting |
| Game stuck waiting for all players | One player's submission didn't register | Ask that player to re-submit; check Firestore `roundAnswers` field in the lobby doc |
| Group question phase not appearing | Only 1 player in the lobby | Group phase requires 2+ players |
| Results page shows no persona | Player's logs subcollection is empty | Check Firestore logs; ScenarioWrapper may have failed to write |
| Leaderboard shows 0 for team total | Old data from before `groupScore` field fix | Clear and replay; old sessions wrote to a different field name |

# **DISconnect 2.0** 

## **1\. Purpose and Scope**

**DISconnect** is a recruitment-drive, phone-first experience designed to **engage predominantly pre-tertiary students** and help them **understand the job and its three subtracks** through a hands-on, team-based activity.

**Hard constraint**

* Must preserve **three roles**:

  1. Software Engineer  
  2. Cloud Platform Engineer  
  3. DSAI Engineer

**Everything else** (gameplay, UX, architecture, implementation) is open to change.

---

## **2\. Current State Baseline**

### **2.1 Operational Flow**

Recruitment session flow:

1. Presenter runs intro slides (self \+ three subtracks)  
2. Participants play DISconnect  
   * **Self-paced**  
   * Main interaction is via **participants’ phones**  
   * Access via **QR code → web link**

### **2.2 Gameplay Flow (Today)**

1. Create / join a lobby (**3 players per team**)  
2. Each participant selects a role (SE / Cloud / DSAI)  
3. Team receives questions one at a time  
4. Team discusses and commits an answer  
5. End-of-game “personality”/result is shown

Session length:

* **\~15–20 minutes**  
* **4 questions per role per session**

### **2.3 Key Problems (Today)**

* **Difficulty mismatch**: Questions are too difficult for pre-tertiary students; even working professionals need some discussion → reduces fun \+ approachability.  
* **No narrative cohesion**: Questions are unrelated, no story/flow → low engagement and weak role differentiation.

### **2.4 Current Technical Baseline**

* **Frontend**: Next.js (TypeScript) / mobile-first web experience  
* **Backend/state**: Firebase (Firestore rules/indexes exist in repo)  
* **Hosting**: Publicly hosted on **Vercel**  
* **Access pattern**: QR → web URL on participant phones  
* **Likely architecture shape**: Lobby-centric routing (lobby/game/results pages)

---

## **3\. DISconnect 2.0 Goals**

### **3.1 Primary Goal**

Maximise **emotional engagement** and “this is cool” factor during recruitment drives.

### **3.2 Supporting Goals**

* Create a **narrative-driven** experience to provide flow and meaning  
* Improve **role differentiation** via dilemmas that reflect real work tradeoffs  
* Add **game-like scoring** that feels rewarding (not evaluative)  
* Keep experience **self-paced**, friendly for mixed groups and short event windows

### **3.3 Non-Goals**

* This is **not** a formal assessment or candidate filtering tool.  
* Not trying to teach deep technical content; it should stay approachable and fun.

---

## **4\. Experience Model (Product Architecture)**

### **4.1 Narrative Tone**

**Semi-fictional but relatable**: a single “project setting” acts as the backbone, with plausible engineering dilemmas.

### **4.2 Structure**

**Hybrid model**

* **Shared storyline**: one project progressing over time  
* **Role-specific scenarios**: each role faces dilemmas natural to that role  
* **Team discussion preserved**: teams still talk and decide together, but each role “owns” their moments

### **4.3 Decision Mechanics**

Each scenario presents a **tradeoff**, not a trivia question.

Examples:

* DSAI: **data quality vs storage cost/constraints**  
* Software: **functionality vs usability**  
* Cloud: **reliability vs speed**, **cost vs scalability**, **security vs convenience**

### **4.4 Scoring Philosophy**

* Scoring exists to increase engagement and replayability.  
* Score should map to “project health” and/or “team style,” not right/wrong correctness.  
* Output should feel like:

  * “Here’s the kind of engineering team you are”  
  * “Here’s how your project turned out”  
  * “Here’s your strengths under constraints”

---

## 

## **5\. System Architecture Direction (Engineering Blueprint)**

### **5.1 High-Level Requirements**

* **Session-based multiplayer** for 3 participants  
* **Low-friction onboarding** (QR link, no installs, minimal typing)  
* **Real-time state sync** between players  
* **Deterministic progression** through story beats  
* **End-state result generation** (score/personality/outcome)

### **5.2 Proposed Logical Components**

1. **Lobby Service (State \+ Membership)**  
   * Create lobby, join lobby, role selection  
   * Enforce max players \= 3  
   * Track readiness state per player

2. **Game Orchestrator (State Machine)**  
   * Maintains canonical game state:  
     * current chapter/beat  
     * per-role pending decisions  
     * timers (optional)  
     * resolved outcomes  
   * Responsible for advancing the game

3. **Content Engine**  
   * Story content, scenarios, role prompts, scoring rules  
   * Should be data-driven (JSON/Firestore docs), not hardcoded UI logic  
   * Supports future iteration without code rewrites  
        
4. **Scoring & Outcome Engine**  
   * Computes score/outcome based on decisions  
   * Produces final “result view model” (summary, highlights, persona/outcome)

5. **Client UI**  
   * Mobile-first UI/UX flows:  
     * Join/Create lobby  
     * Role select  
     * Decision prompts  
     * Team commit feedback  
     * Results

       

### **5.3 Data Model (Conceptual)**

Core entities:

* `Lobby`  
  * `id`, `createdAt`, `status` (waiting/in\_game/finished)  
  * `players[]` with `playerId`, `role`, `ready`, `name` (optional)  
* `GameState`  
  * `lobbyId`  
  * `chapterIndex`, `beatIndex`  
  * `decisions` (per beat, per role or shared)  
  * `scoreState` (running totals / tags)  
  * `auditLog` (optional for debugging)  
* `Content`  
  * `chapters[]` → `beats[]` → `rolePrompts` \+ `choices` \+ `effects`

### **5.4 State & Synchronisation Strategy**

Given current baseline uses Firebase and real-time is needed:

* Keep Firestore as the **source of truth** for lobby \+ game state.  
* Treat the game as a **server-authoritative state machine** (even if implemented with serverless/edge functions), to avoid:  
  * race conditions on progression  
  * clients disagreeing on what beat they’re in  
  * tampering / accidental overwrites

Pragmatic approach options:

* **Option A (recommended):** Firestore \+ server-side transitions (e.g., Next.js API routes / server actions / Firebase Functions)  
* **Option B:** Firestore-only with strict transactional updates (higher risk, more complex)

### **5.5 Hosting / Deployment**

* Current hosting: **Vercel**  
* Participant entry: **QR → Vercel URL**  
* Architecture should assume:  
  * Public internet access  
  * Short sessions, bursty traffic during event windows  
  * No reliance on local networks

---

## **6\. Migration Strategy (From Current → 2.0)**

### **6.1 Preserve**

* 3 roles  
* Lobby/team concept (3 players)  
* Phone-first, self-paced event usage  
* QR-based entry point

### **6.2 Replace / Rework**

* Replace disconnected Q\&A with:  
  * chapter/beat narrative structure  
  * role-specific dilemmas  
  * coherent progression  
* Replace “difficulty-by-technicality” with “difficulty-by-tradeoff”

### **6.3 Workstreams**

1. **Content & Narrative Framework**  
   * Define project setting  
   * Define chapters/beats  
   * Define per-role dilemmas \+ scoring effects

2. **State Machine & Data Model**  
   * Implement canonical GameState transitions  
   * Implement safe progression (transaction/function)

3. **UX Overhaul**  
   * Faster onboarding  
   * Better in-game clarity (where we are in the story)  
   * Strong feedback loops (score/outcome signals)

4. **Results / Reward**  
   * Make end-screen feel like a “win screen”  
   * Persona/outcome tied to decisions \+ team style

---

## 

## **7\. Open Questions and Decisions Log**

(Keep this section as a running list.)

* Should we keep “personality” naming, or reframe as “Team Archetype / Project Outcome”?  
* Should decisions be:  
  * one shared team choice per beat, or  
  * per-role choices that combine?  
* Do we want optional timers to keep teams moving during events?  
* What analytics do we need? (completion rate, drop-off, role popularity)

---

## **8\. Success Metrics (Recruitment-Driven)**

* Participants complete within 15–20 minutes with low confusion  
* Higher engagement signals:  
  * laughter/energy during play  
  * “I want to try another role”  
  * increased questions asked to recruiters after the activity  
* Lower drop-off mid-game  
* Facilitators report smoother flow vs current version


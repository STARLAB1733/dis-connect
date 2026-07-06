import { Axis } from '@/lib/persona';

// Persona archetypes revealed at the end of the game. Each has:
// - `axes`: The one or two top axes it represents.
// - `name`: The persona title (referenced by tests — do not rename).
// - `description`: A short blurb for the player.
// - `zinger`: One-line, screenshot-worthy tagline.
// - `traits`: 2-3 "signature moves" — cheeky, recognisable habits.
// - `watchOut`: A lighthearted "watch out for" line.
// - `svgPath`: Path to the SVG icon representing this persona.
export interface PersonaArchetype {
  axes: Axis[];
  name: string;
  description: string;
  zinger: string;
  traits: string[];
  watchOut: string;
  svgPath: string;
}

export type PersonaIdentity = Omit<PersonaArchetype, 'axes'>;

export const ALL_ARCHETYPES: PersonaArchetype[] = [
  {
    axes: ['Innovation', 'Autonomy'],
    name: 'The Visionary Architect',
    zinger: 'Big brain, bigger ideas — meetings optional.',
    description:
      'You see the endgame while everyone else is still reading the instructions. Lone-wolf energy, galaxy-brain plans.',
    traits: [
      'Sketches the master plan before anyone finds the whiteboard marker',
      'Says "ok hear me out" at least once a day',
      'Solo mode: permanently enabled',
    ],
    watchOut: 'Watch out for: shipping v1 of an idea nobody asked for (yet).',
    svgPath: '/personas/va.svg',
  },
  {
    axes: ['Stability', 'Precision'],
    name: 'The Precision Engineer',
    zinger: 'Measured twice. Cut once. Filed a report about it.',
    description:
      'Nothing gets past you — not a typo, not a rounding error, not a dodgy assumption. If you built it, it works. Every time.',
    traits: [
      'Spots the typo from across the room',
      'Triple-checks the work, then checks the checklist',
      'Personal motto: "it works on EVERY machine"',
    ],
    watchOut: 'Watch out for: polishing pixel #4,096 while the deadline waves goodbye.',
    svgPath: '/personas/pe.svg',
  },
  {
    axes: ['Speed', 'Performance-First'],
    name: 'The Rapid Deployer',
    zinger: 'Ship first, vibes later.',
    description:
      'While the group chat is still deciding, you already submitted. Momentum is your love language and slow Wi-Fi is your villain origin story.',
    traits: [
      'Done before the group chat picks a direction',
      'Allergic to loading screens',
      '"Can we speed this up?" — you, always',
    ],
    watchOut: 'Watch out for: sprinting so fast you lap your own to-do list.',
    svgPath: '/personas/rd.svg',
  },
  {
    axes: ['Cost-Conscious', 'Collaboration'],
    name: 'The Strategic Coordinator',
    zinger: 'The group project MVP who also guards the budget.',
    description:
      'You make the people math AND the money math work at the same time. Somehow everyone ends up on task, on time, and under budget.',
    traits: [
      'Herds the team like a seasoned pro',
      'Finds the free option every single time',
      'Keeps receipts — literally and figuratively',
    ],
    watchOut: 'Watch out for: optimising the plan so hard nobody dares to change it.',
    svgPath: '/personas/sc.svg',
  },
  {
    axes: ['Innovation', 'Collaboration'],
    name: 'The Creative Collaborator',
    zinger: 'Ideas machine — batteries included, teammates required.',
    description:
      'Brainstorms are your natural habitat. You turn "any ideas?" into a full-blown hackathon, and your hype is genuinely contagious.',
    traits: [
      '"Ok ok ok what IF we—" every five minutes',
      'Turns brainstorms into brain-hurricanes',
      'Hype level: contagious',
    ],
    watchOut: 'Watch out for: 47 ideas on the table, 0 chosen. Pick one, legend.',
    svgPath: '/personas/cc.svg',
  },
  {
    axes: ['Stability', 'Cost-Conscious'],
    name: 'The Pragmatic Steward',
    zinger: 'No drama, no overspend, no surprises. Steady.',
    description:
      'You are the reason the project did not explode. Sensible, dependable, and quietly saving everyone from their own worst impulses.',
    traits: [
      'Reads the fine print for fun',
      'Plan B, C and D on standby',
      'The team’s human seatbelt',
    ],
    watchOut: 'Watch out for: saying "let’s not risk it" to literally everything.',
    svgPath: '/personas/ps.svg',
  },
  {
    axes: ['Precision', 'Performance-First'],
    name: 'The Performance Tactician',
    zinger: 'Fast AND correct. Yes, both. At once.',
    description:
      'You refuse to choose between speed and accuracy, so you took both. Every decimal earns its place and every second is accounted for.',
    traits: [
      'Benchmarks everything, including lunch queues',
      'Speedruns tasks with zero typos',
      'Has opinions about milliseconds',
    ],
    watchOut: 'Watch out for: turning a 5-minute task into a world record attempt.',
    svgPath: '/personas/pt.svg',
  },
  {
    axes: ['Innovation', 'Performance-First'],
    name: 'The Cutting-Edge Sprinter',
    zinger: 'Beta tester of life. Patch notes pending.',
    description:
      'If it is new, shiny and slightly unstable, you have already tried it. You prototype at breakneck speed and iterate in public.',
    traits: [
      'First to try the shiny new thing',
      'Prototype today, perfect never',
      '"What does this button do?" — proudly',
    ],
    watchOut: 'Watch out for: leaving a trail of half-finished experiments behind you.',
    svgPath: '/personas/ces.svg',
  },
  {
    axes: ['Autonomy', 'Stability'],
    name: 'The Steadfast Soloist',
    zinger: 'Headphones on. World off. Work done.',
    description:
      'A one-person reliability machine. You say "don’t worry, I got it" — and unlike most people, you actually do.',
    traits: [
      'Focus so deep it needs a rescue diver',
      '"Don’t worry, I got it" — and you actually do',
      'Deadline? Met it yesterday, quietly',
    ],
    watchOut: 'Watch out for: forgetting your team exists until the deadline.',
    svgPath: '/personas/ss.svg',
  },
  {
    axes: ['Speed', 'Collaboration'],
    name: 'The Agile Team Player',
    zinger: 'Fast replies, faster follow-through.',
    description:
      'You actually read the group chat AND respond — a rare breed. You turn "we should" into "we did" before lunch.',
    traits: [
      'Reads the group chat AND replies — rare breed',
      'Turns "we should" into "we did" by lunch',
      'Zero-lag teamwork',
    ],
    watchOut: 'Watch out for: saying yes to everything at 2x speed.',
    svgPath: '/personas/atp.svg',
  },
];

// If no strong winner emerges, fall back to this:
export const DEFAULT_ARCHETYPE: PersonaArchetype = {
  axes: [],
  name: 'The Balanced Integrator',
  zinger: 'All-rounder. The team’s Swiss Army human.',
  description:
    'Every stat: suspiciously even. You adapt to whatever the team needs most, which makes you impossible to catch off guard.',
  traits: [
    'Adapts to whatever the team needs',
    'Every stat: suspiciously even',
    'Impossible to catch off guard',
  ],
  watchOut: 'Watch out for: being so balanced you forget to have a hot take.',
  svgPath: '/personas/bi.svg',
};

const ALL_AXES: Axis[] = [
  'Innovation',
  'Stability',
  'Speed',
  'Precision',
  'Cost-Conscious',
  'Performance-First',
  'Autonomy',
  'Collaboration',
];

function toIdentity(archetype: PersonaArchetype): PersonaIdentity {
  const { name, description, zinger, traits, watchOut, svgPath } = archetype;
  return { name, description, zinger, traits, watchOut, svgPath };
}

/**
 * Given a full map of normalized axis‐scores, pick the persona archetype that best matches.
 *
 * Steps:
 * 1) Sort axes by descending score.
 * 2) Try to match the top two axes against each archetype’s `axes` list.
 * 3) If a perfect two‐axis match exists, return it.
 * 4) Otherwise, match only on the single top axis (the archetype whose `axes` contains that axis).
 * 5) If still no match, return DEFAULT_ARCHETYPE.
 */
export function getPersonaIdentity(
  normalized: Record<Axis, number>
): PersonaIdentity {
  // 1) Build a sorted array of [axis, score], descending
  const sorted: [Axis, number][] = Object.entries(normalized)
    .map(([k, v]) => [k as Axis, v] as [Axis, number])
    .sort((a, b) => b[1] - a[1]);

  const topAxis     = sorted[0][0];
  const secondAxis  = sorted[1]?.[0];

  // 2) First attempt: find an archetype whose `axes` exactly match [topAxis, secondAxis]
  if (secondAxis) {
    const twoMatch = ALL_ARCHETYPES.find((p) => {
      const setA = new Set(p.axes);
      return setA.has(topAxis) && setA.has(secondAxis) && p.axes.length === 2;
    });
    if (twoMatch) return toIdentity(twoMatch);
  }

  // 3) If no two‐axis match, find any archetype containing the top axis
  const singleMatch = ALL_ARCHETYPES.find((p) => p.axes.includes(topAxis));
  if (singleMatch) return toIdentity(singleMatch);

  // 4) Fallback
  return toIdentity(DEFAULT_ARCHETYPE);
}

/**
 * Compute up to 3 one-line teammate comparison callouts for the results page.
 *
 * All inputs come from data the results page already has in memory:
 * - `players`: every player's normalized axis scores (read-only).
 * - `names`: uid → display name from the lobby doc.
 *
 * Returns [] when there are fewer than 2 players or data is missing.
 * Superlative lines are only emitted for a STRICT win (ties are skipped).
 */
export function getTeammateCallouts(
  myId: string,
  players: { playerId: string; normalized: Record<Axis, number> }[],
  names: Record<string, string>
): string[] {
  const me = players.find((p) => p.playerId === myId);
  const others = players.filter((p) => p.playerId !== myId && p.normalized);
  if (!me || !me.normalized || others.length === 0) return [];

  const lines: string[] = [];
  const score = (p: { normalized: Record<Axis, number> }, axis: Axis) =>
    p.normalized[axis] ?? 50;

  // ── 1) Superlative: the axis where I strictly beat every teammate ─────────
  let bestAxis: Axis | null = null;
  let bestScore = -Infinity;
  let runnerUpId: string | null = null;
  for (const axis of ALL_AXES) {
    const mine = score(me, axis);
    let maxOther = -Infinity;
    let maxOtherId: string | null = null;
    for (const o of others) {
      const v = score(o, axis);
      if (v > maxOther) {
        maxOther = v;
        maxOtherId = o.playerId;
      }
    }
    // Strictly greater than everyone → no tie ambiguity
    if (mine > maxOther && mine > bestScore) {
      bestAxis = axis;
      bestScore = mine;
      runnerUpId = maxOtherId;
    }
  }
  if (bestAxis) {
    const rival = runnerUpId ? names[runnerUpId] : undefined;
    lines.push(
      rival
        ? `You're the team's most ${bestAxis} — sorry ${rival}, close but no medal.`
        : `You're the team's most ${bestAxis} — no contest.`
    );
  }

  // ── 2) Decision twin & polar opposite (Euclidean distance over all axes) ──
  const distance = (a: typeof me, b: typeof me) =>
    Math.sqrt(
      ALL_AXES.reduce((sum, ax) => sum + (score(a, ax) - score(b, ax)) ** 2, 0)
    );

  const named = others.filter((o) => names[o.playerId]);
  if (named.length > 0) {
    let twin = named[0];
    let twinD = Infinity;
    let opp = named[0];
    let oppD = -Infinity;
    for (const o of named) {
      const d = distance(me, o);
      if (d < twinD) { twinD = d; twin = o; }
      if (d > oppD)  { oppD = d;  opp = o; }
    }
    lines.push(
      `You and ${names[twin.playerId]} are basically decision twins. Same brain, different browser tabs.`
    );
    if (named.length > 1 && opp.playerId !== twin.playerId) {
      lines.push(
        `${names[opp.playerId]} is your complete opposite — between the two of you, every base is covered.`
      );
    }
  }

  return lines.slice(0, 3);
}

const VOCATION_LABELS: Record<string, string> = {
  'software-engineer': 'Software Engineer',
  'data-scientist': 'Data Science & AI',
  'cloud-engineer': 'Cloud Engineer',
};

/**
 * Given per-role scores, return the recommended C4X vocation.
 */
export function getVocationRecommendation(
  roleScores: Record<string, number>
): { roleKey: string; label: string; scores: { key: string; label: string; score: number }[] } {
  const entries = Object.entries(roleScores).map(([key, score]) => ({
    key,
    label: VOCATION_LABELS[key] || key,
    score: Math.round(score * 100) / 100,
  }));

  entries.sort((a, b) => b.score - a.score);

  const top = entries[0] || { key: 'software-engineer', label: 'Software Engineer', score: 0 };

  return {
    roleKey: top.key,
    label: top.label,
    scores: entries,
  };
}

import { Axis } from '@/lib/persona';

// A small list of creative persona archetypes. Each has:
// - `axes`: The one or two top axes it represents.
// - `name`: The short label shown to the player.
// - `description`: A brief, fun explanation.
interface PersonaArchetype {
  axes: Axis[];          // one or two axes that define this persona
  name: string;          // the persona title
  description: string;   // a short blurb for the player
  svgPath: string;  // path to the SVG icon representing this persona
}

export const ALL_ARCHETYPES: PersonaArchetype[] = [
  {
    axes: ['Innovation', 'Autonomy'],
    name: 'The Visionary Architect',
    description:
      'You thrive on big ideas and working independently. You see the “big picture” and enjoy pioneering novel solutions.',
    svgPath: '/personas/va.svg',
  },
  {
    axes: ['Stability', 'Precision'],
    name: 'The Precision Engineer',
    description:
      'You value reliability and exactness above all else. Meticulous and methodical, you ensure every component is rock-solid.',
    svgPath: '/personas/pe.svg',
  },
  {
    axes: ['Speed', 'Performance-First'],
    name: 'The Rapid Deployer',
    description:
      'Fast-paced and results-driven, you push for high throughput and decisive action. You optimize every workflow for maximum velocity.',
    svgPath: '/personas/rd.svg',
  },
  {
    axes: ['Cost-Conscious', 'Collaboration'],
    name: 'The Strategic Coordinator',
    description:
      'You balance budgets and teamwork, ensuring resources are used wisely. You excel at unifying cross-functional teams to meet cost targets together.',
    svgPath: '/personas/sc.svg',
  },
  {
    axes: ['Innovation', 'Collaboration'],
    name: 'The Creative Collaborator',
    description:
      'Brainstorming with peers energizes you. You fuel innovation by harnessing collective insight, and group ideation is your superpower.',
    svgPath: '/personas/cc.svg',
  },
  {
    axes: ['Stability', 'Cost-Conscious'],
    name: 'The Pragmatic Steward',
    description:
      'You prioritize dependable outcomes while being mindful of expenses. Practical and risk-averse, you keep projects on budget and on track.',
    svgPath: '/personas/ps.svg',
  },
  {
    axes: ['Precision', 'Performance-First'],
    name: 'The Performance Tactician',
    description:
      'You engineer for both accuracy and speed. Every decimal point matters, yet you never sacrifice throughput.',
    svgPath: '/personas/pt.svg',
  },
  {
    axes: ['Innovation', 'Performance-First'],
    name: 'The Cutting-Edge Sprinter',
    description:
      'Constantly seeking the next performance edge, you innovate at breakneck speed. Experimentation and rapid prototyping are your forte.',
    svgPath: '/personas/ces.svg',
  },
  {
    axes: ['Autonomy', 'Stability'],
    name: 'The Steadfast Soloist',
    description:
      'You work best alone but reliably. You appreciate stable environments where you can focus deeply without too much noise.',
    svgPath: '/personas/ss.svg',
  },
  {
    axes: ['Speed', 'Collaboration'],
    name: 'The Agile Team Player',
    description:
      'You deliver quickly by iterating closely with your teammates. Fast feedback loops and pair-programming keep you in sync.',
    svgPath: '/personas/atp.svg',
  },
];

// If no strong winner emerges, fall back to this:
export const DEFAULT_ARCHETYPE: PersonaArchetype = {
  axes: [],
  name: 'The Balanced Integrator',
  description:
    'You maintain a healthy balance across all dimensions: innovation, stability, speed, and collaboration. You adapt to whatever the team needs most.',
  svgPath: '/personas/bi.svg',
};

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
): { name: string; description: string; svgPath: string } {
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
    if (twoMatch) {
      return {
        name: twoMatch.name,
        description: twoMatch.description,
        svgPath: twoMatch.svgPath,
      };
    }
  }

  // 3) If no two‐axis match, find any archetype containing the top axis
  const singleMatch = ALL_ARCHETYPES.find((p) => p.axes.includes(topAxis));
  if (singleMatch) {
    return {
      name: singleMatch.name,
      description: singleMatch.description,
      svgPath: singleMatch.svgPath,
    };
  }

  // 4) Fallback
  return {
    name: DEFAULT_ARCHETYPE.name,
    description: DEFAULT_ARCHETYPE.description,
    svgPath: DEFAULT_ARCHETYPE.svgPath,
  };
}

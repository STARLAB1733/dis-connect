import { Scenario, GroupScenario } from '@/types/scenario';

import arc1ch1 from '../scenarios/arc1-ch1.json';
import arc1ch2 from '../scenarios/arc1-ch2.json';
import arc1ch3 from '../scenarios/arc1-ch3.json';
import arc1ch4 from '../scenarios/arc1-ch4.json';
import arc1group from '../scenarios/arc1-group.json';

import arc2ch1 from '../scenarios/arc2-ch1.json';
import arc2ch2 from '../scenarios/arc2-ch2.json';
import arc2ch3 from '../scenarios/arc2-ch3.json';
import arc2ch4 from '../scenarios/arc2-ch4.json';
import arc2group from '../scenarios/arc2-group.json';

import arc3ch1 from '../scenarios/arc3-ch1.json';
import arc3ch2 from '../scenarios/arc3-ch2.json';
import arc3ch3 from '../scenarios/arc3-ch3.json';
import arc3ch4 from '../scenarios/arc3-ch4.json';
import arc3group from '../scenarios/arc3-group.json';

/**
 * 3 story arcs, each with 4 chapters.
 * Arc 0: NDP 2026 — The Show Must Go On
 * Arc 1: Exercise Northstar — Digitise the Fight
 * Arc 2: Ops Resilience — Singapore Goes Dark
 */
export const ARCS: Scenario[][] = [
  [
    arc1ch1 as unknown as Scenario,
    arc1ch2 as unknown as Scenario,
    arc1ch3 as unknown as Scenario,
    arc1ch4 as unknown as Scenario,
  ],
  [
    arc2ch1 as unknown as Scenario,
    arc2ch2 as unknown as Scenario,
    arc2ch3 as unknown as Scenario,
    arc2ch4 as unknown as Scenario,
  ],
  [
    arc3ch1 as unknown as Scenario,
    arc3ch2 as unknown as Scenario,
    arc3ch3 as unknown as Scenario,
    arc3ch4 as unknown as Scenario,
  ],
];

export const ALL_SCENARIOS: Scenario[] = ARCS.flat();

export const GROUP_SCENARIOS: GroupScenario[] = [
  arc1group as unknown as GroupScenario,
  arc2group as unknown as GroupScenario,
  arc3group as unknown as GroupScenario,
];

export function getScenario(arcIdx: number, chapterIdx: number): Scenario | null {
  return ARCS[arcIdx]?.[chapterIdx] ?? null;
}

export function getGroupScenario(arcIdx: number): GroupScenario | null {
  return GROUP_SCENARIOS[arcIdx] ?? null;
}

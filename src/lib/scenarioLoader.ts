import { Scenario } from '@/types/scenario';
import chapter1 from '../scenarios/chapter-1-the-call.json';
import chapter2 from '../scenarios/chapter-2-going-deep.json';
import chapter3 from '../scenarios/chapter-3-crunch-time.json';
import chapter4 from '../scenarios/chapter-4-the-debrief.json';

// Scenarios ordered by chapter (1 to 4)
export const ALL_SCENARIOS: Scenario[] = [
  chapter1 as unknown as Scenario,
  chapter2 as unknown as Scenario,
  chapter3 as unknown as Scenario,
  chapter4 as unknown as Scenario,
];

export function getScenario(index: number): Scenario | null {
  return ALL_SCENARIOS[index] || null;
}

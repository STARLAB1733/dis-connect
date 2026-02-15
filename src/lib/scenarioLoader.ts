import { Scenario } from '@/types/scenario';
import opFirstLight from '../scenarios/operation-first-light.json';
import opHawkeye    from '../scenarios/operation-hawkeye.json';
import opFirewall   from '../scenarios/operation-firewall.json';
import opOverwatch  from '../scenarios/operation-overwatch.json';

// Scenarios ordered by mission round (1 to 4)
export const ALL_SCENARIOS: Scenario[] = [
  opFirstLight as unknown as Scenario,
  opHawkeye    as unknown as Scenario,
  opFirewall   as unknown as Scenario,
  opOverwatch  as unknown as Scenario,
];

export function getScenario(index: number): Scenario | null {
  return ALL_SCENARIOS[index] || null;
}

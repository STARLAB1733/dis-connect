import { Scenario } from '@/types/scenario';
import featureRelease from '../scenarios/feature-release.json';
import incidentResp   from '../scenarios/incident-response.json';
import perfTune       from '../scenarios/performance-tuning.json';
import secAudit       from '../scenarios/security-audit.json';

export const ALL_SCENARIOS: Scenario[] = [
  featureRelease as Scenario,
  incidentResp as Scenario,
  perfTune as Scenario,
  secAudit as Scenario,
];

export function getScenario(index: number): Scenario | null {
  return ALL_SCENARIOS[index] || null;
}

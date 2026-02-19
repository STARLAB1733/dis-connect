/**
 * Role-fit scoring system.
 * Each scenario answer contributes points toward SE, Cloud, or Data affinity.
 * The role the player scores highest in is their best fit.
 */

export type RoleKey = 'se' | 'cloud' | 'data';

export type RoleFitImpact = Partial<Record<RoleKey, number>>;

export interface RoleFitTotals {
  se: number;
  cloud: number;
  data: number;
}

export function computeRoleFit(impacts: RoleFitImpact[]): RoleFitTotals {
  const totals: RoleFitTotals = { se: 0, cloud: 0, data: 0 };
  for (const impact of impacts) {
    if (impact.se) totals.se += impact.se;
    if (impact.cloud) totals.cloud += impact.cloud;
    if (impact.data) totals.data += impact.data;
  }
  return totals;
}

export function getBestFitRole(totals: RoleFitTotals): RoleKey {
  if (totals.se >= totals.cloud && totals.se >= totals.data) return 'se';
  if (totals.cloud >= totals.se && totals.cloud >= totals.data) return 'cloud';
  return 'data';
}

export interface RoleProfile {
  key: RoleKey;
  name: string;
  tagline: string;
  description: string;
  dayInLife: string[];
  svgPath: string;
}

export const ROLE_PROFILES: Record<RoleKey, RoleProfile> = {
  se: {
    key: 'se',
    name: 'Software Engineer',
    tagline: 'You build the weapons and shields of the digital age.',
    description:
      "As a Software Engineer at DIS, you're not building another food delivery app. You're coding systems that actually matter — from intelligence platforms that process real threats in real time, to tools that help analysts make faster, smarter calls. If you love solving hard problems and want your code to mean something, this is it.",
    dayInLife: [
      'Designing and building internal tools used by analysts and operators',
      'Working on secure communication platforms and data pipelines',
      'Reviewing code for security vulnerabilities before deployment',
      'Collaborating with data scientists to productionise AI models',
      'Shipping fast while keeping things rock solid',
    ],
    svgPath: '/roles/swe.svg',
  },
  cloud: {
    key: 'cloud',
    name: 'Cloud Platform Engineer',
    tagline: "You keep the entire operation running — even when someone's trying to tear it down.",
    description:
      "Cloud Platform Engineers at DIS are the backbone of everything. You design and manage the infrastructure that every other team depends on. When systems are under attack, you're the one keeping the lights on. When we need to scale fast, you make it happen. It's high stakes, high impact, and no two days look the same.",
    dayInLife: [
      'Managing secure cloud environments across multiple government systems',
      'Designing resilient architectures that stay up under attack',
      'Automating infrastructure deployment and monitoring',
      'Responding to incidents and leading recovery operations',
      'Building cost-efficient systems without sacrificing reliability',
    ],
    svgPath: '/roles/ce.svg',
  },
  data: {
    key: 'data',
    name: 'Data & AI Engineer',
    tagline: 'You turn noise into signal — and signal into action.',
    description:
      "At DIS, Data & AI Engineers don't just run models — they build the analytical edge that keeps Singapore ahead. You'll work with massive, messy, real-world datasets to find patterns that humans would miss. You'll build AI tools that help analysts see threats coming before they arrive. It's equal parts scientist, engineer, and detective.",
    dayInLife: [
      'Building and training models on real operational data',
      'Designing data pipelines that clean and process information at scale',
      'Developing anomaly detection systems for cyber threats',
      'Working with analysts to turn complex findings into clear insights',
      'Staying current on AI/ML research and applying it practically',
    ],
    svgPath: '/roles/ds.svg',
  },
};

import { describe, it, expect } from 'vitest';
import { getPersonaIdentity, getVocationRecommendation, ALL_ARCHETYPES, DEFAULT_ARCHETYPE } from '../personaMapping';
import type { Axis } from '../persona';

// Helper: build a full normalized score map with all axes at `base`,
// then override specific axes with higher values.
function scores(overrides: Partial<Record<Axis, number>>): Record<Axis, number> {
  const base: Record<Axis, number> = {
    Innovation: 50, Stability: 50, Speed: 50, Precision: 50,
    'Cost-Conscious': 50, 'Performance-First': 50, Autonomy: 50, Collaboration: 50,
  };
  return { ...base, ...overrides };
}

// ─── getPersonaIdentity ───────────────────────────────────────────────────────

describe('getPersonaIdentity', () => {
  it('returns a non-empty name and description', () => {
    const result = getPersonaIdentity(scores({ Innovation: 95, Autonomy: 90 }));
    expect(result.name).toBeTruthy();
    expect(result.description).toBeTruthy();
  });

  it('matches The Visionary Architect for Innovation + Autonomy', () => {
    const result = getPersonaIdentity(scores({ Innovation: 95, Autonomy: 90 }));
    expect(result.name).toBe('The Visionary Architect');
  });

  it('matches The Precision Engineer for Stability + Precision', () => {
    const result = getPersonaIdentity(scores({ Stability: 95, Precision: 90 }));
    expect(result.name).toBe('The Precision Engineer');
  });

  it('matches The Rapid Deployer for Speed + Performance-First', () => {
    const result = getPersonaIdentity(scores({ Speed: 95, 'Performance-First': 90 }));
    expect(result.name).toBe('The Rapid Deployer');
  });

  it('matches The Strategic Coordinator for Cost-Conscious + Collaboration', () => {
    const result = getPersonaIdentity(scores({ 'Cost-Conscious': 95, Collaboration: 90 }));
    expect(result.name).toBe('The Strategic Coordinator');
  });

  it('matches The Creative Collaborator for Innovation + Collaboration', () => {
    const result = getPersonaIdentity(scores({ Innovation: 95, Collaboration: 90 }));
    expect(result.name).toBe('The Creative Collaborator');
  });

  it('matches The Pragmatic Steward for Stability + Cost-Conscious', () => {
    const result = getPersonaIdentity(scores({ Stability: 95, 'Cost-Conscious': 90 }));
    expect(result.name).toBe('The Pragmatic Steward');
  });

  it('matches The Performance Tactician for Precision + Performance-First', () => {
    const result = getPersonaIdentity(scores({ Precision: 95, 'Performance-First': 90 }));
    expect(result.name).toBe('The Performance Tactician');
  });

  it('matches The Cutting-Edge Sprinter for Innovation + Performance-First', () => {
    const result = getPersonaIdentity(scores({ Innovation: 95, 'Performance-First': 90 }));
    expect(result.name).toBe('The Cutting-Edge Sprinter');
  });

  it('matches The Steadfast Soloist for Autonomy + Stability', () => {
    const result = getPersonaIdentity(scores({ Autonomy: 95, Stability: 90 }));
    expect(result.name).toBe('The Steadfast Soloist');
  });

  it('matches The Agile Team Player for Speed + Collaboration', () => {
    const result = getPersonaIdentity(scores({ Speed: 95, Collaboration: 90 }));
    expect(result.name).toBe('The Agile Team Player');
  });

  it('covers all 10 defined archetypes — no archetype is unreachable', () => {
    const reachable = new Set<string>();
    for (const archetype of ALL_ARCHETYPES) {
      const [ax1, ax2] = archetype.axes;
      const input = scores({ [ax1]: 95, ...(ax2 ? { [ax2]: 90 } : {}) } as Partial<Record<Axis, number>>);
      reachable.add(getPersonaIdentity(input).name);
    }
    expect(reachable.size).toBe(ALL_ARCHETYPES.length);
  });

  it('falls back to a single-axis match when the second axis has no paired archetype', () => {
    // Innovation is top axis, but second axis (Stability) has no archetype pairing with Innovation.
    // Falls back to first archetype containing Innovation = The Visionary Architect.
    const result = getPersonaIdentity(scores({ Innovation: 95, Stability: 90 }));
    const hasInnovation = ALL_ARCHETYPES.find(a => a.axes.includes('Innovation'));
    expect(result.name).toBe(hasInnovation?.name);
  });

  it('always returns a valid svgPath string', () => {
    const result = getPersonaIdentity(scores({ Innovation: 95, Autonomy: 90 }));
    expect(result.svgPath).toMatch(/^\/personas\/.+\.svg$/);
  });

  it('DEFAULT_ARCHETYPE has the expected shape', () => {
    expect(DEFAULT_ARCHETYPE.name).toBeTruthy();
    expect(DEFAULT_ARCHETYPE.svgPath).toMatch(/\.svg$/);
    expect(DEFAULT_ARCHETYPE.axes).toHaveLength(0);
  });
});

// ─── getVocationRecommendation ────────────────────────────────────────────────

describe('getVocationRecommendation', () => {
  it('picks the role with the highest cumulative score', () => {
    const result = getVocationRecommendation({
      'software-engineer': 3,
      'data-scientist': 7,
      'cloud-engineer': 5,
    });
    expect(result.roleKey).toBe('data-scientist');
    expect(result.label).toBe('Data Science & AI');
  });

  it('includes all provided roles in the scores array, sorted descending', () => {
    const result = getVocationRecommendation({
      'software-engineer': 2,
      'data-scientist': 5,
      'cloud-engineer': 3,
    });
    expect(result.scores).toHaveLength(3);
    expect(result.scores[0].key).toBe('data-scientist');
    expect(result.scores[1].key).toBe('cloud-engineer');
    expect(result.scores[2].key).toBe('software-engineer');
  });

  it('defaults to software-engineer when scores are empty', () => {
    const result = getVocationRecommendation({});
    expect(result.roleKey).toBe('software-engineer');
  });

  it('rounds scores to 2 decimal places', () => {
    const result = getVocationRecommendation({ 'software-engineer': 3.14159 });
    expect(result.scores[0].score).toBe(3.14);
  });

  it('handles a single role correctly', () => {
    const result = getVocationRecommendation({ 'cloud-engineer': 10 });
    expect(result.roleKey).toBe('cloud-engineer');
    expect(result.label).toBe('Cloud Engineer');
    expect(result.scores).toHaveLength(1);
  });

  it('uses raw key as label for unknown role keys', () => {
    const result = getVocationRecommendation({ 'mystery-role': 5 });
    expect(result.scores[0].label).toBe('mystery-role');
  });
});

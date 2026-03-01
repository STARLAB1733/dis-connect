import { describe, it, expect } from 'vitest';
import { computePersona, computePerRoleScores } from '../persona';

const ALL_AXES = [
  'Innovation', 'Stability', 'Speed', 'Precision',
  'Cost-Conscious', 'Performance-First', 'Autonomy', 'Collaboration',
] as const;

// ─── computePersona ───────────────────────────────────────────────────────────

describe('computePersona', () => {
  it('returns all 8 axes even with no impacts', () => {
    const result = computePersona([]);
    expect(Object.keys(result).sort()).toEqual([...ALL_AXES].sort());
  });

  it('returns 50 for every axis when there are no impacts', () => {
    const result = computePersona([]);
    ALL_AXES.forEach(axis => expect(result[axis]).toBe(50));
  });

  it('maps the highest-impact axis to 100 and its opposite to 0', () => {
    // Innovation = +2, Stability = -2, all others absent → maxV = 2
    const result = computePersona([{ Innovation: 2, Stability: -2 }]);
    expect(result['Innovation']).toBe(100);
    expect(result['Stability']).toBe(0);
    // Axes with no impact land at 50
    expect(result['Speed']).toBe(50);
  });

  it('sums impacts across multiple rounds before normalising', () => {
    // Two rounds each contributing Innovation: 1 → total 2
    const result = computePersona([{ Innovation: 1 }, { Innovation: 1 }]);
    expect(result['Innovation']).toBe(100);
    // All other axes (total 0, max 2) → 50
    expect(result['Collaboration']).toBe(50);
  });

  it('handles a single positive impact', () => {
    const result = computePersona([{ Collaboration: 4 }]);
    // maxV = 4, Collaboration = 4/4*50+50 = 100
    expect(result['Collaboration']).toBe(100);
    expect(result['Innovation']).toBe(50);
  });

  it('handles a single negative impact', () => {
    const result = computePersona([{ Speed: -3 }]);
    // maxV = 3, Speed = -3/3*50+50 = 0
    expect(result['Speed']).toBe(0);
    expect(result['Precision']).toBe(50);
  });

  it('normalises across multiple axes correctly', () => {
    // Precision: 3, Cost-Conscious: -1 → maxV = 3
    const result = computePersona([{ Precision: 3, 'Cost-Conscious': -1 }]);
    expect(result['Precision']).toBe(100);                          // 3/3*50+50
    expect(result['Cost-Conscious']).toBe(Math.round((-1 / 3) * 50 + 50));
    expect(result['Innovation']).toBe(50);
  });

  it('always returns integer values (Math.round applied)', () => {
    const result = computePersona([{ Innovation: 1, Stability: 2 }]);
    ALL_AXES.forEach(axis => {
      expect(Number.isInteger(result[axis])).toBe(true);
    });
  });

  it('all scores are in the range [0, 100]', () => {
    const result = computePersona([
      { Innovation: 5, Stability: -3, Collaboration: 2, Speed: -1 },
    ]);
    ALL_AXES.forEach(axis => {
      expect(result[axis]).toBeGreaterThanOrEqual(0);
      expect(result[axis]).toBeLessThanOrEqual(100);
    });
  });
});

// ─── computePerRoleScores ─────────────────────────────────────────────────────

describe('computePerRoleScores', () => {
  it('returns an empty object for no logs', () => {
    expect(computePerRoleScores([])).toEqual({});
  });

  it('sums absolute axis impact values for a single log entry', () => {
    const result = computePerRoleScores([
      { role: 'software-engineer', axisImpact: { Innovation: 2, Stability: -1 } },
    ]);
    // |2| + |-1| = 3
    expect(result['software-engineer']).toBe(3);
  });

  it('uses absolute values so negatives contribute positively to vocation score', () => {
    const result = computePerRoleScores([
      { role: 'cloud-engineer', axisImpact: { 'Cost-Conscious': -4 } },
    ]);
    expect(result['cloud-engineer']).toBe(4);
  });

  it('accumulates across multiple log entries for the same role', () => {
    const result = computePerRoleScores([
      { role: 'data-scientist', axisImpact: { Precision: 1.5 } },
      { role: 'data-scientist', axisImpact: { Collaboration: 2.5 } },
    ]);
    expect(result['data-scientist']).toBeCloseTo(4);
  });

  it('tracks scores independently across different roles', () => {
    const result = computePerRoleScores([
      { role: 'software-engineer', axisImpact: { Innovation: 3 } },
      { role: 'data-scientist',    axisImpact: { Precision: 2 } },
      { role: 'cloud-engineer',    axisImpact: { Stability: 1 } },
    ]);
    expect(result['software-engineer']).toBe(3);
    expect(result['data-scientist']).toBe(2);
    expect(result['cloud-engineer']).toBe(1);
  });

  it('handles mixed positive and negative impacts in the same log', () => {
    const result = computePerRoleScores([
      { role: 'software-engineer', axisImpact: { Innovation: 2, 'Cost-Conscious': -3 } },
    ]);
    expect(result['software-engineer']).toBe(5); // |2| + |-3|
  });
});

import { describe, it, expect } from 'vitest';
import { computePersona, computePerRoleScores } from './persona';

describe('computePersona', () => {
  it('returns 50 for all axes when no impacts are given', () => {
    const result = computePersona([]);
    expect(result.Innovation).toBe(50);
    expect(result.Stability).toBe(50);
  });

  it('returns 100 for a maxed positive axis', () => {
    const result = computePersona([{ Innovation: 10 }]);
    expect(result.Innovation).toBe(100);
  });

  it('returns 0 for a maxed negative axis', () => {
    const result = computePersona([{ Innovation: -10 }]);
    expect(result.Innovation).toBe(0);
  });

  it('sets unaffected axes to 50', () => {
    const result = computePersona([{ Innovation: 10 }]);
    expect(result.Stability).toBe(50);
    expect(result.Speed).toBe(50);
  });

  it('normalises opposing axes correctly', () => {
    const result = computePersona([{ Innovation: 5, Stability: -5 }]);
    expect(result.Innovation).toBe(100);
    expect(result.Stability).toBe(0);
  });

  it('accumulates impacts across multiple entries', () => {
    const result = computePersona([
      { Innovation: 5 },
      { Innovation: 5 },
    ]);
    expect(result.Innovation).toBe(100); // 10 total, normalised to max
  });

  it('always returns all 8 axis keys', () => {
    const axes = ['Innovation', 'Stability', 'Speed', 'Precision',
      'Cost-Conscious', 'Performance-First', 'Autonomy', 'Collaboration'];
    const result = computePersona([{ Speed: 3 }]);
    axes.forEach(axis => expect(result).toHaveProperty(axis));
  });

  it('keeps values in [0, 100] range', () => {
    const result = computePersona([{ Innovation: 999, Stability: -999 }]);
    Object.values(result).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
});

describe('computePerRoleScores', () => {
  it('returns empty object for no logs', () => {
    expect(computePerRoleScores([])).toEqual({});
  });

  it('sums absolute impact values per role', () => {
    const logs = [
      { role: 'software-engineer', axisImpact: { Innovation: 2, Stability: 1 } },
      { role: 'software-engineer', axisImpact: { Speed: 3 } },
    ];
    const result = computePerRoleScores(logs);
    expect(result['software-engineer']).toBeCloseTo(6); // |2|+|1|+|3|
  });

  it('tracks multiple roles independently', () => {
    const logs = [
      { role: 'software-engineer', axisImpact: { Innovation: 4 } },
      { role: 'data-scientist', axisImpact: { Precision: 6 } },
    ];
    const result = computePerRoleScores(logs);
    expect(result['software-engineer']).toBeCloseTo(4);
    expect(result['data-scientist']).toBeCloseTo(6);
  });

  it('uses absolute values so negative impacts still count toward score', () => {
    const logs = [{ role: 'cloud-engineer', axisImpact: { Stability: -5 } }];
    const result = computePerRoleScores(logs);
    expect(result['cloud-engineer']).toBeCloseTo(5);
  });
});

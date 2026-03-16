/**
 * Scoring formula tests — mirrors the logic inside ScenarioWrapper.handleComplete
 * without requiring Firebase or React. Any formula change there must keep these passing.
 */
import { describe, it, expect } from 'vitest';

// ── Helpers replicating ScenarioWrapper scoring formulas ─────────────────────

function scoreOrder(
  userOrder: string[],
  correctOrder: string[],
  baseImpact: Record<string, number>
): Record<string, number> {
  let correctCount = 0;
  correctOrder.forEach((id, idx) => { if (userOrder[idx] === id) correctCount++; });
  const ratio = correctOrder.length > 0 ? correctCount / correctOrder.length : 0;
  const result: Record<string, number> = {};
  Object.entries(baseImpact).forEach(([axis, value]) => { result[axis] = value * ratio; });
  return result;
}

function scoreLayout(
  userMapping: Record<string, string[]>,
  dropZoneIds: string[],
  correctOrder: string[],
  baseImpact: Record<string, number>
): Record<string, number> {
  const N = dropZoneIds.length;
  const userZoneIndex: Record<string, number> = {};
  dropZoneIds.forEach((zid, zi) => {
    (userMapping[zid] || []).forEach(itemId => { userZoneIndex[itemId] = zi; });
  });
  const correctZoneIndex: Record<string, number> = {};
  correctOrder.forEach((itemId, i) => { correctZoneIndex[itemId] = i; });

  let totalDistance = 0;
  correctOrder.forEach(itemId => {
    const czi = correctZoneIndex[itemId];
    const uzi = userZoneIndex[itemId];
    totalDistance += uzi === undefined ? Math.abs((N - 1) - czi) : Math.abs(uzi - czi);
  });

  let maxDistance = 0;
  for (let i = 0; i < N; i++) {
    maxDistance += Math.max(Math.abs(i), Math.abs(i - (N - 1)));
  }

  let ratio = 1 - totalDistance / maxDistance;
  if (ratio < 0) ratio = 0;

  const result: Record<string, number> = {};
  Object.entries(baseImpact).forEach(([axis, value]) => { result[axis] = value * ratio; });
  return result;
}

function scoreNumeric(
  userValue: number,
  expected: number,
  tolerance: number,
  baseImpact: Record<string, number>
): Record<string, number> {
  const diff = Math.abs(userValue - expected);
  let ratio = (tolerance - diff) / tolerance;
  if (ratio < 0) ratio = 0;
  const result: Record<string, number> = {};
  Object.entries(baseImpact).forEach(([axis, value]) => { result[axis] = value * ratio; });
  return result;
}

function applyHintPenalty(impact: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  Object.entries(impact).forEach(([axis, value]) => { result[axis] = value * 0.7; });
  return result;
}

// ── Order scoring ────────────────────────────────────────────────────────────
describe('scoreOrder', () => {
  const base = { Innovation: 10, Stability: 5 };
  const correct = ['a', 'b', 'c', 'd'];

  it('gives full score for perfect order', () => {
    const result = scoreOrder(['a', 'b', 'c', 'd'], correct, base);
    expect(result.Innovation).toBeCloseTo(10);
    expect(result.Stability).toBeCloseTo(5);
  });

  it('gives zero score for completely wrong order', () => {
    const result = scoreOrder(['d', 'c', 'b', 'a'], correct, base);
    expect(result.Innovation).toBe(0);
    expect(result.Stability).toBe(0);
  });

  it('gives partial score proportional to correct positions', () => {
    // 2 of 4 correct
    const result = scoreOrder(['a', 'b', 'd', 'c'], correct, base);
    expect(result.Innovation).toBeCloseTo(5); // 2/4 * 10
  });

  it('gives zero score when correctOrder is empty', () => {
    const result = scoreOrder([], [], base);
    expect(result.Innovation).toBe(0);
  });
});

// ── Layout scoring ───────────────────────────────────────────────────────────
describe('scoreLayout', () => {
  const zones = ['z0', 'z1', 'z2', 'z3'];
  const correct = ['item-a', 'item-b', 'item-c', 'item-d'];
  const base = { Speed: 8 };

  it('gives full score for perfect placement', () => {
    const mapping = { z0: ['item-a'], z1: ['item-b'], z2: ['item-c'], z3: ['item-d'] };
    const result = scoreLayout(mapping, zones, correct, base);
    expect(result.Speed).toBeCloseTo(8);
  });

  it('gives reduced score for reversed placement', () => {
    const mapping = { z0: ['item-d'], z1: ['item-c'], z2: ['item-b'], z3: ['item-a'] };
    const result = scoreLayout(mapping, zones, correct, base);
    expect(result.Speed).toBeGreaterThan(0);
    expect(result.Speed).toBeLessThan(8);
  });

  it('clamps ratio to 0, never negative', () => {
    // Everything left in palette (all missing)
    const mapping = { z0: [], z1: [], z2: [], z3: [] };
    const result = scoreLayout(mapping, zones, correct, base);
    expect(result.Speed).toBeGreaterThanOrEqual(0);
  });
});

// ── Numeric scoring ──────────────────────────────────────────────────────────
describe('scoreNumeric', () => {
  const base = { Precision: 20 };

  it('gives full score for exact match', () => {
    expect(scoreNumeric(50, 50, 10, base).Precision).toBeCloseTo(20);
  });

  it('gives zero score at the tolerance boundary', () => {
    expect(scoreNumeric(60, 50, 10, base).Precision).toBeCloseTo(0);
  });

  it('gives half score at half the tolerance distance', () => {
    expect(scoreNumeric(55, 50, 10, base).Precision).toBeCloseTo(10);
  });

  it('clamps to zero beyond tolerance', () => {
    expect(scoreNumeric(100, 50, 10, base).Precision).toBe(0);
  });

  it('works symmetrically for values below expected', () => {
    expect(scoreNumeric(45, 50, 10, base).Precision).toBeCloseTo(10);
  });
});

// ── Hint penalty ─────────────────────────────────────────────────────────────
describe('applyHintPenalty', () => {
  it('reduces all axis values by 30%', () => {
    const result = applyHintPenalty({ Innovation: 10, Speed: 20 });
    expect(result.Innovation).toBeCloseTo(7);
    expect(result.Speed).toBeCloseTo(14);
  });

  it('handles zero values without producing NaN', () => {
    const result = applyHintPenalty({ Innovation: 0 });
    expect(result.Innovation).toBe(0);
  });

  it('handles an empty impact object', () => {
    expect(applyHintPenalty({})).toEqual({});
  });
});

// ── Dropout skip helpers ──────────────────────────────────────────────────────
describe('skipMissingPlayers logic', () => {
  function getPendingUids(
    players: { uid: string }[],
    roundAnswers: Record<string, boolean>
  ): string[] {
    return players.map(p => p.uid).filter(uid => !roundAnswers[uid]);
  }

  it('returns all uids when no one has answered', () => {
    const players = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];
    expect(getPendingUids(players, {})).toEqual(['a', 'b', 'c']);
  });

  it('returns only uids that have not answered', () => {
    const players = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];
    expect(getPendingUids(players, { a: true })).toEqual(['b', 'c']);
  });

  it('returns empty array when all have answered', () => {
    const players = [{ uid: 'a' }, { uid: 'b' }];
    expect(getPendingUids(players, { a: true, b: true })).toEqual([]);
  });

  it('handles empty player list', () => {
    expect(getPendingUids([], {})).toEqual([]);
  });
});

// ── promoteToHost logic ───────────────────────────────────────────────────────
describe('promoteToHost logic', () => {
  function reorderForPromotion(
    players: { uid: string; name: string }[],
    promoteeUid: string
  ): { uid: string; name: string }[] {
    return [
      players.find(p => p.uid === promoteeUid)!,
      ...players.filter(p => p.uid !== promoteeUid),
    ];
  }

  it('moves the promoted player to index 0', () => {
    const players = [
      { uid: 'host', name: 'Host' },
      { uid: 'p2', name: 'Player 2' },
      { uid: 'p3', name: 'Player 3' },
    ];
    const result = reorderForPromotion(players, 'p2');
    expect(result[0].uid).toBe('p2');
  });

  it('preserves all other players in relative order', () => {
    const players = [
      { uid: 'host', name: 'Host' },
      { uid: 'p2', name: 'Player 2' },
      { uid: 'p3', name: 'Player 3' },
    ];
    const result = reorderForPromotion(players, 'p2');
    expect(result.map(p => p.uid)).toEqual(['p2', 'host', 'p3']);
  });

  it('keeps total player count the same', () => {
    const players = [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }];
    expect(reorderForPromotion(players, 'b').length).toBe(2);
  });
});

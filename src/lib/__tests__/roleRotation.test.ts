import { describe, it, expect } from 'vitest';
import {
  ROLE_KEYS,
  CHAPTERS_PER_ARC,
  NUM_ARCS,
  getPlayerRole,
  allPlayersAnswered,
  nextChapterState,
  isGroupPhaseRequired,
  getFacilitatorIdx,
} from '../roleRotation';

// ─── getPlayerRole ────────────────────────────────────────────────────────────

describe('getPlayerRole', () => {
  it('assigns SE / DS / CE to players 0‑2 at rotation 0', () => {
    expect(getPlayerRole(0, 0)).toBe('software-engineer');
    expect(getPlayerRole(1, 0)).toBe('data-scientist');
    expect(getPlayerRole(2, 0)).toBe('cloud-engineer');
  });

  it('shifts all roles by 1 after arc 1 (rotationIdx = 1)', () => {
    expect(getPlayerRole(0, 1)).toBe('data-scientist');
    expect(getPlayerRole(1, 1)).toBe('cloud-engineer');
    expect(getPlayerRole(2, 1)).toBe('software-engineer');
  });

  it('shifts all roles by 2 after arc 2 (rotationIdx = 2)', () => {
    expect(getPlayerRole(0, 2)).toBe('cloud-engineer');
    expect(getPlayerRole(1, 2)).toBe('software-engineer');
    expect(getPlayerRole(2, 2)).toBe('data-scientist');
  });

  it('wraps correctly for player indices beyond 2', () => {
    // Player 3 behaves like player 0
    expect(getPlayerRole(3, 0)).toBe(getPlayerRole(0, 0));
  });

  it('every returned value is a valid ROLE_KEY', () => {
    for (let idx = 0; idx < 3; idx++) {
      for (let rot = 0; rot < 3; rot++) {
        expect(ROLE_KEYS).toContain(getPlayerRole(idx, rot));
      }
    }
  });
});

// ─── allPlayersAnswered ───────────────────────────────────────────────────────

describe('allPlayersAnswered', () => {
  it('returns true when all uids are marked true', () => {
    expect(allPlayersAnswered({ a: true, b: true }, ['a', 'b'])).toBe(true);
  });

  it('returns false when at least one uid is missing', () => {
    expect(allPlayersAnswered({ a: true }, ['a', 'b'])).toBe(false);
  });

  it('returns false when no one has answered', () => {
    expect(allPlayersAnswered({}, ['a', 'b'])).toBe(false);
  });

  it('returns true vacuously for an empty player list', () => {
    expect(allPlayersAnswered({}, [])).toBe(true);
  });

  it('ignores extra uids in roundAnswers that are not players', () => {
    expect(allPlayersAnswered({ a: true, ghost: true }, ['a'])).toBe(true);
  });
});

// ─── nextChapterState ─────────────────────────────────────────────────────────

describe('nextChapterState', () => {
  it('advances chapter within an arc', () => {
    expect(nextChapterState(0, 0, 0)).toEqual({ arcIdx: 0, chapterIdx: 1, rotationIdx: 0, finished: false });
    expect(nextChapterState(1, 1, 1)).toEqual({ arcIdx: 1, chapterIdx: 2, rotationIdx: 1, finished: false });
  });

  it('advances to the last chapter of arc 0', () => {
    expect(nextChapterState(0, 2, 0)).toEqual({ arcIdx: 0, chapterIdx: 3, rotationIdx: 0, finished: false });
  });

  it('rolls over to the next arc and increments rotationIdx', () => {
    // Arc boundary: chapterIdx = CHAPTERS_PER_ARC - 1
    expect(nextChapterState(0, CHAPTERS_PER_ARC - 1, 0)).toEqual({
      arcIdx: 1, chapterIdx: 0, rotationIdx: 1, finished: false,
    });
    expect(nextChapterState(1, CHAPTERS_PER_ARC - 1, 1)).toEqual({
      arcIdx: 2, chapterIdx: 0, rotationIdx: 2, finished: false,
    });
  });

  it('returns finished = true after the final chapter of the final arc', () => {
    const result = nextChapterState(NUM_ARCS - 1, CHAPTERS_PER_ARC - 1, 2);
    expect(result.finished).toBe(true);
    // Indices do not advance beyond the last valid position
    expect(result.arcIdx).toBe(NUM_ARCS - 1);
    expect(result.chapterIdx).toBe(CHAPTERS_PER_ARC - 1);
  });

  it('finished is false for every non-terminal chapter', () => {
    for (let arc = 0; arc < NUM_ARCS; arc++) {
      for (let ch = 0; ch < CHAPTERS_PER_ARC - 1; ch++) {
        expect(nextChapterState(arc, ch, 0).finished).toBe(false);
      }
    }
    // Arc boundaries that are not the final arc
    for (let arc = 0; arc < NUM_ARCS - 1; arc++) {
      expect(nextChapterState(arc, CHAPTERS_PER_ARC - 1, 0).finished).toBe(false);
    }
  });
});

// ─── isGroupPhaseRequired ─────────────────────────────────────────────────────

describe('isGroupPhaseRequired', () => {
  it('returns false for 1 player', () => {
    expect(isGroupPhaseRequired(1)).toBe(false);
  });

  it('returns true for 2 players', () => {
    expect(isGroupPhaseRequired(2)).toBe(true);
  });

  it('returns true for 3 players', () => {
    expect(isGroupPhaseRequired(3)).toBe(true);
  });
});

// ─── getFacilitatorIdx ────────────────────────────────────────────────────────

describe('getFacilitatorIdx', () => {
  it('player 0 facilitates arc 0 in a 3-player game', () => {
    expect(getFacilitatorIdx(0, 3)).toBe(0);
  });

  it('player 1 facilitates arc 1 in a 3-player game', () => {
    expect(getFacilitatorIdx(1, 3)).toBe(1);
  });

  it('player 2 facilitates arc 2 in a 3-player game', () => {
    expect(getFacilitatorIdx(2, 3)).toBe(2);
  });

  it('wraps around for a 2-player game', () => {
    expect(getFacilitatorIdx(0, 2)).toBe(0);
    expect(getFacilitatorIdx(1, 2)).toBe(1);
    expect(getFacilitatorIdx(2, 2)).toBe(0); // wraps
  });

  it('solo game always returns player 0', () => {
    expect(getFacilitatorIdx(0, 1)).toBe(0);
    expect(getFacilitatorIdx(1, 1)).toBe(0);
    expect(getFacilitatorIdx(2, 1)).toBe(0);
  });

  it('result is always a valid player index', () => {
    for (let arc = 0; arc < NUM_ARCS; arc++) {
      for (let count = 1; count <= 4; count++) {
        const idx = getFacilitatorIdx(arc, count);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(count);
      }
    }
  });
});

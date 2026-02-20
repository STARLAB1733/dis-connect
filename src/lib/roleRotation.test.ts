import { describe, it, expect } from 'vitest';
import {
  getPlayerRole,
  allPlayersAnswered,
  nextChapterState,
  ROLE_KEYS,
  NUM_ARCS,
  CHAPTERS_PER_ARC,
} from './roleRotation';

// ── getPlayerRole ────────────────────────────────────────────────────────────
describe('getPlayerRole', () => {
  it('assigns correct roles at rotation 0', () => {
    expect(getPlayerRole(0, 0)).toBe('software-engineer');
    expect(getPlayerRole(1, 0)).toBe('data-scientist');
    expect(getPlayerRole(2, 0)).toBe('cloud-engineer');
  });

  it('shifts all roles by 1 after arc 1', () => {
    expect(getPlayerRole(0, 1)).toBe('data-scientist');
    expect(getPlayerRole(1, 1)).toBe('cloud-engineer');
    expect(getPlayerRole(2, 1)).toBe('software-engineer');
  });

  it('shifts all roles by 2 after arc 2', () => {
    expect(getPlayerRole(0, 2)).toBe('cloud-engineer');
    expect(getPlayerRole(1, 2)).toBe('software-engineer');
    expect(getPlayerRole(2, 2)).toBe('data-scientist');
  });

  it('wraps back to original roles after full cycle (rotation 3)', () => {
    expect(getPlayerRole(0, 3)).toBe(getPlayerRole(0, 0));
    expect(getPlayerRole(1, 3)).toBe(getPlayerRole(1, 0));
    expect(getPlayerRole(2, 3)).toBe(getPlayerRole(2, 0));
  });

  it('each player always gets a different role', () => {
    for (let rot = 0; rot < 3; rot++) {
      const roles = [0, 1, 2].map(i => getPlayerRole(i, rot));
      expect(new Set(roles).size).toBe(3);
    }
  });
});

// ── allPlayersAnswered ───────────────────────────────────────────────────────
describe('allPlayersAnswered', () => {
  it('returns true when all players have answered', () => {
    expect(allPlayersAnswered({ uid1: true, uid2: true }, ['uid1', 'uid2'])).toBe(true);
  });

  it('returns false when some players have not answered', () => {
    expect(allPlayersAnswered({ uid1: true }, ['uid1', 'uid2'])).toBe(false);
  });

  it('returns false when no one has answered', () => {
    expect(allPlayersAnswered({}, ['uid1', 'uid2'])).toBe(false);
  });

  it('returns true vacuously for an empty player list', () => {
    expect(allPlayersAnswered({}, [])).toBe(true);
  });

  it('ignores extra keys not in the player list', () => {
    expect(allPlayersAnswered({ uid1: true, ghost: true }, ['uid1'])).toBe(true);
  });
});

// ── nextChapterState ─────────────────────────────────────────────────────────
describe('nextChapterState', () => {
  it('advances chapter within the same arc', () => {
    const result = nextChapterState(0, 0, 0);
    expect(result).toEqual({ arcIdx: 0, chapterIdx: 1, rotationIdx: 0, finished: false });
  });

  it('advances to next arc after last chapter', () => {
    const result = nextChapterState(0, CHAPTERS_PER_ARC - 1, 0);
    expect(result).toEqual({ arcIdx: 1, chapterIdx: 0, rotationIdx: 1, finished: false });
  });

  it('increments rotationIdx on each arc transition', () => {
    const arc1End = nextChapterState(0, 3, 0);
    expect(arc1End.rotationIdx).toBe(1);
    const arc2End = nextChapterState(1, 3, 1);
    expect(arc2End.rotationIdx).toBe(2);
  });

  it('signals finished after the very last chapter', () => {
    const result = nextChapterState(NUM_ARCS - 1, CHAPTERS_PER_ARC - 1, 2);
    expect(result.finished).toBe(true);
  });

  it('does not modify arcIdx/chapterIdx when finished', () => {
    // finished = true means caller reads the flag; indices stay where they are
    const result = nextChapterState(2, 3, 2);
    expect(result.arcIdx).toBe(2);
    expect(result.chapterIdx).toBe(3);
  });

  it('covers all 12 chapters without finishing early', () => {
    let arc = 0, chapter = 0, rotation = 0;
    let steps = 0;
    while (true) {
      const next = nextChapterState(arc, chapter, rotation);
      if (next.finished) break;
      arc = next.arcIdx;
      chapter = next.chapterIdx;
      rotation = next.rotationIdx;
      steps++;
    }
    expect(steps).toBe(NUM_ARCS * CHAPTERS_PER_ARC - 1); // 11 advances for 12 chapters
  });
});

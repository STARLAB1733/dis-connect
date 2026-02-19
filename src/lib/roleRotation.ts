/**
 * Role rotation for synchronized rounds.
 * 3 arcs x 4 chapters = 12 total chapters.
 * After each arc (4 chapters), roles rotate: SE -> DS -> CE -> SE
 */
export const ROLE_KEYS = ['software-engineer', 'data-scientist', 'cloud-engineer'] as const;
export type RoleKey = typeof ROLE_KEYS[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  'software-engineer': 'Software Engineer',
  'data-scientist': 'Data Science & AI',
  'cloud-engineer': 'Cloud Engineer',
};

export const NUM_ARCS = 3;
export const CHAPTERS_PER_ARC = 4;

/**
 * Get the role for a player given their index in the player array and the current arc rotation.
 * rotationIdx advances by 1 after each arc completes.
 */
export function getPlayerRole(playerIdx: number, rotationIdx: number): RoleKey {
  return ROLE_KEYS[(playerIdx + rotationIdx) % 3];
}

/**
 * All players have answered the current chapter when roundAnswers contains all player UIDs.
 */
export function allPlayersAnswered(
  roundAnswers: Record<string, boolean>,
  playerUids: string[]
): boolean {
  return playerUids.every(uid => roundAnswers[uid] === true);
}

/**
 * Advance to the next chapter or arc.
 * Returns { arcIdx, chapterIdx, rotationIdx } for the next state.
 */
export function nextChapterState(
  arcIdx: number,
  chapterIdx: number,
  rotationIdx: number
): { arcIdx: number; chapterIdx: number; rotationIdx: number; finished: boolean } {
  const nextChapter = chapterIdx + 1;
  if (nextChapter < CHAPTERS_PER_ARC) {
    return { arcIdx, chapterIdx: nextChapter, rotationIdx, finished: false };
  }
  const nextArc = arcIdx + 1;
  if (nextArc < NUM_ARCS) {
    return { arcIdx: nextArc, chapterIdx: 0, rotationIdx: rotationIdx + 1, finished: false };
  }
  return { arcIdx, chapterIdx, rotationIdx, finished: true };
}

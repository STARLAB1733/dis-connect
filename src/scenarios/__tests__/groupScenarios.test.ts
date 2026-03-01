import { describe, it, expect } from 'vitest';
import { GROUP_SCENARIOS } from '@/lib/scenarioLoader';

const VALID_AXES = new Set([
  'Innovation', 'Stability', 'Speed', 'Precision',
  'Cost-Conscious', 'Performance-First', 'Autonomy', 'Collaboration',
]);

// ─── Structural validation ────────────────────────────────────────────────────

describe('GROUP_SCENARIOS structure', () => {
  it('has exactly 3 group scenarios (one per arc)', () => {
    expect(GROUP_SCENARIOS).toHaveLength(3);
  });

  it('arcIdx values match their position in the array', () => {
    GROUP_SCENARIOS.forEach((gs, i) => {
      expect(gs.arcIdx).toBe(i);
    });
  });

  it('each group scenario has a non-empty arcName', () => {
    GROUP_SCENARIOS.forEach(gs => {
      expect(gs.arcName).toBeTruthy();
    });
  });

  it('each arc has exactly 2 group questions', () => {
    GROUP_SCENARIOS.forEach(gs => {
      expect(gs.questions).toHaveLength(2);
    });
  });

  it('every question has type "group-wager-choice"', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        expect(q.type).toBe('group-wager-choice');
      });
    });
  });
});

// ─── Per-question field validation ────────────────────────────────────────────

describe('GROUP_SCENARIOS question fields', () => {
  it('every question has a non-empty title', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        expect(q.title).toBeTruthy();
      });
    });
  });

  it('every question has a non-empty storyContext', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        expect(q.storyContext.length).toBeGreaterThan(0);
      });
    });
  });

  it('every question has a non-empty facilitatorPrompt', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        expect(q.facilitatorPrompt.length).toBeGreaterThan(0);
      });
    });
  });

  it('every question has at least one wagerOption', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        expect(q.wagerOptions.length).toBeGreaterThan(0);
      });
    });
  });

  it('all wagerOptions are positive integers', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.wagerOptions.forEach(w => {
          expect(Number.isInteger(w)).toBe(true);
          expect(w).toBeGreaterThan(0);
        });
      });
    });
  });

  it('every question has at least 2 answer options', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  it('every answer option has a non-empty id and label', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.options.forEach(opt => {
          expect(opt.id).toBeTruthy();
          expect(opt.label).toBeTruthy();
        });
      });
    });
  });

  it('option ids are unique within each question', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        const ids = q.options.map(o => o.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  });
});

// ─── Axis key validation ──────────────────────────────────────────────────────

describe('GROUP_SCENARIOS axisImpact keys', () => {
  it('every axisImpact key is a valid axis name', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.options.forEach(opt => {
          const impact = opt.axisImpact || {};
          Object.keys(impact).forEach(key => {
            expect(VALID_AXES).toContain(key);
          });
        });
      });
    });
  });

  it('every axisImpact value is a finite number', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.options.forEach(opt => {
          Object.values(opt.axisImpact || {}).forEach(v => {
            expect(typeof v).toBe('number');
            expect(Number.isFinite(v)).toBe(true);
          });
        });
      });
    });
  });

  it('every answer option has at least one axisImpact entry', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.options.forEach(opt => {
          expect(Object.keys(opt.axisImpact || {}).length).toBeGreaterThan(0);
        });
      });
    });
  });
});

// ─── Wager math ───────────────────────────────────────────────────────────────

describe('wager multiplication math', () => {
  it('wageredImpact = baseImpact * wager for each axis (positive wager)', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.wagerOptions.forEach(wager => {
          q.options.forEach(opt => {
            const base = opt.axisImpact || {};
            Object.entries(base).forEach(([axis, value]) => {
              const wagered = (value ?? 0) * wager;
              expect(wagered).toBeCloseTo((value ?? 0) * wager);
            });
          });
        });
      });
    });
  });

  it('negative axisImpact stays negative when multiplied by a positive wager', () => {
    GROUP_SCENARIOS.forEach(gs => {
      gs.questions.forEach(q => {
        q.options.forEach(opt => {
          Object.values(opt.axisImpact || {}).forEach(value => {
            if ((value ?? 0) < 0) {
              const wager = q.wagerOptions[0];
              expect((value ?? 0) * wager).toBeLessThan(0);
            }
          });
        });
      });
    });
  });
});

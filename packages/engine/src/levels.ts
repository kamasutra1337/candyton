import type { LevelConfig } from './types.js';

/**
 * Hand-tuned 30-level journey across five chapters. Difficulty ramps via fewer
 * moves, more colours, bigger boards and tougher / mixed objectives. Seeds are
 * fixed so every player faces the same board — fair for leaderboards and
 * reproducible for server-side validation.
 */
export const LEVELS: LevelConfig[] = [
  // ── Chapter 1 · Sugar Meadow (gentle onboarding) ──────────────────────
  { id: 1, name: 'First Sparks', rows: 8, cols: 8, colors: 5, moves: 20, seed: 1001, objectives: [{ kind: 'score', target: 2000 }], starScores: [2000, 3500, 5000] },
  { id: 2, name: 'Sweet Harvest', rows: 8, cols: 8, colors: 5, moves: 18, seed: 1002, objectives: [{ kind: 'collect', color: 0, count: 25 }], starScores: [2500, 4000, 6000] },
  { id: 3, name: 'Twin Craving', rows: 8, cols: 8, colors: 6, moves: 22, seed: 1003, objectives: [{ kind: 'collect', color: 1, count: 20 }, { kind: 'collect', color: 3, count: 20 }], starScores: [3000, 5000, 7500] },
  { id: 4, name: 'Detonator', rows: 8, cols: 8, colors: 6, moves: 20, seed: 1004, objectives: [{ kind: 'clearSpecials', count: 4 }], starScores: [3000, 5500, 8000] },
  { id: 5, name: 'Meadow Rush', rows: 8, cols: 8, colors: 6, moves: 18, seed: 1005, objectives: [{ kind: 'score', target: 5000 }], starScores: [5000, 7500, 11000] },
  { id: 6, name: 'Honey Trap', rows: 8, cols: 8, colors: 6, moves: 20, seed: 1006, objectives: [{ kind: 'collect', color: 2, count: 30 }], starScores: [4000, 6500, 9500] },

  // ── Chapter 2 · Jelly Harbor ──────────────────────────────────────────
  { id: 7, name: 'Tide Pools', rows: 8, cols: 8, colors: 6, moves: 20, seed: 1007, objectives: [{ kind: 'score', target: 8000 }], starScores: [8000, 12000, 16000] },
  { id: 8, name: 'Double Catch', rows: 8, cols: 8, colors: 6, moves: 22, seed: 1008, objectives: [{ kind: 'collect', color: 4, count: 22 }, { kind: 'collect', color: 5, count: 22 }], starScores: [4500, 7500, 11000] },
  { id: 9, name: 'Boom Harbor', rows: 8, cols: 8, colors: 6, moves: 18, seed: 1009, objectives: [{ kind: 'clearSpecials', count: 5 }], starScores: [4000, 7000, 10500] },
  { id: 10, name: 'Salt & Sugar', rows: 8, cols: 8, colors: 7, moves: 20, seed: 1010, objectives: [{ kind: 'score', target: 9000 }, { kind: 'collect', color: 0, count: 18 }], starScores: [9000, 13000, 18000] },
  { id: 11, name: 'Riptide', rows: 9, cols: 9, colors: 6, moves: 18, seed: 1011, objectives: [{ kind: 'score', target: 10000 }], starScores: [10000, 15000, 21000] },
  { id: 12, name: 'Harbor Master', rows: 9, cols: 9, colors: 7, moves: 20, seed: 1012, objectives: [{ kind: 'collect', color: 3, count: 30 }, { kind: 'clearSpecials', count: 4 }], starScores: [7000, 11000, 16000] },

  // ── Chapter 3 · Frosted Peaks ─────────────────────────────────────────
  { id: 13, name: 'Snow Line', rows: 9, cols: 9, colors: 7, moves: 20, seed: 1013, objectives: [{ kind: 'score', target: 12000 }], starScores: [12000, 17000, 24000] },
  { id: 14, name: 'Icicle Drop', rows: 9, cols: 9, colors: 7, moves: 18, seed: 1014, objectives: [{ kind: 'collect', color: 2, count: 32 }], starScores: [6000, 10000, 15000] },
  { id: 15, name: 'Avalanche', rows: 9, cols: 9, colors: 7, moves: 16, seed: 1015, objectives: [{ kind: 'clearSpecials', count: 7 }], starScores: [7000, 12000, 18000] },
  { id: 16, name: 'Frozen Twins', rows: 9, cols: 9, colors: 7, moves: 20, seed: 1016, objectives: [{ kind: 'collect', color: 1, count: 24 }, { kind: 'collect', color: 6, count: 24 }], starScores: [7000, 12000, 17000] },
  { id: 17, name: 'Blizzard', rows: 9, cols: 9, colors: 7, moves: 17, seed: 1017, objectives: [{ kind: 'score', target: 14000 }], starScores: [14000, 20000, 28000] },
  { id: 18, name: 'Summit Gate', rows: 9, cols: 9, colors: 7, moves: 20, seed: 1018, objectives: [{ kind: 'score', target: 13000 }, { kind: 'clearSpecials', count: 5 }], starScores: [13000, 19000, 26000] },

  // ── Chapter 4 · Cocoa Depths ──────────────────────────────────────────
  { id: 19, name: 'Dark Roast', rows: 9, cols: 9, colors: 7, moves: 18, seed: 1019, objectives: [{ kind: 'score', target: 16000 }], starScores: [16000, 22000, 30000] },
  { id: 20, name: 'Bitter Vein', rows: 9, cols: 9, colors: 7, moves: 18, seed: 1020, objectives: [{ kind: 'collect', color: 5, count: 34 }], starScores: [7000, 12000, 18000] },
  { id: 21, name: 'Chain Reaction', rows: 9, cols: 9, colors: 8, moves: 16, seed: 1021, objectives: [{ kind: 'clearSpecials', count: 8 }], starScores: [8000, 13000, 19000] },
  { id: 22, name: 'Molten Core', rows: 9, cols: 9, colors: 8, moves: 20, seed: 1022, objectives: [{ kind: 'score', target: 18000 }, { kind: 'collect', color: 2, count: 20 }], starScores: [18000, 25000, 34000] },
  { id: 23, name: 'Truffle Hunt', rows: 9, cols: 9, colors: 8, moves: 18, seed: 1023, objectives: [{ kind: 'collect', color: 0, count: 26 }, { kind: 'collect', color: 7, count: 26 }], starScores: [8000, 13000, 19000] },
  { id: 24, name: 'Depth Charge', rows: 9, cols: 9, colors: 8, moves: 17, seed: 1024, objectives: [{ kind: 'score', target: 17000 }, { kind: 'clearSpecials', count: 6 }], starScores: [17000, 24000, 33000] },

  // ── Chapter 5 · Rainbow Summit (expert) ───────────────────────────────
  { id: 25, name: 'Prism Break', rows: 9, cols: 9, colors: 8, moves: 18, seed: 1025, objectives: [{ kind: 'score', target: 20000 }], starScores: [20000, 28000, 38000] },
  { id: 26, name: 'Spectrum', rows: 9, cols: 9, colors: 8, moves: 20, seed: 1026, objectives: [{ kind: 'collect', color: 4, count: 30 }, { kind: 'clearSpecials', count: 6 }], starScores: [10000, 16000, 23000] },
  { id: 27, name: 'Overdrive', rows: 9, cols: 9, colors: 8, moves: 16, seed: 1027, objectives: [{ kind: 'clearSpecials', count: 9 }], starScores: [9000, 15000, 22000] },
  { id: 28, name: 'Sugar Storm', rows: 9, cols: 9, colors: 8, moves: 18, seed: 1028, objectives: [{ kind: 'score', target: 22000 }], starScores: [22000, 30000, 42000] },
  { id: 29, name: 'Candy Crown', rows: 9, cols: 9, colors: 8, moves: 20, seed: 1029, objectives: [{ kind: 'score', target: 20000 }, { kind: 'collect', color: 3, count: 24 }, { kind: 'clearSpecials', count: 5 }], starScores: [20000, 28000, 38000] },
  { id: 30, name: 'Grandmaster', rows: 9, cols: 9, colors: 8, moves: 18, seed: 1030, objectives: [{ kind: 'score', target: 24000 }, { kind: 'clearSpecials', count: 7 }], starScores: [24000, 33000, 45000] },
];

/** Chapters group the journey for the level map. `[startId, endId]` inclusive. */
export const CHAPTERS: { name: string; icon: string; from: number; to: number }[] = [
  { name: 'Sugar Meadow', icon: '🌸', from: 1, to: 6 },
  { name: 'Jelly Harbor', icon: '🌊', from: 7, to: 12 },
  { name: 'Frosted Peaks', icon: '🏔️', from: 13, to: 18 },
  { name: 'Cocoa Depths', icon: '🍫', from: 19, to: 24 },
  { name: 'Rainbow Summit', icon: '🌈', from: 25, to: 30 },
];

export function getLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

/**
 * A head-to-head duel board. Both players build the identical board from the
 * same `seed` and race for the highest score within the move limit. The score
 * target is unreachable so play always runs to the last move — the final score
 * is what decides the duel.
 */
export function duelLevel(seed: number): LevelConfig {
  return {
    id: 0,
    name: 'Duel',
    rows: 8,
    cols: 8,
    colors: 6,
    moves: 20,
    seed: seed >>> 0,
    objectives: [{ kind: 'score', target: Number.MAX_SAFE_INTEGER }],
    starScores: [3000, 6000, 10000],
  };
}

/** Star rating (0–3) for a score, using the level's thresholds. */
export function starsForScore(level: LevelConfig, score: number): number {
  const t = level.starScores ?? [level.moves * 200, level.moves * 350, level.moves * 500];
  if (score >= t[2]) return 3;
  if (score >= t[1]) return 2;
  if (score >= t[0]) return 1;
  return 0;
}

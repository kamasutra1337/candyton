import type { LevelConfig } from './types.js';

/**
 * Hand-tuned progression. Difficulty ramps via fewer moves, more colours and
 * tougher objectives. Seeds are fixed so every player faces the same board —
 * fair for leaderboards and reproducible for server-side validation.
 */
export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'First Sparks',
    rows: 8,
    cols: 8,
    colors: 5,
    moves: 20,
    seed: 1001,
    objectives: [{ kind: 'score', target: 2000 }],
    starScores: [2000, 3500, 5000],
  },
  {
    id: 2,
    name: 'Sweet Harvest',
    rows: 8,
    cols: 8,
    colors: 5,
    moves: 18,
    seed: 1002,
    objectives: [{ kind: 'collect', color: 0, count: 25 }],
    starScores: [2500, 4000, 6000],
  },
  {
    id: 3,
    name: 'Twin Craving',
    rows: 8,
    cols: 8,
    colors: 6,
    moves: 22,
    seed: 1003,
    objectives: [
      { kind: 'collect', color: 1, count: 20 },
      { kind: 'collect', color: 3, count: 20 },
    ],
    starScores: [3000, 5000, 7500],
  },
  {
    id: 4,
    name: 'Detonator',
    rows: 8,
    cols: 8,
    colors: 6,
    moves: 20,
    seed: 1004,
    objectives: [{ kind: 'clearSpecials', count: 4 }],
    starScores: [3000, 5500, 8000],
  },
  {
    id: 5,
    name: 'Score Rush',
    rows: 9,
    cols: 9,
    colors: 6,
    moves: 18,
    seed: 1005,
    objectives: [{ kind: 'score', target: 8000 }],
    starScores: [8000, 12000, 16000],
  },
  {
    id: 6,
    name: 'Rainbow Run',
    rows: 9,
    cols: 9,
    colors: 6,
    moves: 20,
    seed: 1006,
    objectives: [
      { kind: 'clearSpecials', count: 6 },
      { kind: 'score', target: 6000 },
    ],
    starScores: [6000, 10000, 15000],
  },
  {
    id: 7,
    name: 'Frenzy',
    rows: 9,
    cols: 9,
    colors: 7,
    moves: 16,
    seed: 1007,
    objectives: [{ kind: 'score', target: 10000 }],
    starScores: [10000, 15000, 21000],
  },
  {
    id: 8,
    name: 'Grandmaster',
    rows: 9,
    cols: 9,
    colors: 7,
    moves: 18,
    seed: 1008,
    objectives: [
      { kind: 'collect', color: 2, count: 30 },
      { kind: 'clearSpecials', count: 5 },
    ],
    starScores: [7000, 11000, 16000],
  },
  {
    id: 9,
    name: 'Sugar Storm',
    rows: 9,
    cols: 9,
    colors: 7,
    moves: 20,
    seed: 1009,
    objectives: [{ kind: 'score', target: 14000 }],
    starScores: [14000, 20000, 28000],
  },
  {
    id: 10,
    name: 'Prism Break',
    rows: 9,
    cols: 9,
    colors: 7,
    moves: 18,
    seed: 1010,
    objectives: [
      { kind: 'collect', color: 4, count: 28 },
      { kind: 'score', target: 9000 },
    ],
    starScores: [9000, 14000, 20000],
  },
  {
    id: 11,
    name: 'Overdrive',
    rows: 9,
    cols: 9,
    colors: 8,
    moves: 16,
    seed: 1011,
    objectives: [{ kind: 'clearSpecials', count: 8 }],
    starScores: [8000, 13000, 19000],
  },
  {
    id: 12,
    name: 'Candy Crown',
    rows: 9,
    cols: 9,
    colors: 8,
    moves: 20,
    seed: 1012,
    objectives: [
      { kind: 'score', target: 18000 },
      { kind: 'clearSpecials', count: 6 },
    ],
    starScores: [18000, 26000, 36000],
  },
];

export function getLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** Star rating (0–3) for a score, using the level's thresholds. */
export function starsForScore(level: LevelConfig, score: number): number {
  const t = level.starScores ?? [level.moves * 200, level.moves * 350, level.moves * 500];
  if (score >= t[2]) return 3;
  if (score >= t[1]) return 2;
  if (score >= t[0]) return 1;
  return 0;
}

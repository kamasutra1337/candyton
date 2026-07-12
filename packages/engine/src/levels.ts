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
  },
];

export function getLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

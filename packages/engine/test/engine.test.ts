import { describe, expect, it } from 'vitest';
import { Match3Engine } from '../src/engine.js';
import { getLevel, LEVELS } from '../src/levels.js';
import { findHint, hasValidMove } from '../src/solver.js';
import { findMatches } from '../src/matching.js';
import type { LevelConfig, Pos } from '../src/types.js';
import { isFull } from './helpers.js';

const level1 = getLevel(1)!;

function boardColors(e: Match3Engine): number[] {
  const b = e.getBoard();
  const out: number[] = [];
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) out.push(b.cells[r]![c]!.color);
  return out;
}

describe('Match3Engine setup', () => {
  it('starts full with no pre-existing matches', () => {
    const e = new Match3Engine(level1);
    expect(isFull(e.getBoard())).toBe(true);
    expect(findMatches(e.getBoard())).toHaveLength(0);
  });

  it('is deterministic for a given seed', () => {
    const a = new Match3Engine(level1);
    const b = new Match3Engine(level1);
    expect(boardColors(a)).toEqual(boardColors(b));
  });

  it('always offers at least one valid move at start', () => {
    for (const lvl of LEVELS) {
      const e = new Match3Engine(lvl);
      expect(hasValidMove(e.getBoard())).toBe(true);
    }
  });
});

describe('Match3Engine swaps', () => {
  it('rejects a non-adjacent swap without spending a move', () => {
    const e = new Match3Engine(level1);
    const before = e.getState().movesLeft;
    const res = e.swap({ r: 0, c: 0 }, { r: 3, c: 3 });
    expect(res.valid).toBe(false);
    expect(e.getState().movesLeft).toBe(before);
  });

  it('applies a hinted swap, scores points and refills the board', () => {
    const e = new Match3Engine(level1);
    const hint = findHint(e.getBoard());
    expect(hint).not.toBeNull();
    const before = e.getState();
    const res = e.swap(hint!.a, hint!.b);
    expect(res.valid).toBe(true);
    expect(e.getState().movesLeft).toBe(before.movesLeft - 1);
    expect(e.getState().score).toBeGreaterThan(before.score);
    expect(isFull(e.getBoard())).toBe(true);
    // A resolved board never leaves a dangling match.
    expect(findMatches(e.getBoard())).toHaveLength(0);
  });

  it('reverts an unproductive swap and keeps the board intact', () => {
    const e = new Match3Engine(level1);
    // Find a swap that produces nothing.
    let dead: { a: Pos; b: Pos } | null = null;
    const b = e.getBoard();
    outer: for (let r = 0; r < b.rows && !dead; r++) {
      for (let c = 0; c + 1 < b.cols; c++) {
        const a: Pos = { r, c };
        const bb: Pos = { r, c: c + 1 };
        const test = new Match3Engine(level1);
        const res = test.swap(a, bb);
        if (!res.valid) {
          dead = { a, b: bb };
          break outer;
        }
      }
    }
    expect(dead).not.toBeNull();
    const before = boardColors(e);
    const res = e.swap(dead!.a, dead!.b);
    expect(res.valid).toBe(false);
    expect(boardColors(e)).toEqual(before);
  });

  it('keeps the board full through a long random-ish game', () => {
    const e = new Match3Engine(level1);
    let guard = 0;
    while (e.getState().status === 'playing' && guard++ < 200) {
      const hint = findHint(e.getBoard());
      if (!hint) break;
      const prevScore = e.getState().score;
      e.swap(hint.a, hint.b);
      expect(isFull(e.getBoard())).toBe(true);
      expect(e.getState().score).toBeGreaterThanOrEqual(prevScore);
    }
  });
});

describe('Match3Engine objectives', () => {
  it('wins when the score objective is met', () => {
    const easy: LevelConfig = {
      id: 999,
      name: 'Test',
      rows: 8,
      cols: 8,
      colors: 5,
      moves: 30,
      seed: 4242,
      objectives: [{ kind: 'score', target: 1 }],
    };
    const e = new Match3Engine(easy);
    const hint = findHint(e.getBoard())!;
    e.swap(hint.a, hint.b);
    expect(e.getState().status).toBe('won');
  });

  it('loses when moves run out before objectives complete', () => {
    const hard: LevelConfig = {
      id: 998,
      name: 'Impossible',
      rows: 8,
      cols: 8,
      colors: 6,
      moves: 1,
      seed: 4242,
      objectives: [{ kind: 'score', target: 10_000_000 }],
    };
    const e = new Match3Engine(hard);
    const hint = findHint(e.getBoard())!;
    e.swap(hint.a, hint.b);
    expect(e.getState().status).toBe('lost');
  });
});

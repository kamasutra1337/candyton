import { describe, expect, it } from 'vitest';
import { findMatches } from '../src/matching.js';
import { makeBoard } from './helpers.js';

describe('findMatches classification', () => {
  it('finds a plain 3-in-a-row with no special', () => {
    const b = makeBoard([
      [1, 1, 1, 2],
      [3, 4, 3, 4],
      [2, 3, 2, 3],
    ]);
    const groups = findMatches(b);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.cells).toHaveLength(3);
    expect(groups[0]!.special).toBeNull();
  });

  it('creates a horizontal striped candy from a 4-in-a-row', () => {
    const b = makeBoard([
      [1, 1, 1, 1, 2],
      [3, 4, 3, 4, 3],
      [2, 3, 2, 3, 2],
    ]);
    const groups = findMatches(b);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.special).toBe('stripedH');
  });

  it('creates a vertical striped candy from a vertical 4', () => {
    const b = makeBoard([
      [1, 2, 3],
      [1, 3, 2],
      [1, 2, 3],
      [1, 3, 2],
      [2, 2, 3],
    ]);
    const groups = findMatches(b);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.special).toBe('stripedV');
  });

  it('creates a colour bomb from a 5-in-a-row', () => {
    const b = makeBoard([
      [1, 1, 1, 1, 1],
      [2, 3, 2, 3, 2],
      [3, 2, 3, 2, 3],
    ]);
    const groups = findMatches(b);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.special).toBe('colorBomb');
  });

  it('creates a wrapped candy from an L shape', () => {
    const b = makeBoard([
      [1, 2, 3],
      [1, 3, 2],
      [1, 1, 1],
    ]);
    const groups = findMatches(b);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.special).toBe('wrapped');
    // The pivot should sit on the corner of the L.
    expect(groups[0]!.pivot).toEqual({ r: 2, c: 0 });
  });

  it('returns no matches on a stable board', () => {
    const b = makeBoard([
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
    ]);
    expect(findMatches(b)).toHaveLength(0);
  });
});

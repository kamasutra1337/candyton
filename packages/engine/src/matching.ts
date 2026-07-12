import type { Board, Color, Pos, SpecialType } from './types.js';
import { posKey, tileAt } from './board.js';

/**
 * A connected clump of same-coloured tiles that contains at least one straight
 * run of three. Shape determines the reward:
 *   - 5+ in a straight line  -> Colour Bomb
 *   - both a horizontal and a vertical run (an L or T) -> Wrapped
 *   - exactly 4 in a line     -> Striped (along the run's direction)
 *   - plain 3                 -> no special
 */
export interface MatchGroup {
  cells: Pos[];
  color: Color;
  special: SpecialType | null;
  /** Where a created special should appear (swap cell if possible, else pivot). */
  pivot: Pos;
}

interface Run {
  cells: Pos[];
  orient: 'h' | 'v';
}

function collectRuns(b: Board): Run[] {
  const runs: Run[] = [];
  // Horizontal
  for (let r = 0; r < b.rows; r++) {
    let c = 0;
    while (c < b.cols) {
      const t = tileAt(b, r, c);
      if (!t || t.color < 0) {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < b.cols && tileAt(b, r, end)?.color === t.color) end++;
      if (end - c >= 3) {
        const cells: Pos[] = [];
        for (let k = c; k < end; k++) cells.push({ r, c: k });
        runs.push({ cells, orient: 'h' });
      }
      c = end;
    }
  }
  // Vertical
  for (let c = 0; c < b.cols; c++) {
    let r = 0;
    while (r < b.rows) {
      const t = tileAt(b, r, c);
      if (!t || t.color < 0) {
        r++;
        continue;
      }
      let end = r + 1;
      while (end < b.rows && tileAt(b, end, c)?.color === t.color) end++;
      if (end - r >= 3) {
        const cells: Pos[] = [];
        for (let k = r; k < end; k++) cells.push({ r: k, c });
        runs.push({ cells, orient: 'v' });
      }
      r = end;
    }
  }
  return runs;
}

/** Longest consecutive same-axis span among a set of cells. */
function longestSpan(cells: Pos[], axis: 'h' | 'v'): number {
  const keyed = new Set(cells.map(posKey));
  let best = 0;
  for (const cell of cells) {
    // Only count from the start of a span to avoid double counting.
    const prev = axis === 'h' ? { r: cell.r, c: cell.c - 1 } : { r: cell.r - 1, c: cell.c };
    if (keyed.has(posKey(prev))) continue;
    let len = 0;
    let cur = cell;
    while (keyed.has(posKey(cur))) {
      len++;
      cur = axis === 'h' ? { r: cur.r, c: cur.c + 1 } : { r: cur.r + 1, c: cur.c };
    }
    best = Math.max(best, len);
  }
  return best;
}

/**
 * Finds every match on the board and classifies the reward for each. Adjacent
 * runs of the same colour are merged so an L/T shape is treated as one group.
 */
export function findMatches(b: Board, swap?: Pos): MatchGroup[] {
  const runs = collectRuns(b);
  if (runs.length === 0) return [];

  // Union all matched cells, then split into connected components by colour.
  const matched = new Map<string, Pos>();
  for (const run of runs) for (const cell of run.cells) matched.set(posKey(cell), cell);

  const seen = new Set<string>();
  const groups: MatchGroup[] = [];

  for (const [key, start] of matched) {
    if (seen.has(key)) continue;
    const color = tileAt(b, start.r, start.c)!.color;
    const stack = [start];
    const cells: Pos[] = [];
    seen.add(key);
    while (stack.length) {
      const cur = stack.pop()!;
      cells.push(cur);
      const neighbours: Pos[] = [
        { r: cur.r - 1, c: cur.c },
        { r: cur.r + 1, c: cur.c },
        { r: cur.r, c: cur.c - 1 },
        { r: cur.r, c: cur.c + 1 },
      ];
      for (const n of neighbours) {
        const nk = posKey(n);
        if (seen.has(nk)) continue;
        if (!matched.has(nk)) continue;
        if (tileAt(b, n.r, n.c)?.color !== color) continue;
        seen.add(nk);
        stack.push(n);
      }
    }

    const maxH = longestSpan(cells, 'h');
    const maxV = longestSpan(cells, 'v');
    const maxRun = Math.max(maxH, maxV);

    let special: SpecialType | null = null;
    if (maxRun >= 5) special = 'colorBomb';
    else if (maxH >= 3 && maxV >= 3) special = 'wrapped';
    else if (maxRun === 4) special = maxH === 4 ? 'stripedH' : 'stripedV';

    groups.push({ cells, color, special, pivot: choosePivot(cells, swap) });
  }

  return groups;
}

/** Prefer the player's swapped cell; otherwise the intersection / centre. */
function choosePivot(cells: Pos[], swap?: Pos): Pos {
  if (swap && cells.some((p) => p.r === swap.r && p.c === swap.c)) return swap;
  const keyed = new Set(cells.map(posKey));
  // A cell with both a horizontal and vertical matched neighbour is the corner.
  for (const p of cells) {
    const h =
      keyed.has(posKey({ r: p.r, c: p.c - 1 })) || keyed.has(posKey({ r: p.r, c: p.c + 1 }));
    const v =
      keyed.has(posKey({ r: p.r - 1, c: p.c })) || keyed.has(posKey({ r: p.r + 1, c: p.c }));
    if (h && v) return p;
  }
  return cells[Math.floor(cells.length / 2)]!;
}

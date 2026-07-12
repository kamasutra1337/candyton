import type { Board, Pos, Tile } from './types.js';
import type { Rng } from './rng.js';

export const posKey = (p: Pos): string => `${p.r},${p.c}`;

export const inBounds = (b: Board, r: number, c: number): boolean =>
  r >= 0 && r < b.rows && c >= 0 && c < b.cols;

export const areAdjacent = (a: Pos, b: Pos): boolean =>
  Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export function tileAt(b: Board, r: number, c: number): Tile | null {
  const row = b.cells[r];
  return row ? (row[c] ?? null) : null;
}

/**
 * Creates a fresh, fully populated board with no pre-existing matches — the
 * player should always start from a stable position and earn the first match.
 */
export function createBoard(
  rows: number,
  cols: number,
  colors: number,
  rng: Rng,
  nextId: () => number,
): Board {
  const board: Board = {
    rows,
    cols,
    colors,
    cells: Array.from({ length: rows }, () => Array<Tile | null>(cols).fill(null)),
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board.cells[r]![c] = spawnNonMatching(board, r, c, colors, rng, nextId);
    }
  }
  return board;
}

/** Picks a colour that does not immediately complete a run of three. */
function spawnNonMatching(
  board: Board,
  r: number,
  c: number,
  colors: number,
  rng: Rng,
  nextId: () => number,
): Tile {
  const banned = new Set<number>();
  const left1 = tileAt(board, r, c - 1);
  const left2 = tileAt(board, r, c - 2);
  if (left1 && left2 && left1.color === left2.color) banned.add(left1.color);
  const up1 = tileAt(board, r - 1, c);
  const up2 = tileAt(board, r - 2, c);
  if (up1 && up2 && up1.color === up2.color) banned.add(up1.color);

  let color = rng.int(colors);
  if (banned.size > 0) {
    const allowed: number[] = [];
    for (let k = 0; k < colors; k++) if (!banned.has(k)) allowed.push(k);
    color = allowed[rng.int(allowed.length)] ?? color;
  }
  return { id: nextId(), color, special: null };
}

export function cloneBoard(b: Board): Board {
  return {
    rows: b.rows,
    cols: b.cols,
    colors: b.colors,
    cells: b.cells.map((row) => row.map((t) => (t ? { ...t } : null))),
  };
}

import type { Board, Pos } from './types.js';
import { cloneBoard, tileAt } from './board.js';
import { findMatches } from './matching.js';

/**
 * Returns a swap that would produce a match, or `null` if the board is dead.
 * Used by the client for hints and to detect when a reshuffle is required.
 */
export function findHint(board: Board): { a: Pos; b: Pos } | null {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const right: Pos = { r, c: c + 1 };
      if (c + 1 < board.cols && producesMatch(board, { r, c }, right)) {
        return { a: { r, c }, b: right };
      }
      const down: Pos = { r: r + 1, c };
      if (r + 1 < board.rows && producesMatch(board, { r, c }, down)) {
        return { a: { r, c }, b: down };
      }
    }
  }
  return null;
}

export const hasValidMove = (board: Board): boolean => findHint(board) !== null;

function producesMatch(board: Board, a: Pos, b: Pos): boolean {
  const ta = tileAt(board, a.r, a.c);
  const tb = tileAt(board, b.r, b.c);
  if (!ta || !tb) return false;
  // A Colour Bomb swap is always a productive move.
  if (ta.special === 'colorBomb' || tb.special === 'colorBomb') return true;
  const test = cloneBoard(board);
  const tmp = test.cells[a.r]![a.c];
  test.cells[a.r]![a.c] = test.cells[b.r]![b.c] ?? null;
  test.cells[b.r]![b.c] = tmp ?? null;
  return findMatches(test).length > 0;
}

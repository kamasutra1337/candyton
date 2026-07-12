import type { Board, Tile } from '../src/types.js';

let seq = 1;

/** Builds a board from a grid of colour indices for deterministic unit tests. */
export function makeBoard(grid: number[][], colors = 8): Board {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const cells: (Tile | null)[][] = grid.map((row) =>
    row.map((color) => ({ id: seq++, color, special: null }) as Tile),
  );
  return { rows, cols, colors, cells };
}

export function isFull(board: Board): boolean {
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++) if (!board.cells[r]![c]) return false;
  return true;
}

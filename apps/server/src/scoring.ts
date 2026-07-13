/**
 * Server-authoritative scoring — the anti-cheat heart of the backend.
 *
 * The client submits only the *inputs* to a game (which level, and the ordered
 * list of swaps). The server owns the *outputs*: it constructs a fresh, seeded
 * {@link Match3Engine} and replays every swap, then reads the score/status
 * straight out of the engine. Because the engine is deterministic, this
 * reproduces the one true score for that move list. Any score the client claims
 * is irrelevant to what we store — at most it is compared for a cheat flag.
 */

import { Match3Engine, getLevel, starsForScore } from '@candyblast/engine';

export interface Move {
  a: { r: number; c: number };
  b: { r: number; c: number };
}

export interface SimResult {
  ok: boolean;
  reason?: string;
  /** Authoritative score computed by the server. */
  score: number;
  won: boolean;
  stars: number;
  status: 'playing' | 'won' | 'lost';
  /** How many submitted swaps the engine accepted as legal. */
  appliedMoves: number;
  /** Swaps that were rejected by the engine (no match / not adjacent). */
  rejectedMoves: number;
}

const fail = (reason: string): SimResult => ({
  ok: false,
  reason,
  score: 0,
  won: false,
  stars: 0,
  status: 'playing',
  appliedMoves: 0,
  rejectedMoves: 0,
});

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

function validPos(p: unknown, rows: number, cols: number): p is { r: number; c: number } {
  if (typeof p !== 'object' || p === null) return false;
  const { r, c } = p as { r?: unknown; c?: unknown };
  return isInt(r) && isInt(c) && r >= 0 && r < rows && c >= 0 && c < cols;
}

/**
 * Re-simulate a move list against a level and return the authoritative result.
 * Pure and side-effect free, so it is trivially unit-testable and identical
 * whether it runs in a test, a request handler, or a background replay.
 */
export function simulate(levelId: number, moves: unknown): SimResult {
  const level = getLevel(levelId);
  if (!level) return fail('unknown level');
  if (!Array.isArray(moves)) return fail('moves must be an array');

  const engine = new Match3Engine(level);
  let applied = 0;
  let rejected = 0;

  for (let i = 0; i < moves.length; i++) {
    const mv = moves[i] as { a?: unknown; b?: unknown } | null;
    if (typeof mv !== 'object' || mv === null) {
      return fail(`malformed move at index ${i}`);
    }
    if (!validPos(mv.a, level.rows, level.cols) || !validPos(mv.b, level.rows, level.cols)) {
      return fail(`malformed move at index ${i}`);
    }
    const res = engine.swap(mv.a, mv.b);
    if (res.valid) applied++;
    else rejected++;
  }

  const state = engine.getState();
  return {
    ok: true,
    score: state.score,
    won: state.status === 'won',
    stars: starsForScore(level, state.score),
    status: state.status,
    appliedMoves: applied,
    rejectedMoves: rejected,
  };
}

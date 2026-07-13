import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Match3Engine, getLevel, findHint } from '@candyblast/engine';

import { buildServer } from '../src/server.js';
import { simulate, type Move } from '../src/scoring.js';

/**
 * Generate a genuinely legal move sequence for a level by running a local
 * engine and repeatedly taking a hint (a guaranteed-legal swap). This is
 * exactly how a well-behaved client would play, so the server must reproduce
 * the identical score when it replays the list.
 */
function generateMoves(levelId: number, count: number): Move[] {
  const level = getLevel(levelId)!;
  const engine = new Match3Engine(level);
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const hint = findHint(engine.getBoard());
    if (!hint) break;
    engine.swap(hint.a, hint.b);
    moves.push({ a: hint.a, b: hint.b });
  }
  return moves;
}

async function authDev(app: FastifyInstance, name: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/dev', payload: { name } });
  expect(res.statusCode).toBe(200);
  return res.json().token as string;
}

describe('CandyBlast server-authoritative backend', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildServer();
    await app.ready();
  });

  it('1. issues a dev token and returns the player from /players/me', async () => {
    const auth = await app.inject({ method: 'POST', url: '/auth/dev', payload: { name: 'Alice' } });
    expect(auth.statusCode).toBe(200);
    const body = auth.json();
    expect(typeof body.token).toBe('string');
    expect(body.player.name).toBe('Alice');

    const me = await app.inject({
      method: 'GET',
      url: '/players/me',
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(me.statusCode).toBe(200);
    const profile = me.json();
    expect(profile.id).toBe(body.player.id);
    expect(profile.name).toBe('Alice');
    expect(profile.coins).toBe(0);
    expect(profile.unlocked).toContain(1);
    expect(profile.totalStars).toBe(0);
  });

  it('2. anti-cheat happy path: server score matches independent re-simulation and leaderboard', async () => {
    const token = await authDev(app, 'Bob');
    const moves = generateMoves(1, 10);
    expect(moves.length).toBeGreaterThan(0);

    // Independent local re-simulation of the SAME move list.
    const local = simulate(1, moves);
    expect(local.ok).toBe(true);

    const res = await app.inject({
      method: 'POST',
      url: '/levels/1/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { moves },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accepted).toBe(true);
    expect(body.cheatFlag).toBe(false);
    // Server's computed score equals our independent computation.
    expect(body.score).toBe(local.score);
    expect(body.stars).toBe(local.stars);
    expect(body.won).toBe(local.won);

    // Leaderboard reflects the same authoritative score.
    const lb = await app.inject({ method: 'GET', url: '/leaderboard/1' });
    expect(lb.statusCode).toBe(200);
    const entries = lb.json().entries as Array<{ rank: number; name: string; score: number }>;
    expect(entries[0]).toMatchObject({ rank: 1, name: 'Bob', score: local.score });
  });

  it('3. anti-cheat spoof: a giant claimedScore is ignored and flagged', async () => {
    const token = await authDev(app, 'Mallory');
    const moves = generateMoves(1, 10);
    const local = simulate(1, moves);

    const res = await app.inject({
      method: 'POST',
      url: '/levels/1/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { moves, claimedScore: 9_999_999 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // The stored/returned score is the REAL one, not the claim.
    expect(body.score).toBe(local.score);
    expect(body.score).not.toBe(9_999_999);
    expect(body.cheatFlag).toBe(true);
  });

  it('4. leaderboard ranks two players by authoritative score', async () => {
    const tokenA = await authDev(app, 'PlayerA');
    const tokenB = await authDev(app, 'PlayerB');

    const movesA = generateMoves(1, 12);
    const movesB = generateMoves(1, 4);
    const scoreA = simulate(1, movesA).score;
    const scoreB = simulate(1, movesB).score;

    await app.inject({
      method: 'POST',
      url: '/levels/1/submit',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { moves: movesA },
    });
    await app.inject({
      method: 'POST',
      url: '/levels/1/submit',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { moves: movesB },
    });

    const lb = await app.inject({ method: 'GET', url: '/leaderboard/1?limit=50' });
    const entries = lb.json().entries as Array<{ rank: number; name: string; score: number }>;
    expect(entries).toHaveLength(2);
    // Descending order with contiguous ranks.
    expect(entries[0].rank).toBe(1);
    expect(entries[1].rank).toBe(2);
    expect(entries[0].score).toBeGreaterThanOrEqual(entries[1].score);
    expect(entries[0].score).toBe(Math.max(scoreA, scoreB));
    expect(new Set(entries.map((e) => e.score))).toEqual(new Set([scoreA, scoreB]));
  });

  it('5. a protected route without a token returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/players/me' });
    expect(res.statusCode).toBe(401);
  });
});

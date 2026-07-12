/**
 * Fastify application wiring.
 *
 * `buildServer()` returns a fully configured (but not-yet-listening) Fastify
 * instance. Tests use it with `.inject()` for in-process requests; `index.ts`
 * calls `.listen()` on it. All state (players, tokens, leaderboards) is created
 * per instance, so every `buildServer()` is a clean, isolated world.
 */

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import fstatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { InMemoryStore, type Player, type Store } from './store.js';
import { TokenAuth, bearerFromHeader, verifyTelegramInitData } from './auth.js';
import { simulate } from './scoring.js';

declare module 'fastify' {
  interface FastifyRequest {
    player?: Player;
  }
}

const FIRST_CLEAR_BONUS = 50;
/** Any claimed score differing from the computed score by more than this flags a cheat. */
const CHEAT_TOLERANCE = 1;

export interface BuildOptions {
  store?: Store;
  botToken?: string;
}

export function buildServer(opts: BuildOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const store: Store = opts.store ?? new InMemoryStore();
  const auth = new TokenAuth();
  const botToken = opts.botToken ?? process.env.BOT_TOKEN ?? '';

  app.register(cors, { origin: true });

  /** preHandler that requires a valid bearer token and attaches request.player. */
  function authenticate(req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void): void {
    const token = bearerFromHeader(req.headers.authorization);
    const playerId = token ? auth.resolve(token) : undefined;
    const player = playerId ? store.getPlayer(playerId) : undefined;
    if (!player) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    req.player = player;
    done();
  }

  app.get('/health', async () => ({ ok: true }));

  // --- auth ---------------------------------------------------------------

  app.post('/auth/dev', async (req, reply) => {
    const body = (req.body ?? {}) as { name?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return reply.code(400).send({ error: 'name is required' });
    const player = store.createOrGetPlayer(name);
    const token = auth.issue(player.id);
    return { token, player: { id: player.id, name: player.name } };
  });

  app.post('/auth/telegram', async (req, reply) => {
    const body = (req.body ?? {}) as { initData?: unknown };
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const result = verifyTelegramInitData(initData, botToken);
    if (!result.ok) return reply.code(401).send({ error: result.reason ?? 'invalid initData' });
    const name =
      result.user?.username ??
      [result.user?.first_name, result.user?.last_name].filter(Boolean).join(' ').trim() ??
      `tg_${result.user?.id ?? 'user'}`;
    const player = store.createOrGetPlayer(name || `tg_${result.user?.id ?? 'user'}`);
    const token = auth.issue(player.id);
    return { token, player: { id: player.id, name: player.name } };
  });

  // --- players ------------------------------------------------------------

  app.get('/players/me', { preHandler: authenticate }, async (req) => {
    const p = req.player!;
    const totalStars = Object.values(p.bestStars).reduce((a, b) => a + b, 0);
    return {
      id: p.id,
      name: p.name,
      coins: p.coins,
      unlocked: p.unlocked,
      bestScores: p.bestScores,
      totalStars,
    };
  });

  // --- scoring ------------------------------------------------------------

  app.post<{ Params: { id: string } }>(
    '/levels/:id/submit',
    { preHandler: authenticate },
    async (req, reply) => {
      const p = req.player!;
      const levelId = Number(req.params.id);
      if (!Number.isInteger(levelId)) {
        return reply.code(400).send({ accepted: false, reason: 'invalid level id' });
      }

      const body = (req.body ?? {}) as { moves?: unknown; claimedScore?: unknown };
      const sim = simulate(levelId, body.moves);
      if (!sim.ok) {
        return reply.code(400).send({
          accepted: false,
          score: 0,
          won: false,
          stars: 0,
          coins: 0,
          cheatFlag: false,
          reason: sim.reason,
        });
      }

      // The claimed score never influences what we store — only whether we flag.
      const claimed = typeof body.claimedScore === 'number' ? body.claimedScore : undefined;
      const cheatFlag = claimed !== undefined && Math.abs(claimed - sim.score) > CHEAT_TOLERANCE;

      // Award coins & progression on a win.
      let coinsAwarded = 0;
      if (sim.won) {
        const firstClear = !p.cleared.includes(levelId);
        coinsAwarded = Math.floor(sim.score / 100) + (firstClear ? FIRST_CLEAR_BONUS : 0);
        p.coins += coinsAwarded;
        if (firstClear) p.cleared.push(levelId);
        const next = levelId + 1;
        if (!p.unlocked.includes(next)) p.unlocked.push(next);
      }

      // Best-score / best-stars bookkeeping.
      if (sim.score > (p.bestScores[levelId] ?? -1)) p.bestScores[levelId] = sim.score;
      if (sim.stars > (p.bestStars[levelId] ?? -1)) p.bestStars[levelId] = sim.stars;
      store.savePlayer(p);

      store.recordScore(levelId, {
        playerId: p.id,
        name: p.name,
        score: sim.score,
        stars: sim.stars,
      });

      return {
        accepted: true,
        score: sim.score,
        won: sim.won,
        stars: sim.stars,
        coins: coinsAwarded,
        cheatFlag,
      };
    },
  );

  // --- leaderboards -------------------------------------------------------

  function parseLimit(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(Math.floor(n), 500);
  }

  app.get<{ Params: { levelId: string }; Querystring: { limit?: string } }>(
    '/leaderboard/:levelId',
    async (req, reply) => {
      const levelId = Number(req.params.levelId);
      if (!Number.isInteger(levelId)) {
        return reply.code(400).send({ error: 'invalid level id' });
      }
      const limit = parseLimit(req.query.limit);
      return { entries: store.levelLeaderboard(levelId, limit) };
    },
  );

  app.get<{ Querystring: { limit?: string } }>('/leaderboard', async (req) => {
    const limit = parseLimit(req.query.limit);
    return { entries: store.globalLeaderboard(limit) };
  });

  // --- static frontend ----------------------------------------------------
  // When a built client is present (e.g. on Railway), serve it from the same
  // origin as the API. Declared API routes above take precedence over the
  // static wildcard, so nothing here shadows an endpoint. Skipped in tests /
  // when no build exists.
  const frontendDir =
    process.env.FRONTEND_DIR ?? fileURLToPath(new URL('../../game/dist', import.meta.url));
  if (existsSync(frontendDir)) {
    app.register(fstatic, { root: frontendDir });
    // SPA fallback: any unmatched GET serves index.html.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api')) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.code(404).send({ error: 'not found' });
    });
  }

  return app;
}

# @candyton/server — Match-3 backend

A small, self-contained backend for the CandyTON Match-3 game whose headline
feature is **server-authoritative anti-cheat**: the server never trusts a
client-reported score. It re-simulates the player's move list with the shared
game engine and computes the score itself.

> This is a **standalone** package with its own `node_modules`. It is **not** a
> workspace member — install and run it from inside `apps/server`, separately
> from the repo root. **TON / blockchain is intentionally out of scope** here;
> this is a plain game backend. Storage is **in-memory** and pluggable.

## Anti-cheat design (deterministic re-simulation)

The engine (`@candyton/engine`) is pure and **seeded**, so a given level plus a
given ordered list of swaps always produces the exact same board evolution and
score. The client therefore submits only the *inputs* — `{ levelId, moves }` —
and the server owns the *outputs*:

1. Build a fresh `new Match3Engine(getLevel(levelId))`.
2. Apply every move in order via `engine.swap(a, b)`.
3. Read `engine.getState()` for the authoritative `score` and `status`, and
   `starsForScore(level, score)` for the rating.

Whatever `claimedScore` the client sends is **never** stored. It is only
compared to the computed score: if it differs by more than a small tolerance,
the response carries `cheatFlag: true` (the real, computed score is still what
gets recorded). Malformed moves or an unknown level are rejected outright.

The core is `src/scoring.ts#simulate(levelId, moves)` — pure and unit-tested.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{ ok: true }` |
| `POST` | `/auth/dev` | — | Body `{ name }` → `{ token, player: { id, name } }`. Dev login; token is an opaque in-memory bearer token. |
| `POST` | `/auth/telegram` | — | Body `{ initData }` → validates Telegram WebApp `initData` HMAC (bot token from `BOT_TOKEN`) → `{ token, player }`. |
| `GET` | `/players/me` | Bearer | `{ id, name, coins, unlocked, bestScores, totalStars }`. |
| `POST` | `/levels/:id/submit` | Bearer | Body `{ moves: [{a:{r,c}, b:{r,c}}, ...], claimedScore? }` → `{ accepted, score, won, stars, coins, cheatFlag, reason? }`. Server re-simulates. |
| `GET` | `/leaderboard/:levelId?limit=50` | — | Per-level ranking, highest score first: `{ entries: [{ rank, name, score, stars }] }`. |
| `GET` | `/leaderboard?limit=50` | — | Global ranking by total of best scores across levels. |

### Submit semantics

- `score` / `won` / `stars` are always the server's re-simulated values.
- On a win, coins are awarded: `floor(score / 100)` plus a one-time `+50`
  first-clear bonus per level. The next level is unlocked and best score / best
  stars are updated. The response `coins` is the amount awarded by that submit.
- `cheatFlag` is `true` only when `claimedScore` is present and diverges from
  the computed score. It does **not** reject the submission — the honest score
  is recorded regardless.
- `accepted: false` (HTTP 400) is returned for an unknown level or malformed
  moves, with a `reason`.

## Running

```bash
cd apps/server
npm install          # installs into apps/server/node_modules only
npm run dev          # tsx watch — http://localhost:8787
# or
npm start            # tsx, no watch
```

Environment:

- `PORT` — listen port (default `8787`)
- `HOST` — bind host (default `0.0.0.0`)
- `BOT_TOKEN` — Telegram bot token, only needed for `/auth/telegram`

Runs directly via `tsx` — no build step. The engine is imported as a `file:`
dependency (`@candyton/engine`) and executed straight from its TypeScript
source, guaranteeing the server's rules can never drift from the client's.

## Testing

```bash
npm test             # vitest run, in-process via Fastify .inject()
npm run typecheck    # tsc --noEmit
```

The suite (`test/server.test.ts`) generates a genuinely legal move sequence by
running a local engine and repeatedly taking `findHint()` moves, submits it, and
asserts the server's score equals an independent local re-simulation — plus the
spoofed-`claimedScore` cheat flag, leaderboard ranking, and the 401 path.

## Structure

```
src/
  index.ts     entrypoint: reads PORT, buildServer().listen()
  server.ts    buildServer(): configured Fastify instance (+ CORS, auth preHandler)
  store.ts     in-memory players + leaderboards behind a Store interface (DB-swappable)
  auth.ts      opaque token issue/verify + verifyTelegramInitData (HMAC)
  scoring.ts   simulate(): the pure, unit-testable re-simulation
test/
  server.test.ts
```

Swap `InMemoryStore` for a Postgres/Redis-backed `Store` implementation and no
route code changes.

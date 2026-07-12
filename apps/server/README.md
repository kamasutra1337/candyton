# @candyton/server — Backend (Phase 3)

> **Status: scaffold + plan.** Not implemented yet. This is the Phase 3 brief.

## Why a backend

The whole point of the seeded, deterministic engine (`@candyton/engine`) is that
the server can **re-simulate** a player's move list and independently compute the
score. The client is never trusted for anything that mints tokens or moves a
leaderboard. This is the anti-cheat foundation.

## Responsibilities

- **Auth** — validate Telegram `initData` (HMAC with the bot token), issue a
  short-lived JWT. Optionally bind a TON wallet address.
- **Profiles & progress** — unlocked levels, best scores, `$CANDY` off-chain
  ledger balance (source of truth until Phase 4 claim flow).
- **Authoritative scoring** — client submits `{ levelId, moves[] }`; the server
  runs `new Match3Engine(level)` and replays the moves, accepting the score only
  if the simulation agrees. Rejects impossible move rates / out-of-bounds swaps.
- **Leaderboards** — per-level and global, backed by Redis sorted sets.
- **Reward vouchers** — sign claim vouchers (amount + nonce) consumed by the
  Phase-4 escrow contract.

## Stack

- **NestJS** (modular: `auth`, `players`, `scoring`, `leaderboard`, `rewards`).
- **PostgreSQL** (Prisma) for durable data; **Redis** (Upstash) for leaderboards
  and rate limiting.
- **Shared code:** import `@candyton/engine` directly — the same rules run on
  client and server, so validation can never drift from gameplay.

## API sketch

```
POST /auth/telegram        { initData }            -> { jwt, player }
GET  /players/me                                   -> profile + progress
POST /levels/:id/submit    { moves[] }             -> { accepted, score, coins }
GET  /leaderboard/:levelId?window=all|week         -> ranked entries
POST /rewards/claim        { amount }              -> signed voucher (Phase 4)
```

## Security

- Verify `initData` signature on every session; never trust client-reported
  scores. Rate-limit submissions. JWT + CORS locked to the Mini App origin.
- Idempotent, nonce-guarded reward vouchers to prevent double claims.

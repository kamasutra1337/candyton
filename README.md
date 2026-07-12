# CandyTON 🍬 — Web3 Match-3 for Telegram (TON)

A Candy-Crush-style Match-3 game built as a Telegram Mini App, designed to grow
into a full Web3 title on the TON blockchain and ship to the App Store / Google
Play via Capacitor.

This repo is built **bottom-up**: a fun, fully-playable game first, then the
blockchain economy layered on top of it. Web3 that wraps a boring game is
worthless; Web3 that rewards a game people already love is a business.

---

## What works today (Phases 1–2 — done & verified)

- **`@candyton/engine`** — a pure, dependency-free TypeScript Match-3 engine.
  Seeded and deterministic, so a server can replay a run to validate the score
  and reject cheaters. 15 unit tests cover matching, specials, cascades,
  gravity, objectives and win/lose. No UI, no network, no chain.
  - Specials: **Striped** (4-in-a-row → clears a line), **Wrapped**
    (L/T shape → 3×3 blast), **Colour Bomb** (5-in-a-row → clears a colour).
  - Cascades, combo multipliers, chain-reacting specials.
  - Objectives: score, colour-collection, special-detonation. 8 tuned levels.
- **`@candyton/game`** — the Telegram Mini App client.
  - React + a hand-written Canvas 2D renderer that replays engine "steps" as
    smooth 60 fps tweens (swap, pop, cascade, gravity, refill).
  - Level map with progression/unlocks, best scores and an off-chain
    **$CANDY** reward ledger (Phase 4 mints this as a real TON Jetton).
  - Telegram SDK integration (haptics, theming, safe areas) that degrades
    gracefully in a plain browser.
  - **TON Connect** wallet button wired via `@tonconnect/ui-react`.
  - Colour-blind-safe candy symbols, mobile-first layout, dark candy theme.

## Roadmap

| Phase | Scope | Status |
|------:|-------|--------|
| 1 | Match-3 engine (pure TS, tested) | ✅ done |
| 2 | Client / Telegram Mini App (render, UI, progression) | ✅ done |
| 3 | Backend: NestJS, profiles, **server-side score validation**, anti-cheat, leaderboards | 🚧 scaffold — see [`apps/server`](apps/server/README.md) |
| 4 | TON contracts: $CANDY Jetton, NFT boosters, staking, escrow → client integration → economy | 🚧 scaffold — see [`packages/contracts`](packages/contracts/README.md) |
| 5 | Store packaging: Capacitor → APK/IPA, store compliance (Apple is strict on crypto) | ⏳ planned |

Each phase is its own spec → plan → implement cycle. Nothing downstream is
faked as "done".

---

## Getting started

```bash
npm install          # installs all workspaces
npm test             # runs the engine test suite (15 tests)
npm run dev          # starts the Mini App on http://localhost:5173
npm run build        # typechecks + builds engine and client
```

Open the dev URL on a phone (or Telegram's Mini App test environment) for the
real touch experience. Swipe a candy toward a neighbour to swap.

## Architecture

```
candyton/
├── packages/
│   ├── engine/       @candyton/engine — pure Match-3 rules (no UI/net/chain)
│   │   ├── src/      types · rng · board · matching · engine · solver · levels
│   │   └── test/     vitest suite
│   └── contracts/    TON smart contracts (Phase 4 scaffold + plan)
└── apps/
    ├── game/         @candyton/game — React + Canvas Telegram Mini App
    │   └── src/      render/ · game/ · state/ · ui/ · web3/
    └── server/       NestJS backend (Phase 3 scaffold + plan)
```

**Design principle — clean seams.** The engine knows nothing about React, the
renderer knows nothing about the rules (it just mirrors deltas), and Web3 is a
peripheral, not a dependency of gameplay. Any layer can be tested or replaced in
isolation — and the same engine runs on the server for authoritative validation.

## Security & fair-play posture

- The engine is deterministic and seeded → the Phase-3 server re-simulates a
  reported move list to authoritatively verify the score. The client is never
  trusted for rewards.
- Wallets connect only via TON Connect; the app never sees a private key.
- $CANDY is an off-chain ledger until Phase 4, so there is zero on-chain risk
  surface while the game itself is still being tuned.

## Store-readiness notes

- Runs identically in Telegram and a plain browser, which is what the Capacitor
  (Phase 5) shell wraps for iOS/Android.
- Apple/Google require clear disclosure that Web3 assets are volatile and
  unregulated, a privacy policy, and no on-device mining. These are tracked for
  Phase 5; the current build ships none of the risky surface yet.

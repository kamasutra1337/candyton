# CandyTON 🍬 — Match-3 Puzzle (Telegram Mini App)

A polished, Candy-Crush-style Match-3 game built as a Telegram Mini App. Built
**bottom-up**: a genuinely fun, complete game first. A Web3/TON economy is
designed and scaffolded but **intentionally parked** — the game stands entirely
on its own without a wallet or a blockchain.

---

## What works today (playable & verified)

**`@candyton/engine` — pure, seeded, deterministic Match-3 core** (no UI, no
network, no chain). 18 unit tests cover every rule.
- Specials: **Striped** (4-in-a-row → clears a line), **Wrapped** (L/T → 3×3
  blast), **Colour Bomb** (5-in-a-row → clears a colour), with chain reactions.
- Cascades with combo multipliers, gravity/refill, hint & auto-solve detection.
- Objectives: score, colour-collection, special-detonation. **12 tuned levels**
  with 1/2/3-star score thresholds.
- Boosters: reshuffle (never get stuck) and grant-extra-moves.
- Deterministic by seed, so a server can replay a run to validate the score.

**`@candyton/game` — the Telegram Mini App client** (React + Canvas 2D).
- Hand-written Canvas renderer replays engine "steps" as 60 fps tweens
  (swap, pop, cascade, gravity, refill) with a pulsing hint highlight.
- **Procedural sound** synthesised with Web Audio — zero audio asset files
  (swap, combo ladder, special, coin, win/lose), with a mute toggle.
- Level map with unlocks, best scores and **star ratings**; coin economy with a
  **booster bar** (Hint / Shuffle / +5 Moves) as the coin sink.
- First-run **onboarding** explaining swipes, specials and objectives.
- Telegram SDK integration (haptics, theming, safe areas); runs identically in
  a plain browser and, later, in a Capacitor shell for the app stores.
- Colour-blind-safe candy symbols, mobile-first dark "candy" theme.

## Roadmap

| Phase | Scope | Status |
|------:|-------|--------|
| 1 | Match-3 engine (pure TS, tested) | ✅ done |
| 2 | Client / Telegram Mini App (render, sound, boosters, progression) | ✅ done |
| 3 | Backend: profiles, **server-authoritative anti-cheat** (re-simulation), leaderboards | 🚧 see [`apps/server`](apps/server/README.md) |
| — | **Web3 / TON** (Jetton, NFT, staking) — designed, **parked by decision** | ⏸ see [`packages/contracts`](packages/contracts/README.md) |
| 5 | Store packaging: Capacitor → APK/IPA | ⏳ planned |

The client already **records its move list** and best-effort submits it to the
backend (when `VITE_API_URL` is set) so the server can re-simulate and post an
authoritative leaderboard score. With no backend configured the game is fully
playable offline and local progress is the source of truth.

---

## Getting started

```bash
npm install          # installs engine + client workspaces
npm test             # engine test suite (18 tests)
npm run dev          # Mini App on http://localhost:5173
npm run build        # typecheck + production build
```

Open the dev URL on a phone (or Telegram's Mini App test env). Swipe a candy
toward a neighbour to swap.

The backend (`apps/server`) is a **standalone** package — see its README to run
it and point the client at it with `VITE_API_URL`.

## Architecture

```
candyton/
├── packages/
│   ├── engine/       @candyton/engine — pure Match-3 rules (no UI/net/chain)
│   │   ├── src/      types · rng · board · matching · engine · solver · levels
│   │   └── test/     vitest suite (18 tests)
│   └── contracts/    TON contracts — designed, parked (packages/contracts/README.md)
└── apps/
    ├── game/         @candyton/game — React + Canvas Mini App
    │   └── src/      render/ · game/ · state/ · ui/ · audio/ · net/ · web3/
    └── server/       anti-cheat backend (standalone)
```

**Design principle — clean seams.** The engine knows nothing about React; the
renderer knows nothing about the rules (it just mirrors engine deltas); sound,
network and Telegram are peripherals, not dependencies of gameplay. Any layer
can be tested or swapped in isolation — and the same engine runs on the server
for authoritative validation.

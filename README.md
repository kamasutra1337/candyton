# CandyBlast 🍬 — Video Wish-Duel Roulette (Telegram Mini App)

A face-to-face **video chat roulette** where two strangers are matched live, see
each other's camera, each make a wish (a dare), and then **duel in a fast Match-3
board**. The winner's wish is the loser's dare. Then you hit **Next** and get a
new opponent — endless rounds.

Built as a Telegram Mini App on a polished, well-tested Match-3 core. Runs
identically in a plain browser.

---

## How a round works

1. **Allow camera + mic** and tap Start — you enter the queue.
2. You're **matched** live with another player over WebRTC; both cameras go on.
3. Each of you types a **wish** (what the loser has to do).
4. You **duel** on the same seeded Match-3 board — same candies, same moves left.
5. Highest score wins. The **winner's wish becomes the loser's dare**.
6. Tap **Next** for a fresh opponent, or exit.

---

## What's inside

**`@candyblast/engine` — pure, seeded, deterministic Match-3 core** (no UI, no
network). Unit-tested rules power both solo levels and the duel board.
- Specials: **Striped** (4-in-a-row → clears a line), **Wrapped** (L/T → 3×3
  blast), **Colour Bomb** (5-in-a-row → clears a colour), with chain reactions.
- Cascades with combo multipliers, gravity/refill, hint & auto-solve detection.
- Deterministic by seed — both duel players get an identical board, and the
  server can replay a run to validate the score.

**`@candyblast/game` — the Telegram Mini App client** (React + Canvas 2D).
- **Video wish-duel roulette**: WebRTC peer-to-peer camera/mic, live matchmaking,
  wish/dare exchange, and a shared seeded duel board with live score sync.
- Solo mode: level map with unlocks, best scores and **star ratings**; coin
  economy with a **booster bar** (Hint / Shuffle / +5 Moves).
- Hand-written Canvas renderer replays engine "steps" as 60 fps tweens.
- **Procedural sound** synthesised with Web Audio — zero audio asset files.
- First-run **onboarding** and a **language picker** (i18n, Russian priority).
- Telegram SDK integration (haptics, theming, safe areas); mobile-first dark
  "candy" theme, colour-blind-safe candy symbols.

**`@candyblast/server` — matchmaking + anti-cheat backend** (standalone).
- **WebRTC signaling** for the roulette: pairs waiting players and relays offers.
- **Server-authoritative anti-cheat**: re-simulates the player's move list with
  the shared engine and never trusts a client-reported score.
- Profiles and leaderboards. Storage is in-memory and pluggable.

---

## Getting started

```bash
npm install          # installs engine + client workspaces
npm test             # engine test suite
npm run dev          # Mini App on http://localhost:5173
npm run build        # typecheck + production build
```

Open the dev URL on a phone (or Telegram's Mini App test env). For the duel
roulette you need two clients and the signaling server running (see
[`apps/server`](apps/server/README.md)); point the client at it with
`VITE_API_URL`. Solo Match-3 is fully playable offline.

## Architecture

```
candyblast/
├── packages/
│   └── engine/       @candyblast/engine — pure Match-3 rules (no UI/net)
│       ├── src/      types · rng · board · matching · engine · solver · levels
│       └── test/     vitest suite
└── apps/
    ├── game/         @candyblast/game — React + Canvas Mini App
    │   └── src/      render/ · game/ · duel/ · state/ · ui/ · audio/ · net/
    └── server/       matchmaking signaling + anti-cheat backend (standalone)
```

**Design principle — clean seams.** The engine knows nothing about React; the
renderer knows nothing about the rules (it just mirrors engine deltas); sound,
network, WebRTC and Telegram are peripherals, not dependencies of gameplay. Any
layer can be tested or swapped in isolation — and the same engine runs on the
server for authoritative validation.

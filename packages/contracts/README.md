# @candyton/contracts — TON Smart Contracts (parked)

> **Status: designed, PARKED by decision.** The project is currently focused on
> the game itself; the Web3/TON layer is intentionally deferred. The client no
> longer bundles any wallet/TON code (it was tree-shaken out). This document is
> the preserved design so the work can resume cleanly later.
>
> No contracts are deployed. This document is the
> spec for Phase 4 so the work can start from a clear brief. Nothing here is
> wired into the running game yet — the client's `$CANDY` balance is an
> off-chain ledger (`apps/game/src/state/store.ts`) precisely so there is zero
> on-chain risk while gameplay is still being tuned.

## Contracts to build

1. **`$CANDY` Jetton** (fungible game currency) — TEP-74 standard.
   - Minter + wallet contracts (use the audited reference Jetton implementation
     as a base; do not hand-roll).
   - Player earnings accrue off-chain (server-signed) and are **claimed** to the
     wallet in batches to keep gas low. Spend flows (boosters, extra moves,
     unlocks) burn or transfer to the treasury.

2. **NFT boosters / skins** — TEP-62 collection + items.
   - Types: booster items, candy skins, avatars, tournament passes.
   - Ownership can grant gameplay perks (read by the server, not trusted from
     the client). Trade via Getgems or an in-app marketplace.

3. **Staking** — stake `$CANDY` for yield / exclusive rewards. Start with a
   simple, audited fixed-term staking pool; no rebasing, no leverage.

4. **Reward escrow / claim** — server co-signs a claim voucher (amount + nonce +
   player), the contract verifies the signature and releases Jettons. This is
   the trust bridge between off-chain progress and on-chain tokens.

## Tooling

- **Language:** Tact (preferred for new work) or FunC.
- **Framework:** [Blueprint](https://github.com/ton-org/blueprint) for build,
  test and deploy; `@ton/sandbox` for contract unit tests.
- **Client integration:** `@ton/ton`, `@tonconnect/ui-react` (already wired in
  the client for wallet connection).

## Security requirements (non-negotiable)

- Third-party audit before mainnet. Reuse audited reference implementations for
  the Jetton and NFT standards rather than bespoke code.
- Guard against replay (nonces on claim vouchers), integer overflow, and
  unauthorised minting (only the minter owner / server key can authorise).
- Rewards are **server-authoritative**: the deterministic engine
  (`@candyton/engine`) is re-simulated server-side (Phase 3) to validate a score
  before any voucher is signed.

## Suggested build order

1. Jetton minter + wallet on testnet, claim voucher + escrow, sandbox tests.
2. Client claim flow (earn off-chain → claim on-chain).
3. NFT collection + perk lookup.
4. Staking pool.
5. Audit → mainnet.

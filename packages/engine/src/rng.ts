/**
 * A tiny, fast, fully deterministic PRNG (mulberry32). Determinism matters:
 * the same seed must produce the same board on client and server so the server
 * can re-simulate a run to validate the score and reject cheaters.
 */
export interface Rng {
  next(): number; // float in [0, 1)
  int(maxExclusive: number): number; // integer in [0, maxExclusive)
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
  };
}

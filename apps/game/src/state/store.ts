import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState } from '@candyton/engine';
import { LEVELS } from '@candyton/engine';

export type Screen = 'map' | 'game';

interface AppState {
  screen: Screen;
  currentLevel: number | null;
  /** Highest level id the player has unlocked (1-based). */
  unlocked: number;
  /** Off-chain GAME_TOKEN ledger. Phase 4 mirrors this to a TON Jetton. */
  coins: number;
  bestScores: Record<number, number>;
  /** Live in-game snapshot mirrored from the engine for the HUD. */
  live: GameState | null;

  openMap: () => void;
  startLevel: (id: number) => void;
  setLive: (s: GameState) => void;
  finishLevel: (id: number, score: number, won: boolean) => number;
}

/** Reward curve: coins earned scale with score plus a first-clear bonus. */
export function coinsFor(score: number, firstClear: boolean): number {
  return Math.floor(score / 100) + (firstClear ? 50 : 0);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      screen: 'map',
      currentLevel: null,
      unlocked: 1,
      coins: 0,
      bestScores: {},
      live: null,

      openMap: () => set({ screen: 'map', currentLevel: null, live: null }),
      startLevel: (id) => set({ screen: 'game', currentLevel: id, live: null }),
      setLive: (live) => set({ live }),

      finishLevel: (id, score, won) => {
        const state = get();
        const prevBest = state.bestScores[id] ?? 0;
        const firstClear = won && !(id in state.bestScores);
        const earned = won ? coinsFor(score, firstClear) : 0;
        const nextUnlocked =
          won && id + 1 <= LEVELS.length ? Math.max(state.unlocked, id + 1) : state.unlocked;
        set({
          coins: state.coins + earned,
          unlocked: nextUnlocked,
          bestScores: { ...state.bestScores, [id]: Math.max(prevBest, score) },
        });
        return earned;
      },
    }),
    { name: 'candyton-progress' },
  ),
);

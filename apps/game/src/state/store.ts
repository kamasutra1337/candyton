import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState } from '@candyton/engine';
import { LEVELS, getLevel, starsForScore } from '@candyton/engine';
import { telegramUser } from '../web3/telegram';

export type Screen = 'map' | 'game' | 'leaderboard';

export interface FinishResult {
  earned: number;
  stars: number;
}

interface AppState {
  screen: Screen;
  currentLevel: number | null;
  /** Highest level id the player has unlocked (1-based). */
  unlocked: number;
  /** In-game coin balance, spent on boosters. */
  coins: number;
  bestScores: Record<number, number>;
  /** Best star rating (0–3) earned per level. */
  stars: Record<number, number>;
  sound: boolean;
  seenTutorial: boolean;
  /** UI language. Russian is the priority default. */
  lang: 'ru' | 'en';
  /** Whether the player has picked a language yet (drives the first-run picker). */
  langChosen: boolean;
  /** Display name used for leaderboard submissions (Telegram name or a guest). */
  playerName: string;
  /** Live in-game snapshot mirrored from the engine for the HUD. */
  live: GameState | null;

  openMap: () => void;
  openLeaderboard: () => void;
  startLevel: (id: number) => void;
  setLive: (s: GameState) => void;
  finishLevel: (id: number, score: number, won: boolean) => FinishResult;
  spendCoins: (n: number) => boolean;
  toggleSound: () => void;
  markTutorialSeen: () => void;
  chooseLang: (l: 'ru' | 'en') => void;
  openLangPicker: () => void;
  /** Resolves a stable display name once (Telegram user, else a guest tag). */
  resolveName: () => string;
}

/** Reward curve: coins earned scale with score plus a first-clear bonus. */
export function coinsFor(score: number, firstClear: boolean): number {
  return Math.floor(score / 100) + (firstClear ? 50 : 0);
}

export const totalStars = (stars: Record<number, number>): number =>
  Object.values(stars).reduce((a, b) => a + b, 0);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      screen: 'map',
      currentLevel: null,
      unlocked: 1,
      coins: 0,
      bestScores: {},
      stars: {},
      sound: true,
      seenTutorial: false,
      lang: 'ru',
      langChosen: false,
      playerName: '',
      live: null,

      openMap: () => set({ screen: 'map', currentLevel: null, live: null }),
      openLeaderboard: () => set({ screen: 'leaderboard', live: null }),
      startLevel: (id) => set({ screen: 'game', currentLevel: id, live: null }),
      setLive: (live) => set({ live }),

      resolveName: () => {
        const existing = get().playerName;
        if (existing) return existing;
        const tg = telegramUser();
        const name = tg?.name ?? `Guest ${1000 + Math.floor(Math.random() * 9000)}`;
        set({ playerName: name });
        return name;
      },

      finishLevel: (id, score, won) => {
        const state = get();
        const level = getLevel(id);
        const stars = won && level ? starsForScore(level, score) : 0;
        const prevBest = state.bestScores[id] ?? 0;
        const prevStars = state.stars[id] ?? 0;
        const firstClear = won && !(id in state.bestScores);
        const earned = won ? coinsFor(score, firstClear) : 0;
        const nextUnlocked =
          won && id + 1 <= LEVELS.length ? Math.max(state.unlocked, id + 1) : state.unlocked;
        set({
          coins: state.coins + earned,
          unlocked: nextUnlocked,
          bestScores: { ...state.bestScores, [id]: Math.max(prevBest, score) },
          stars: { ...state.stars, [id]: Math.max(prevStars, stars) },
        });
        return { earned, stars };
      },

      spendCoins: (n) => {
        const state = get();
        if (state.coins < n) return false;
        set({ coins: state.coins - n });
        return true;
      },

      toggleSound: () => set({ sound: !get().sound }),
      markTutorialSeen: () => set({ seenTutorial: true }),
      chooseLang: (lang) => set({ lang, langChosen: true }),
      openLangPicker: () => set({ langChosen: false }),
    }),
    { name: 'candyton-progress' },
  ),
);

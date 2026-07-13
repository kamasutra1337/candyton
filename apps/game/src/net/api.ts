/**
 * Optional backend client. The game is fully playable offline — local
 * progress is the source of truth for the UI. When a backend URL is configured
 * (VITE_API_URL), we best-effort submit the move list so the server can
 * re-simulate and post an authoritative leaderboard score. Every call fails
 * silently; nothing here can break gameplay.
 */
import type { Pos } from '@candyblast/engine';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
let token: string | null = null;

/**
 * Enabled when there is a backend to talk to. An explicit VITE_API_URL always
 * wins. Otherwise we assume a same-origin API (e.g. the single Railway service
 * that serves both this app and the API) — except on GitHub Pages, which is a
 * static-only mirror with no backend.
 */
export const apiEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (BASE) return true;
  return !window.location.hostname.endsWith('github.io');
};

async function call<T>(path: string, body?: unknown, auth = false): Promise<T | null> {
  if (!apiEnabled()) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function ensureSession(name: string): Promise<boolean> {
  if (token) return true;
  const res = await call<{ token: string }>('/auth/dev', { name });
  if (res?.token) token = res.token;
  return token != null;
}

export interface SubmitResult {
  accepted: boolean;
  score: number;
  won: boolean;
  stars: number;
  cheatFlag: boolean;
}

export async function submitRun(
  levelId: number,
  moves: { a: Pos; b: Pos }[],
  claimedScore: number,
  playerName: string,
): Promise<SubmitResult | null> {
  if (!apiEnabled()) return null;
  await ensureSession(playerName);
  return call<SubmitResult>(`/levels/${levelId}/submit`, { moves, claimedScore }, true);
}

export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
  stars?: number;
}

/** Fetches a leaderboard: a specific level, or the global ranking when omitted. */
export async function fetchLeaderboard(
  levelId?: number,
  limit = 50,
): Promise<LeaderRow[] | null> {
  const path =
    levelId != null ? `/leaderboard/${levelId}?limit=${limit}` : `/leaderboard?limit=${limit}`;
  const res = await call<{ entries: LeaderRow[] }>(path);
  return res?.entries ?? null;
}

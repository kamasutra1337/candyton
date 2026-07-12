/**
 * Optional backend client. The game is fully playable offline — local
 * progress is the source of truth for the UI. When a backend URL is configured
 * (VITE_API_URL), we best-effort submit the move list so the server can
 * re-simulate and post an authoritative leaderboard score. Every call fails
 * silently; nothing here can break gameplay.
 */
import type { Pos } from '@candyton/engine';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
let token: string | null = null;

export const apiEnabled = (): boolean => BASE.length > 0;

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

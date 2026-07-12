/**
 * In-memory persistence for the CandyBlast backend.
 *
 * Everything lives behind the {@link Store} interface so a real database
 * (Postgres, Redis, …) can be slotted in later without touching route code.
 * The default {@link InMemoryStore} keeps all state in plain JS maps, which is
 * perfect for local dev, tests and a single-process demo.
 */

export interface Player {
  id: string;
  name: string;
  coins: number;
  /** Level ids the player is allowed to play. Starts at [1]. */
  unlocked: number[];
  /** levelId -> best authoritative score ever recorded. */
  bestScores: Record<number, number>;
  /** levelId -> best star rating ever recorded. */
  bestStars: Record<number, number>;
  /** Level ids the player has cleared at least once (for first-clear bonus). */
  cleared: number[];
}

/** A single per-level leaderboard row before ranking. */
export interface ScoreRecord {
  playerId: string;
  name: string;
  score: number;
  stars: number;
}

export interface RankedEntry {
  rank: number;
  name: string;
  score: number;
  stars: number;
}

export interface Store {
  createOrGetPlayer(name: string): Player;
  getPlayer(id: string): Player | undefined;
  savePlayer(player: Player): void;
  /** Upsert a player's best result for a level into the leaderboard. */
  recordScore(levelId: number, rec: ScoreRecord): void;
  /** Per-level ranking, highest score first. */
  levelLeaderboard(levelId: number, limit: number): RankedEntry[];
  /** Global ranking by total of best scores across all levels. */
  globalLeaderboard(limit: number): RankedEntry[];
}

export class InMemoryStore implements Store {
  private readonly players = new Map<string, Player>();
  private readonly byName = new Map<string, string>();
  /** levelId -> (playerId -> best ScoreRecord). */
  private readonly boards = new Map<number, Map<string, ScoreRecord>>();
  private seq = 0;

  createOrGetPlayer(name: string): Player {
    const existingId = this.byName.get(name);
    if (existingId) {
      const existing = this.players.get(existingId);
      if (existing) return existing;
    }
    const id = `p_${++this.seq}`;
    const player: Player = {
      id,
      name,
      coins: 0,
      unlocked: [1],
      bestScores: {},
      bestStars: {},
      cleared: [],
    };
    this.players.set(id, player);
    this.byName.set(name, id);
    return player;
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  savePlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  recordScore(levelId: number, rec: ScoreRecord): void {
    let board = this.boards.get(levelId);
    if (!board) {
      board = new Map<string, ScoreRecord>();
      this.boards.set(levelId, board);
    }
    const prev = board.get(rec.playerId);
    if (!prev || rec.score > prev.score) board.set(rec.playerId, rec);
  }

  levelLeaderboard(levelId: number, limit: number): RankedEntry[] {
    const board = this.boards.get(levelId);
    if (!board) return [];
    return [...board.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, stars: r.stars }));
  }

  globalLeaderboard(limit: number): RankedEntry[] {
    const rows = [...this.players.values()].map((p) => {
      const score = Object.values(p.bestScores).reduce((a, b) => a + b, 0);
      const stars = Object.values(p.bestStars).reduce((a, b) => a + b, 0);
      return { name: p.name, score, stars };
    });
    return rows
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, stars: r.stars }));
  }
}

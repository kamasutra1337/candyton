import type {
  Board,
  Color,
  LevelConfig,
  MoveResult,
  Objective,
  Pos,
  SpecialType,
  Step,
  Tile,
} from './types.js';
import { RAINBOW } from './types.js';
import { makeRng, type Rng } from './rng.js';
import { areAdjacent, createBoard, posKey, tileAt } from './board.js';
import { findMatches, type MatchGroup } from './matching.js';
import { hasValidMove } from './solver.js';

const BASE_SCORE = 20;
const SPECIAL_BONUS = 60;

export type GameStatus = 'playing' | 'won' | 'lost';

export interface ObjectiveProgress {
  objective: Objective;
  current: number;
  target: number;
  done: boolean;
}

export interface GameState {
  score: number;
  movesLeft: number;
  status: GameStatus;
  objectives: ObjectiveProgress[];
}

/**
 * Authoritative Match-3 game. All mutation flows through `swap`, which returns
 * an ordered list of animatable Steps. Because the engine is seeded and pure,
 * a server can replay the same swaps to verify a client-reported score.
 */
export class Match3Engine {
  readonly level: LevelConfig;
  private board: Board;
  private readonly rng: Rng;
  private id = 1;
  private score = 0;
  private movesLeft: number;
  private status: GameStatus = 'playing';
  private readonly collected = new Map<Color, number>();
  private specialsCleared = 0;

  constructor(level: LevelConfig) {
    this.level = level;
    this.rng = makeRng(level.seed);
    this.movesLeft = level.moves;
    this.board = createBoard(level.rows, level.cols, level.colors, this.rng, () => this.id++);
  }

  getBoard(): Board {
    return this.board;
  }

  /** Booster: grant extra moves (typically bought with coins). */
  grantMoves(n: number): void {
    if (this.status !== 'playing') return;
    this.movesLeft += n;
  }

  /**
   * Booster: reshuffle the existing tiles into a fresh arrangement that has no
   * standing matches and at least one legal move, so the player is never stuck.
   */
  shuffle(): void {
    const tiles: Tile[] = [];
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) {
        const t = this.board.cells[r]![c];
        if (t) tiles.push(t);
      }
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = this.rng.int(i + 1);
        const tmp = tiles[i]!;
        tiles[i] = tiles[j]!;
        tiles[j] = tmp;
      }
      let idx = 0;
      for (let r = 0; r < this.board.rows; r++)
        for (let c = 0; c < this.board.cols; c++) this.board.cells[r]![c] = tiles[idx++]!;
      if (findMatches(this.board).length === 0 && hasValidMove(this.board)) return;
    }
  }

  getState(): GameState {
    return {
      score: this.score,
      movesLeft: this.movesLeft,
      status: this.status,
      objectives: this.level.objectives.map((o) => this.progressFor(o)),
    };
  }

  private progressFor(o: Objective): ObjectiveProgress {
    let current = 0;
    switch (o.kind) {
      case 'score':
        current = this.score;
        break;
      case 'collect':
        current = this.collected.get(o.color) ?? 0;
        break;
      case 'clearSpecials':
        current = this.specialsCleared;
        break;
    }
    const target = o.kind === 'score' ? o.target : o.kind === 'collect' ? o.count : o.count;
    return { objective: o, current, target, done: current >= target };
  }

  private objectivesComplete(): boolean {
    return this.level.objectives.every((o) => this.progressFor(o).done);
  }

  /** Attempts a swap of two adjacent cells and resolves all resulting cascades. */
  swap(a: Pos, b: Pos): MoveResult {
    if (this.status !== 'playing') return { valid: false, steps: [] };
    if (!areAdjacent(a, b)) return { valid: false, steps: [] };
    const ta = tileAt(this.board, a.r, a.c);
    const tb = tileAt(this.board, b.r, b.c);
    if (!ta || !tb) return { valid: false, steps: [] };

    this.swapCells(a, b);

    const directBlast = this.swapActivation(a, b, ta, tb);
    const initialMatches = this.firstMatches(a, b);

    if (initialMatches.length === 0 && !directBlast) {
      this.swapCells(a, b); // revert
      // Emit ONLY the bounce-back; a committing 'swap' step here would desync
      // the renderer's grid from the (reverted) engine board.
      return { valid: false, steps: [{ kind: 'invalidSwap', a, b }] };
    }

    const steps: Step[] = [{ kind: 'swap', a, b }];
    this.movesLeft--;
    this.resolve(steps, initialMatches, directBlast);
    this.updateStatus();
    return { valid: true, steps };
  }

  // --- resolution ---------------------------------------------------------

  private resolve(
    steps: Step[],
    firstMatches: MatchGroup[],
    directBlast: { cells: Pos[]; detonated: { pos: Pos; special: SpecialType }[] } | null,
  ): void {
    let cascade = 0;
    let groups = firstMatches;
    let blast = directBlast;

    while (groups.length > 0 || blast) {
      const created: { pos: Pos; special: SpecialType; color: Color }[] = [];
      const createdKeys = new Set<string>();
      for (const g of groups) {
        if (g.special) {
          // Report the colour actually placed — a Colour Bomb is RAINBOW, not
          // its source colour — so the renderer mirrors the board exactly.
          const color = g.special === 'colorBomb' ? RAINBOW : g.color;
          created.push({ pos: g.pivot, special: g.special, color });
          createdKeys.add(posKey(g.pivot));
        }
      }

      // Seed removals from matches (minus cells that morph into specials) and
      // from any direct swap blast.
      const removal = new Map<string, Pos>();
      const detonated: { pos: Pos; special: SpecialType }[] = [];
      const detonatedKeys = new Set<string>();
      const queue: { pos: Pos; special: SpecialType }[] = [];

      const enqueueIfSpecial = (p: Pos): void => {
        const t = tileAt(this.board, p.r, p.c);
        if (t?.special && !detonatedKeys.has(posKey(p)) && !createdKeys.has(posKey(p))) {
          detonatedKeys.add(posKey(p));
          queue.push({ pos: p, special: t.special });
        }
      };

      const addRemoval = (p: Pos): void => {
        if (createdKeys.has(posKey(p))) return;
        if (!tileAt(this.board, p.r, p.c)) return;
        if (!removal.has(posKey(p))) removal.set(posKey(p), p);
        enqueueIfSpecial(p);
      };

      for (const g of groups) for (const cell of g.cells) addRemoval(cell);
      if (blast) {
        for (const cell of blast.cells) addRemoval(cell);
        for (const d of blast.detonated) {
          if (!detonatedKeys.has(posKey(d.pos))) {
            detonatedKeys.add(posKey(d.pos));
            detonated.push(d);
          }
        }
      }

      // Chain-react specials until the blast wave settles.
      while (queue.length) {
        const det = queue.shift()!;
        detonated.push(det);
        for (const cell of this.blastCells(det.pos, det.special)) addRemoval(cell);
      }

      const cleared = [...removal.values()];
      const scoreGained = Math.round(
        (cleared.length * BASE_SCORE + detonated.length * SPECIAL_BONUS) * (1 + cascade * 0.25),
      );

      // Track objective progress, then mutate the board.
      for (const p of cleared) {
        const t = tileAt(this.board, p.r, p.c)!;
        if (t.color >= 0) this.collected.set(t.color, (this.collected.get(t.color) ?? 0) + 1);
      }
      this.specialsCleared += detonated.length;
      this.score += scoreGained;

      for (const p of cleared) this.board.cells[p.r]![p.c] = null;
      for (const cs of created) {
        this.board.cells[cs.pos.r]![cs.pos.c] = {
          id: this.id++,
          color: cs.special === 'colorBomb' ? RAINBOW : cs.color,
          special: cs.special,
        };
      }

      steps.push({ kind: 'clear', cells: cleared, created, detonated, scoreGained });

      // Gravity + refill.
      const gravity = this.applyGravity();
      steps.push(gravity);

      cascade++;
      blast = null;
      groups = findMatches(this.board);
    }
  }

  private blastCells(pos: Pos, special: SpecialType): Pos[] {
    const out: Pos[] = [];
    const b = this.board;
    switch (special) {
      case 'stripedH':
        for (let c = 0; c < b.cols; c++) out.push({ r: pos.r, c });
        break;
      case 'stripedV':
        for (let r = 0; r < b.rows; r++) out.push({ r, c: pos.c });
        break;
      case 'wrapped':
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const r = pos.r + dr;
            const c = pos.c + dc;
            if (r >= 0 && r < b.rows && c >= 0 && c < b.cols) out.push({ r, c });
          }
        break;
      case 'colorBomb': {
        // On chain detonation with no explicit target, clear the most common colour.
        const target = this.mostCommonColor();
        for (let r = 0; r < b.rows; r++)
          for (let c = 0; c < b.cols; c++) {
            const t = tileAt(b, r, c);
            if (t && t.color === target) out.push({ r, c });
          }
        break;
      }
    }
    return out;
  }

  private mostCommonColor(): Color {
    const counts = new Map<Color, number>();
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) {
        const t = tileAt(this.board, r, c);
        if (t && t.color >= 0) counts.set(t.color, (counts.get(t.color) ?? 0) + 1);
      }
    let best: Color = 0;
    let bestN = -1;
    for (const [color, n] of counts) if (n > bestN) ((bestN = n), (best = color));
    return best;
  }

  private applyGravity(): Step {
    const falls: { from: Pos; to: Pos }[] = [];
    const spawns: { to: Pos; tile: Tile }[] = [];
    const b = this.board;
    for (let c = 0; c < b.cols; c++) {
      let write = b.rows - 1;
      for (let r = b.rows - 1; r >= 0; r--) {
        const t = b.cells[r]![c];
        if (!t) continue;
        if (write !== r) {
          falls.push({ from: { r, c }, to: { r: write, c } });
          b.cells[write]![c] = t;
          b.cells[r]![c] = null;
        }
        write--;
      }
      for (let r = write; r >= 0; r--) {
        const tile: Tile = { id: this.id++, color: this.rng.int(b.colors), special: null };
        b.cells[r]![c] = tile;
        spawns.push({ to: { r, c }, tile });
      }
    }
    return { kind: 'gravity', falls, spawns };
  }

  // --- swap helpers -------------------------------------------------------

  private swapCells(a: Pos, b: Pos): void {
    const ta = this.board.cells[a.r]![a.c];
    this.board.cells[a.r]![a.c] = this.board.cells[b.r]![b.c] ?? null;
    this.board.cells[b.r]![b.c] = ta ?? null;
  }

  /** Colour Bombs never match by colour; they only fire when swapped. */
  private swapActivation(
    a: Pos,
    b: Pos,
    ta: Tile,
    tb: Tile,
  ): { cells: Pos[]; detonated: { pos: Pos; special: SpecialType }[] } | null {
    const aBomb = ta.special === 'colorBomb';
    const bBomb = tb.special === 'colorBomb';
    if (!aBomb && !bBomb) return null;

    const cells = new Map<string, Pos>();
    const add = (p: Pos): void => {
      if (tileAt(this.board, p.r, p.c)) cells.set(posKey(p), p);
    };

    if (aBomb && bBomb) {
      // Double bomb clears the whole board.
      for (let r = 0; r < this.board.rows; r++)
        for (let c = 0; c < this.board.cols; c++) add({ r, c });
    } else {
      // Bomb detonated at its post-swap position; clear all of the partner colour.
      const partnerColor = aBomb ? tb.color : ta.color;
      const target = partnerColor >= 0 ? partnerColor : this.mostCommonColor();
      for (let r = 0; r < this.board.rows; r++)
        for (let c = 0; c < this.board.cols; c++) {
          const t = tileAt(this.board, r, c);
          if (t && (t.color === target || t.special === 'colorBomb')) add({ r, c });
        }
    }
    const detonated: { pos: Pos; special: SpecialType }[] = [];
    if (aBomb) detonated.push({ pos: a, special: 'colorBomb' });
    if (bBomb) detonated.push({ pos: b, special: 'colorBomb' });
    return { cells: [...cells.values()], detonated };
  }

  /** Matches after a swap, preferring the swapped cells as special pivots. */
  private firstMatches(a: Pos, b: Pos): MatchGroup[] {
    const groups = findMatches(this.board);
    for (const g of groups) {
      if (g.special) {
        if (g.cells.some((p) => p.r === a.r && p.c === a.c)) g.pivot = a;
        else if (g.cells.some((p) => p.r === b.r && p.c === b.c)) g.pivot = b;
      }
    }
    return groups;
  }

  private updateStatus(): void {
    if (this.objectivesComplete()) this.status = 'won';
    else if (this.movesLeft <= 0) this.status = 'lost';
  }
}

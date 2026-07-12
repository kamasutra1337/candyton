/**
 * Core domain types for the CandyTON Match-3 engine.
 *
 * The engine is pure: it knows nothing about rendering, networking or the
 * blockchain. Everything it produces is plain serialisable data so the same
 * logic can run on the client for responsiveness and on the server for
 * authoritative anti-cheat validation.
 */

/** A candy colour, expressed as an index `0..colors-1`. */
export type Color = number;

/** Sentinel colour for a Colour Bomb — it belongs to no single colour. */
export const RAINBOW: Color = -1;

/** The special candies a player can create and detonate. */
export type SpecialType =
  | 'stripedH' // clears its entire row
  | 'stripedV' // clears its entire column
  | 'wrapped' // clears the 3x3 block around it
  | 'colorBomb'; // clears every candy of one colour

export interface Tile {
  /** Stable identity used by the renderer to animate a tile across frames. */
  id: number;
  color: Color;
  special: SpecialType | null;
}

export interface Pos {
  r: number;
  c: number;
}

export interface Board {
  rows: number;
  cols: number;
  colors: number;
  /** Row-major grid. `null` marks a transiently empty cell during resolution. */
  cells: (Tile | null)[][];
}

/** What a level asks the player to accomplish. */
export type Objective =
  | { kind: 'score'; target: number }
  | { kind: 'collect'; color: Color; count: number }
  | { kind: 'clearSpecials'; count: number };

export interface LevelConfig {
  id: number;
  name: string;
  rows: number;
  cols: number;
  colors: number;
  moves: number;
  objectives: Objective[];
  /** Deterministic seed so a level is reproducible for tests and replays. */
  seed: number;
}

/**
 * A resolution Step is one animatable beat of a move's cascade. The renderer
 * plays steps in order; the engine's board state after each step is implied by
 * applying that step. Steps are intentionally coarse so a renderer can batch a
 * whole wave of clears / falls into a single tween.
 */
export type Step =
  | { kind: 'swap'; a: Pos; b: Pos }
  | { kind: 'invalidSwap'; a: Pos; b: Pos }
  | {
      kind: 'clear';
      /** Cells removed this beat, including special chain-reaction blasts. */
      cells: Pos[];
      /** Specials born this beat; these positions are NOT in `cells`. */
      created: { pos: Pos; special: SpecialType; color: Color }[];
      /** Specials that detonated this beat (for sound / VFX cues). */
      detonated: { pos: Pos; special: SpecialType }[];
      scoreGained: number;
    }
  | {
      kind: 'gravity';
      /** Existing tiles sliding down. */
      falls: { from: Pos; to: Pos }[];
      /** Fresh tiles entering from the top. */
      spawns: { to: Pos; tile: Tile }[];
    };

export interface MoveResult {
  valid: boolean;
  steps: Step[];
}

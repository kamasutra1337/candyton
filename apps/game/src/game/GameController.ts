import {
  Match3Engine,
  findHint,
  hasValidMove,
  type GameState,
  type LevelConfig,
  type Pos,
  type Step,
} from '@candyton/engine';
import { CanvasBoard } from '../render/CanvasBoard';
import { haptic } from '../platform/telegram';
import { sfx } from '../audio/sfx';

/** A recorded swap, replayed by the server to validate the score. */
export interface RecordedMove {
  a: Pos;
  b: Pos;
}

/**
 * Glue between the pure engine and the canvas renderer. It owns one level's
 * play session: it forwards player swaps to the engine, plays the resulting
 * animation with synced sound, and reports state changes back to React. It also
 * records the move list so a backend can re-simulate and validate the run.
 */
export class GameController {
  private readonly engine: Match3Engine;
  private readonly board: CanvasBoard;
  private readonly moves: RecordedMove[] = [];
  private finished = false;

  constructor(
    level: LevelConfig,
    canvas: HTMLCanvasElement,
    private readonly onState: (s: GameState) => void,
    private readonly onFinish: (s: GameState, moves: RecordedMove[]) => void,
  ) {
    this.engine = new Match3Engine(level);
    this.board = new CanvasBoard(canvas);
    this.board.setBoard(this.engine.getBoard(), true); // level-start cascade
    this.board.onSwap = (a, b) => void this.handleSwap(a, b);
    this.onState(this.engine.getState());
  }

  private async handleSwap(a: Pos, b: Pos): Promise<void> {
    if (this.board.isBusy || this.finished) return;
    sfx.unlock();
    const res = this.engine.swap(a, b);
    if (res.steps.length === 0) return;
    if (res.valid) this.moves.push({ a, b });
    haptic(res.valid ? 'light' : 'error');

    this.clearDepth = 0;
    await this.board.playSteps(res.steps, (step) => this.stepSound(step));
    this.afterMove();
  }

  /** Plays the sound cue that matches an animation beat. */
  private stepSound(step: Step): void {
    switch (step.kind) {
      case 'swap':
        sfx.play('swap');
        break;
      case 'invalidSwap':
        sfx.play('invalid');
        break;
      case 'clear':
        if (step.created.length || step.detonated.length) sfx.play('special');
        sfx.play('match', this.clearDepth++);
        break;
      case 'gravity':
        break;
    }
  }
  private clearDepth = 0;

  private afterMove(): void {
    this.clearDepth = 0;
    const state = this.engine.getState();
    this.onState(state);
    if (state.status !== 'playing') {
      this.finished = true;
      haptic(state.status === 'won' ? 'success' : 'error');
      sfx.play(state.status === 'won' ? 'win' : 'lose');
      this.onFinish(state, this.moves);
      return;
    }
    // Never leave the player on a dead board.
    if (!hasValidMove(this.engine.getBoard())) {
      this.engine.shuffle();
      this.board.setBoard(this.engine.getBoard());
      sfx.play('special');
      this.onState(this.engine.getState());
    }
  }

  showHint(): void {
    const hint = findHint(this.engine.getBoard());
    if (hint) this.board.flashHint([hint.a, hint.b]);
  }

  /** Booster: reshuffle the board so a legal move always exists. */
  useShuffle(): void {
    if (this.board.isBusy || this.finished) return;
    this.engine.shuffle();
    this.board.setBoard(this.engine.getBoard());
    sfx.play('special');
    this.onState(this.engine.getState());
  }

  /** Booster: add extra moves. */
  useExtraMoves(n: number): void {
    if (this.finished) return;
    this.engine.grantMoves(n);
    sfx.play('coin');
    this.onState(this.engine.getState());
  }

  resize(): void {
    this.board.resize();
  }

  destroy(): void {
    this.board.destroy();
  }
}

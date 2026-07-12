import {
  Match3Engine,
  findHint,
  getLevel,
  hasValidMove,
  type GameState,
  type Pos,
} from '@candyton/engine';
import { CanvasBoard } from '../render/CanvasBoard';
import { haptic } from '../web3/telegram';

/**
 * Glue between the pure engine and the canvas renderer. It owns one level's
 * play session: it forwards player swaps to the engine, plays the resulting
 * animation, and reports state changes back to React.
 */
export class GameController {
  private readonly engine: Match3Engine;
  private readonly board: CanvasBoard;

  constructor(
    levelId: number,
    canvas: HTMLCanvasElement,
    private readonly onState: (s: GameState) => void,
    private readonly onFinish: (s: GameState) => void,
  ) {
    const level = getLevel(levelId);
    if (!level) throw new Error(`Unknown level ${levelId}`);
    this.engine = new Match3Engine(level);
    this.board = new CanvasBoard(canvas);
    this.board.setBoard(this.engine.getBoard());
    this.board.onSwap = (a, b) => void this.handleSwap(a, b);
    this.onState(this.engine.getState());
  }

  private async handleSwap(a: Pos, b: Pos): Promise<void> {
    if (this.board.isBusy) return;
    const res = this.engine.swap(a, b);
    if (res.steps.length === 0) return;
    haptic(res.valid ? 'light' : 'error');
    await this.board.playSteps(res.steps);
    const state = this.engine.getState();
    this.onState(state);

    if (state.status !== 'playing') {
      haptic(state.status === 'won' ? 'success' : 'error');
      this.onFinish(state);
      return;
    }
    // Rescue a deadlocked board so the player is never stuck.
    if (!hasValidMove(this.engine.getBoard())) this.showHint();
  }

  showHint(): void {
    const hint = findHint(this.engine.getBoard());
    if (hint) this.board.flashHint([hint.a, hint.b]);
  }

  resize(): void {
    this.board.resize();
  }

  destroy(): void {
    this.board.destroy();
  }
}

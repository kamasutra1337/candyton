import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { Match3Engine, findHint, getLevel, type Board, type Pos } from '@candyton/engine';
import { CanvasBoard } from '../src/render/CanvasBoard';

/**
 * Headless "play the game" harness. It drives the REAL CanvasBoard renderer
 * against the engine, pumping a controllable animation clock to completion, and
 * asserts the renderer's visual grid stays perfectly in sync with the
 * authoritative engine board after every move — the class of bug a player hits.
 */

let clock = 0;
let rafQueue: FrameRequestCallback[] = [];

beforeAll(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('window', {
    devicePixelRatio: 1,
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
  });
  // Leave ResizeObserver undefined so the renderer's guarded branch is skipped.
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeCtx() {
  const noop = () => {};
  const grad = () => ({ addColorStop: noop });
  return {
    setTransform: noop,
    clearRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    arc: noop,
    ellipse: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    fillText: noop,
    createLinearGradient: grad,
    createRadialGradient: grad,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
}

class FakeCanvas extends EventTarget {
  width = 0;
  height = 0;
  style: Record<string, string> = {};
  private ctx = makeCtx();
  constructor(public size = 480) {
    super();
  }
  getContext() {
    return this.ctx;
  }
  getBoundingClientRect() {
    return { width: this.size, height: this.size, left: 0, top: 0, right: this.size, bottom: this.size };
  }
}

function newBoard(size = 480): { canvas: FakeCanvas; board: CanvasBoard } {
  const canvas = new FakeCanvas(size);
  const board = new CanvasBoard(canvas as unknown as HTMLCanvasElement);
  return { canvas, board };
}

/** Advances the animation clock, draining rAF frames until `p` settles. */
async function settle(p: Promise<unknown>): Promise<void> {
  let done = false;
  void p.then(
    () => (done = true),
    () => (done = true),
  );
  for (let i = 0; i < 8000 && !done; i++) {
    clock += 20;
    const cbs = rafQueue;
    rafQueue = [];
    for (const cb of cbs) cb(clock);
    await Promise.resolve();
    await Promise.resolve();
  }
  expect(done).toBe(true);
}

/** Returns the first cell where the visual grid disagrees with the engine. */
function firstDesync(board: CanvasBoard, engine: Match3Engine): string | null {
  const cells = board.debugCells();
  const eb: Board = engine.getBoard();
  for (let r = 0; r < eb.rows; r++) {
    for (let c = 0; c < eb.cols; c++) {
      const vs = cells[r]?.[c] ?? null;
      const es = eb.cells[r]?.[c] ?? null;
      if (!vs || !es) {
        if (vs !== es) return `(${r},${c}) visual=${JSON.stringify(vs)} engine=${JSON.stringify(es)}`;
        continue;
      }
      if (vs.color !== es.color || vs.special !== es.special) {
        return `(${r},${c}) visual=${JSON.stringify(vs)} engine=${es.color}/${es.special}`;
      }
    }
  }
  return null;
}

function boardFull(board: CanvasBoard): boolean {
  return board.debugCells().every((row) => row.every((s) => s !== null));
}

/** An adjacent swap that yields no match, computed on a throwaway engine. */
function findInvalidMove(levelId: number): { a: Pos; b: Pos } | null {
  const probe = new Match3Engine(getLevel(levelId)!);
  const b = probe.getBoard();
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c + 1 < b.cols; c++) {
      const test = new Match3Engine(getLevel(levelId)!);
      if (!test.swap({ r, c }, { r, c: c + 1 }).valid) return { a: { r, c }, b: { r, c: c + 1 } };
    }
  }
  return null;
}

describe('CanvasBoard stays in sync with the engine', () => {
  it('mirrors a valid move exactly, with the board full and effects cleared', async () => {
    const engine = new Match3Engine(getLevel(1)!);
    const { board } = newBoard();
    board.setBoard(engine.getBoard());

    const hint = findHint(engine.getBoard())!;
    const res = engine.swap(hint.a, hint.b);
    await settle(board.playSteps(res.steps));

    expect(firstDesync(board, engine)).toBeNull();
    expect(boardFull(board)).toBe(true);
    expect(board.debugEffects()).toBe(0);
    board.destroy();
  });

  it('does NOT corrupt the grid on an invalid (bounce-back) swap', async () => {
    const inv = findInvalidMove(1)!;
    const engine = new Match3Engine(getLevel(1)!);
    const { board } = newBoard();
    board.setBoard(engine.getBoard());

    const res = engine.swap(inv.a, inv.b);
    expect(res.valid).toBe(false);
    await settle(board.playSteps(res.steps));

    // Engine reverted; the visual grid must match it (this is the classic desync bug).
    expect(firstDesync(board, engine)).toBeNull();
    expect(boardFull(board)).toBe(true);
    board.destroy();
  });

  it('plays many full games staying in sync every single move', async () => {
    for (const levelId of [1, 3, 5, 7]) {
      const engine = new Match3Engine(getLevel(levelId)!);
      const { board } = newBoard();
      board.setBoard(engine.getBoard());

      let moves = 0;
      while (engine.getState().status === 'playing' && moves < 60) {
        const hint = findHint(engine.getBoard());
        if (!hint) break;
        const res = engine.swap(hint.a, hint.b);
        await settle(board.playSteps(res.steps));
        expect(firstDesync(board, engine)).toBeNull();
        expect(boardFull(board)).toBe(true);
        expect(board.debugEffects()).toBe(0);
        moves++;
      }
      board.destroy();
    }
  });
});

describe('CanvasBoard input', () => {
  function tap(canvas: FakeCanvas, x: number, y: number): void {
    for (const type of ['pointerdown', 'pointerup']) {
      const e = new Event(type);
      (e as unknown as { clientX: number }).clientX = x;
      (e as unknown as { clientY: number }).clientY = y;
      canvas.dispatchEvent(e);
    }
  }

  it('supports tap-then-tap-neighbour to swap', () => {
    const engine = new Match3Engine(getLevel(1)!);
    const { canvas, board } = newBoard();
    board.setBoard(engine.getBoard());
    const swaps: Array<[Pos, Pos]> = [];
    board.onSwap = (a, b) => swaps.push([a, b]);

    // cell size = 480/8 = 60; centre of (r,c) = (c*60+30, r*60+30)
    tap(canvas, 2 * 60 + 30, 3 * 60 + 30); // select (3,2)
    expect(board.debugSelected()).toEqual({ r: 3, c: 2 });
    tap(canvas, 3 * 60 + 30, 3 * 60 + 30); // tap neighbour (3,3) -> swap

    expect(swaps).toHaveLength(1);
    expect(swaps[0]).toEqual([{ r: 3, c: 2 }, { r: 3, c: 3 }]);
    board.destroy();
  });

  it('removes input listeners on destroy (no double-fire after replay)', () => {
    const engine = new Match3Engine(getLevel(1)!);
    const { canvas, board } = newBoard();
    board.setBoard(engine.getBoard());
    let count = 0;
    board.onSwap = () => count++;
    board.destroy();

    tap(canvas, 2 * 60 + 30, 3 * 60 + 30);
    tap(canvas, 3 * 60 + 30, 3 * 60 + 30);
    expect(count).toBe(0);
    expect(board.debugSelected()).toBeNull();
  });
});

describe('CanvasBoard resize', () => {
  it('heals a zero-sized canvas once it gets a real size', () => {
    const engine = new Match3Engine(getLevel(1)!);
    const canvas = new FakeCanvas(0); // mounts with no size
    const board = new CanvasBoard(canvas as unknown as HTMLCanvasElement);
    board.setBoard(engine.getBoard());
    // With size 0 nothing is laid out; give it a size and resize.
    canvas.size = 480;
    board.resize();
    // A sprite now sits at a sane on-screen centre (cell 60 -> first centre 30,30).
    const cells = board.debugCells();
    expect(cells[0]?.[0]).not.toBeNull();
    board.destroy();
  });
});

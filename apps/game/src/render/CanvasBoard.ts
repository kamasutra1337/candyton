import type { Board, Pos, SpecialType, Step } from '@candyton/engine';
import { styleFor } from './palette';

interface Sprite {
  color: number;
  special: SpecialType | null;
  x: number; // centre px
  y: number; // centre px
  scale: number;
  alpha: number;
}

type Tween = {
  from: number;
  to: number;
  start: number;
  dur: number;
  ease: (t: number) => number;
  set: (v: number) => void;
  resolve: () => void;
  done: boolean;
};

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

/**
 * Canvas 2D renderer for the Match-3 board. It owns a purely positional grid of
 * sprites and replays engine Steps as smooth tweens. It knows nothing about the
 * rules — it just mirrors the deltas the engine emits, which keeps the visuals
 * and the authoritative state perfectly in sync.
 */
export class CanvasBoard {
  private readonly ctx: CanvasRenderingContext2D;
  private grid: (Sprite | null)[][] = [];
  private rows = 0;
  private cols = 0;
  private cell = 0;
  private originX = 0;
  private originY = 0;
  private dpr = 1;
  private tweens: Tween[] = [];
  /** Detached sprites (e.g. candies popping out) drawn on top of the grid. */
  private effects: Sprite[] = [];
  private raf = 0;
  private now = 0;
  private busy = false;
  private selected: Pos | null = null;
  private hint: Pos[] = [];
  private pointerStart: { x: number; y: number; cell: Pos } | null = null;
  private readonly listeners = new AbortController();
  private ro: ResizeObserver | null = null;
  private lastW = 0;
  private lastH = 0;

  /** Fired when the player requests a swap of two adjacent cells. */
  onSwap: (a: Pos, b: Pos) => void = () => {};

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.attachInput();
    // Heal a zero-sized canvas at mount and follow every later resize.
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    this.loop();
  }

  get isBusy(): boolean {
    return this.busy;
  }

  // --- diagnostics (used by the headless test harness) --------------------

  /** The visual grid as plain data, for asserting sync against the engine. */
  debugCells(): ({ color: number; special: SpecialType | null } | null)[][] {
    return this.grid.map((row) => row.map((s) => (s ? { color: s.color, special: s.special } : null)));
  }

  debugEffects(): number {
    return this.effects.length;
  }

  debugSelected(): Pos | null {
    return this.selected;
  }

  /** Pulses an outline around cells to nudge the player toward a valid move. */
  flashHint(cells: Pos[], durationMs = 1500): void {
    this.hint = cells;
    window.setTimeout(() => {
      this.hint = [];
    }, durationMs);
  }

  /** Snaps the visual grid to an engine board with no animation. */
  setBoard(board: Board): void {
    this.rows = board.rows;
    this.cols = board.cols;
    this.layout();
    this.grid = board.cells.map((row, r) =>
      row.map((t, c) =>
        t
          ? { color: t.color, special: t.special, ...this.centre(r, c), scale: 1, alpha: 1 }
          : null,
      ),
    );
  }

  /** Recomputes cell size on resize; keeps sprites centred on their cells. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    // Ignore spurious callbacks with no real size change (avoids animation jitter).
    if (rect.width === this.lastW && rect.height === this.lastH) return;
    this.layout();
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const s = this.grid[r]?.[c];
        if (s) {
          const p = this.centre(r, c);
          s.x = p.x;
          s.y = p.y;
        }
      }
  }

  private layout(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.lastW = rect.width;
    this.lastH = rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const size = Math.min(rect.width, rect.height);
    this.cell = Math.floor(size / Math.max(this.rows, this.cols));
    this.originX = (rect.width - this.cell * this.cols) / 2;
    this.originY = (rect.height - this.cell * this.rows) / 2;
  }

  private centre(r: number, c: number): { x: number; y: number } {
    return {
      x: this.originX + c * this.cell + this.cell / 2,
      y: this.originY + r * this.cell + this.cell / 2,
    };
  }

  private cellAt(px: number, py: number): Pos | null {
    const c = Math.floor((px - this.originX) / this.cell);
    const r = Math.floor((py - this.originY) / this.cell);
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return { r, c };
  }

  // --- animation loop -----------------------------------------------------

  private loop = (): void => {
    this.now = performance.now();
    for (const tw of this.tweens) {
      if (tw.done) continue;
      const t = tw.dur <= 0 ? 1 : Math.min(1, (this.now - tw.start) / tw.dur);
      tw.set(tw.from + (tw.to - tw.from) * tw.ease(t));
      if (t >= 1) {
        tw.done = true;
        tw.resolve();
      }
    }
    if (this.tweens.length) this.tweens = this.tweens.filter((t) => !t.done);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.listeners.abort();
    this.ro?.disconnect();
    this.ro = null;
  }

  private tween(
    set: (v: number) => void,
    from: number,
    to: number,
    dur: number,
    ease = easeOutCubic,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ set, from, to, dur, ease, start: this.now, resolve, done: false });
    });
  }

  // --- step playback ------------------------------------------------------

  async playSteps(steps: Step[], onStep?: (step: Step, index: number) => void): Promise<void> {
    this.busy = true;
    this.selected = null;
    for (let i = 0; i < steps.length; i++) {
      onStep?.(steps[i]!, i);
      await this.playStep(steps[i]!);
    }
    this.busy = false;
  }

  private async playStep(step: Step): Promise<void> {
    switch (step.kind) {
      case 'swap':
        await this.animateSwap(step.a, step.b, false);
        break;
      case 'invalidSwap':
        await this.animateSwap(step.a, step.b, true);
        break;
      case 'clear':
        await this.animateClear(step);
        break;
      case 'gravity':
        await this.animateGravity(step);
        break;
    }
  }

  private async animateSwap(a: Pos, b: Pos, revert: boolean): Promise<void> {
    const sa = this.grid[a.r]?.[a.c];
    const sb = this.grid[b.r]?.[b.c];
    if (!sa || !sb) return;
    const pa = this.centre(a.r, a.c);
    const pb = this.centre(b.r, b.c);
    const D = 140;
    await Promise.all([
      this.tween((v) => (sa.x = v), pa.x, pb.x, D),
      this.tween((v) => (sa.y = v), pa.y, pb.y, D),
      this.tween((v) => (sb.x = v), pb.x, pa.x, D),
      this.tween((v) => (sb.y = v), pb.y, pa.y, D),
    ]);
    if (revert) {
      await Promise.all([
        this.tween((v) => (sa.x = v), pb.x, pa.x, D),
        this.tween((v) => (sa.y = v), pb.y, pa.y, D),
        this.tween((v) => (sb.x = v), pa.x, pb.x, D),
        this.tween((v) => (sb.y = v), pa.y, pb.y, D),
      ]);
    } else {
      this.grid[a.r]![a.c] = sb;
      this.grid[b.r]![b.c] = sa;
    }
  }

  private async animateClear(step: Extract<Step, { kind: 'clear' }>): Promise<void> {
    const anims: Promise<void>[] = [];
    for (const p of step.cells) {
      const s = this.grid[p.r]?.[p.c];
      if (!s) continue;
      this.grid[p.r]![p.c] = null;
      // Keep the popping candy alive as a detached effect so the animation is
      // actually visible (the grid cell is already gone).
      this.effects.push(s);
      anims.push(
        this.tween((v) => (s.scale = v), 1, 1.35, 90)
          .then(() =>
            Promise.all([
              this.tween((v) => (s.scale = v), 1.35, 0, 120, easeInBack),
              this.tween((v) => (s.alpha = v), 1, 0, 120),
            ]),
          )
          .then(() => {
            const i = this.effects.indexOf(s);
            if (i >= 0) this.effects.splice(i, 1);
          }),
      );
    }
    for (const cr of step.created) {
      const p = cr.pos;
      const existing = this.grid[p.r]?.[p.c];
      const sprite: Sprite =
        existing ?? { color: cr.color, special: null, ...this.centre(p.r, p.c), scale: 0, alpha: 1 };
      sprite.color = cr.color;
      sprite.special = cr.special;
      sprite.alpha = 1;
      this.grid[p.r]![p.c] = sprite;
      anims.push(this.tween((v) => (sprite.scale = v), 0.3, 1, 220, easeOutBack));
    }
    await Promise.all(anims);
  }

  private async animateGravity(step: Extract<Step, { kind: 'gravity' }>): Promise<void> {
    const anims: Promise<void>[] = [];
    // Move existing tiles. Process bottom-up so we never overwrite a pending source.
    const falls = [...step.falls].sort((a, b) => b.to.r - a.to.r);
    for (const f of falls) {
      const s = this.grid[f.from.r]?.[f.from.c];
      if (!s) continue;
      this.grid[f.from.r]![f.from.c] = null;
      this.grid[f.to.r]![f.to.c] = s;
      const target = this.centre(f.to.r, f.to.c);
      const dist = Math.abs(f.to.r - f.from.r);
      anims.push(this.tween((v) => (s.y = v), s.y, target.y, 90 + dist * 45, easeOutCubic));
    }
    for (const sp of step.spawns) {
      const target = this.centre(sp.to.r, sp.to.c);
      const sprite: Sprite = {
        color: sp.tile.color,
        special: sp.tile.special,
        x: target.x,
        y: target.y - (sp.to.r + 1.5) * this.cell,
        scale: 1,
        alpha: 1,
      };
      this.grid[sp.to.r]![sp.to.c] = sprite;
      anims.push(this.tween((v) => (sprite.y = v), sprite.y, target.y, 260, easeOutCubic));
    }
    await Promise.all(anims);
  }

  // --- drawing ------------------------------------------------------------

  private draw(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Board backdrop with a checkerboard of translucent cells.
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const x = this.originX + c * this.cell;
        const y = this.originY + r * this.cell;
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
        this.roundRect(x + 2, y + 2, this.cell - 4, this.cell - 4, 8);
        ctx.fill();
      }

    if (this.selected) {
      const x = this.originX + this.selected.c * this.cell;
      const y = this.originY + this.selected.r * this.cell;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      this.roundRect(x + 2, y + 2, this.cell - 4, this.cell - 4, 8);
      ctx.stroke();
    }

    if (this.hint.length) {
      const pulse = 0.5 + 0.5 * Math.sin(this.now / 180);
      ctx.strokeStyle = `rgba(255,241,120,${0.4 + pulse * 0.5})`;
      ctx.lineWidth = 4;
      for (const p of this.hint) {
        const x = this.originX + p.c * this.cell;
        const y = this.originY + p.r * this.cell;
        this.roundRect(x + 2, y + 2, this.cell - 4, this.cell - 4, 8);
        ctx.stroke();
      }
    }

    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const s = this.grid[r]?.[c];
        if (s) this.drawSprite(s);
      }

    // Detached effects (popping candies) draw on top.
    for (const s of this.effects) this.drawSprite(s);
  }

  private drawSprite(s: Sprite): void {
    const ctx = this.ctx;
    const rad = (this.cell / 2 - 4) * s.scale;
    if (rad <= 0) return;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    const style = styleFor(s.color);

    if (s.special === 'colorBomb') {
      const g = ctx.createRadialGradient(s.x - rad / 3, s.y - rad / 3, rad / 6, s.x, s.y, rad);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, '#b56bff');
      g.addColorStop(0.7, '#3b8bff');
      g.addColorStop(1, '#ff3b6b');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Candy body: rounded gem with a vertical gradient + glossy highlight.
    const g = ctx.createLinearGradient(s.x, s.y - rad, s.x, s.y + rad);
    g.addColorStop(0, style.light);
    g.addColorStop(0.5, style.base);
    g.addColorStop(1, style.dark);
    ctx.fillStyle = g;
    this.roundRect(s.x - rad, s.y - rad, rad * 2, rad * 2, rad * 0.4);
    ctx.fill();

    // Gloss.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(s.x - rad * 0.3, s.y - rad * 0.4, rad * 0.4, rad * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Striped overlay.
    if (s.special === 'stripedH' || s.special === 'stripedV') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, rad * 0.16);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        if (s.special === 'stripedH') {
          ctx.moveTo(s.x - rad, s.y + i * rad * 0.5);
          ctx.lineTo(s.x + rad, s.y + i * rad * 0.5);
        } else {
          ctx.moveTo(s.x + i * rad * 0.5, s.y - rad);
          ctx.lineTo(s.x + i * rad * 0.5, s.y + rad);
        }
      }
      ctx.stroke();
    }

    // Wrapped overlay: bright border box.
    if (s.special === 'wrapped') {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, rad * 0.18);
      this.roundRect(s.x - rad * 0.72, s.y - rad * 0.72, rad * 1.44, rad * 1.44, rad * 0.3);
      ctx.stroke();
    }

    // Colour-blind symbol.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `${Math.floor(rad * 0.8)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.symbol, s.x, s.y + rad * 0.05);
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // --- input --------------------------------------------------------------

  private adjacent(a: Pos, b: Pos): boolean {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  private requestSwap(a: Pos, b: Pos): void {
    this.selected = null;
    this.pointerStart = null;
    if (
      a.r >= 0 &&
      a.r < this.rows &&
      a.c >= 0 &&
      a.c < this.cols &&
      b.r >= 0 &&
      b.r < this.rows &&
      b.c >= 0 &&
      b.c < this.cols
    ) {
      this.onSwap(a, b);
    }
  }

  /**
   * Supports both interaction styles players expect: drag a candy toward a
   * neighbour, OR tap a candy then tap an adjacent one.
   */
  private attachInput(): void {
    const signal = this.listeners.signal;

    const down = (px: number, py: number): void => {
      if (this.busy) return;
      const cell = this.cellAt(px, py);
      if (!cell) return;
      this.pointerStart = { x: px, y: py, cell };
    };

    const move = (px: number, py: number): void => {
      if (!this.pointerStart || this.busy) return;
      const dx = px - this.pointerStart.x;
      const dy = py - this.pointerStart.y;
      const threshold = Math.max(12, this.cell * 0.35);
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      const from = this.pointerStart.cell;
      const to: Pos =
        Math.abs(dx) > Math.abs(dy)
          ? { r: from.r, c: from.c + (dx > 0 ? 1 : -1) }
          : { r: from.r + (dy > 0 ? 1 : -1), c: from.c };
      this.requestSwap(from, to); // swipe swap
    };

    const up = (px: number, py: number): void => {
      const start = this.pointerStart;
      this.pointerStart = null;
      if (!start || this.busy) return;
      const dx = px - start.x;
      const dy = py - start.y;
      // Treat as a tap only if the pointer barely moved.
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
      const cell = this.cellAt(px, py);
      if (!cell) {
        this.selected = null;
        return;
      }
      if (!this.selected) {
        this.selected = cell; // first tap: select
      } else if (this.selected.r === cell.r && this.selected.c === cell.c) {
        this.selected = null; // tap again: deselect
      } else if (this.adjacent(this.selected, cell)) {
        this.requestSwap(this.selected, cell); // second tap on neighbour: swap
      } else {
        this.selected = cell; // tapped elsewhere: reselect
      }
    };

    const rel = (e: PointerEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    this.canvas.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        const p = rel(e);
        down(p.x, p.y);
      },
      { signal },
    );
    this.canvas.addEventListener(
      'pointermove',
      (e) => {
        const p = rel(e);
        move(p.x, p.y);
      },
      { signal },
    );
    this.canvas.addEventListener(
      'pointerup',
      (e) => {
        const p = rel(e);
        up(p.x, p.y);
      },
      { signal },
    );
    const cancel = (): void => {
      this.pointerStart = null;
    };
    this.canvas.addEventListener('pointercancel', cancel, { signal });
    this.canvas.style.touchAction = 'none';
  }
}

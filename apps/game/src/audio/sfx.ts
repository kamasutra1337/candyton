/**
 * Procedural sound effects synthesised with the Web Audio API — zero asset
 * files to ship, download or licence. Every sound is a short oscillator with a
 * gain envelope, so the whole audio layer is a few hundred bytes of code.
 */
let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export const sfx = {
  setEnabled(on: boolean): void {
    enabled = on;
  },

  /** Call once from a user gesture so mobile browsers unlock audio. */
  unlock(): void {
    audio();
  },

  play(name: SfxName, param = 0): void {
    if (!enabled) return;
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    switch (name) {
      case 'swap':
        blip(ac, now, 420, 0.07, 'triangle');
        break;
      case 'invalid':
        blip(ac, now, 140, 0.16, 'sawtooth', 0.14);
        break;
      case 'match':
        // Cascade pitch climbs a pentatonic ladder for a satisfying combo.
        blip(ac, now, 440 * Math.pow(2, Math.min(param, 8) / 12), 0.12, 'sine');
        break;
      case 'special':
        chord(ac, now, [523, 659, 784], 0.22);
        break;
      case 'coin':
        blip(ac, now, 1200, 0.06, 'square', 0.08);
        blip(ac, now + 0.05, 1600, 0.06, 'square', 0.08);
        break;
      case 'click':
        blip(ac, now, 300, 0.04, 'square', 0.06);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => blip(ac, now + i * 0.11, f, 0.2, 'sine'));
        break;
      case 'lose':
        [440, 349, 262].forEach((f, i) => blip(ac, now + i * 0.14, f, 0.28, 'triangle'));
        break;
    }
  },
};

export type SfxName =
  | 'swap'
  | 'invalid'
  | 'match'
  | 'special'
  | 'coin'
  | 'click'
  | 'win'
  | 'lose';

function blip(
  ac: AudioContext,
  start: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  peak = 0.12,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function chord(ac: AudioContext, start: number, freqs: number[], dur: number): void {
  for (const f of freqs) blip(ac, start, f, dur, 'sine', 0.08);
}

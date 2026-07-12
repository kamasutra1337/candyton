/** Candy colours — vivid, high-contrast, each with a distinct symbol for
 *  colour-blind accessibility. Index matches the engine's Color value. */
export interface CandyStyle {
  base: string;
  light: string;
  dark: string;
  symbol: string;
}

export const CANDY_STYLES: CandyStyle[] = [
  { base: '#ff3b6b', light: '#ff87a6', dark: '#c40e40', symbol: '❤' }, // 0 red
  { base: '#ffb020', light: '#ffd37a', dark: '#c77a00', symbol: '★' }, // 1 amber
  { base: '#31d0aa', light: '#8bf0da', dark: '#0f9b7c', symbol: '◆' }, // 2 teal
  { base: '#3b8bff', light: '#8fbdff', dark: '#0d5bd4', symbol: '●' }, // 3 blue
  { base: '#b56bff', light: '#d6aaff', dark: '#7a2ed4', symbol: '✦' }, // 4 violet
  { base: '#ff6d3b', light: '#ffa987', dark: '#d4430d', symbol: '▲' }, // 5 orange
  { base: '#f2f24a', light: '#f9f9a0', dark: '#bcbc12', symbol: '✿' }, // 6 yellow
  { base: '#ff5ecb', light: '#ffa3e2', dark: '#d41794', symbol: '❈' }, // 7 pink
];

export const styleFor = (color: number): CandyStyle =>
  CANDY_STYLES[((color % CANDY_STYLES.length) + CANDY_STYLES.length) % CANDY_STYLES.length]!;

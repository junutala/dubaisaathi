/**
 * The palette, lifted from `design/generate-screens.py` so the app and the screens cannot
 * drift. Two themes, same roles: marigold means "press here", teal means offline-and-ready,
 * red is reserved and used by nothing (decision 002).
 *
 * These become CSS custom properties on :root, so a theme switch is one attribute flip
 * rather than a re-render.
 */
export const LIGHT = {
  ink: '#141826',
  indigo: '#1A2456',
  indigoDeep: '#0F1530',
  marigold: '#E8871E',
  marigoldSoft: '#FDF0DC',
  marigoldLine: '#F2C795',
  marigoldText: '#9A5B10',
  onMarigold: '#231403',
  warmText: '#7A4A0C',
  teal: '#0B7A6B',
  tealSoft: '#E1F2EF',
  tealText: '#0A5F54',
  tealLine: '#BFE3DD',
  sand: '#F7F3EC',
  card: '#FFFDF9',
  /**
   * The tiles sit on plain white rather than the card's cream, on the owner's instruction after
   * seeing the artwork: the marigold line drawings read as washed out against a warm ground.
   * In dark it is the card colour — white tiles at night would be a torch.
   */
  tile: '#FFFFFF',
  /**
   * The glowing gradient edge (`glow()` in design/generate-screens.py). Brand colours rather
   * than the neon reference's pink and blue, on the owner's call: marigold carries on both
   * grounds, where a cool neon would vanish against cream in daylight.
   */
  edgeFrom: '#FBD9A4',
  edgeMid: '#E8871E',
  edgeTo: '#B4610F',
  /** The bloom, spent only on the tile being pressed — a blur is the part that costs GPU. */
  bloom: 'rgb(232 135 30 / 0.34)',
  line: '#E6DED2',
  muted: '#5B6070',
  chev: '#8A8F9E',
  /**
   * The three pillars, each its own hue, on the bold-type home the owner chose on 16 September:
   * a deep block with cream type on it. `*Text` is the same hue as ink on a light ground, for
   * the header and the bar; `*Soft` is its tint, for chips and notes inside the pillar.
   */
  food: '#B4610F',
  onFood: '#FFF6E8',
  foodText: '#9A5B10',
  foodSoft: '#FDF0DC',
  go: '#0B7A6B',
  onGo: '#EAFBF7',
  goText: '#0A5F54',
  goSoft: '#E1F2EF',
  know: '#1A2456',
  onKnow: '#EEF0FF',
  knowText: '#1A2456',
  knowSoft: '#E8EAF6',
  /**
   * बोलना's own hue, on घर as the fourth block (17 September): deep plum. It has to be none of
   * the three at a glance — warm where जाना is cool, magenta where जानना is blue, cool where
   * खाना is orange — and dark enough to carry the same cream type. Red stays reserved
   * (decision 002); plum is not it.
   */
  speak: '#6B2A54',
  onSpeak: '#FDECF5',
  speakText: '#6B2A54',
  speakSoft: '#F9E8F1',
  /** The pass dot: green while the counter runs, marigold when it is about to stop. Never red. */
  running: '#2E9E5B',
} as const;

export const DARK: Record<keyof typeof LIGHT, string> = {
  ink: '#F1EDE6',
  indigo: '#8E9BD9',
  indigoDeep: '#0B0D14',
  marigold: '#F0913A',
  marigoldSoft: '#3A2A14',
  marigoldLine: '#6E4A1C',
  marigoldText: '#F2AC5C',
  onMarigold: '#1C1206',
  warmText: '#F0C48C',
  teal: '#3FC0A9',
  tealSoft: '#0E2A27',
  tealText: '#8FE0CF',
  tealLine: '#1E4A44',
  sand: '#14161F',
  card: '#1D202C',
  tile: '#1D202C',
  // Lifted on a dark ground, where a deep shade of the same hue would read as a smudge.
  edgeFrom: '#F6B36A',
  edgeMid: '#F0913A',
  edgeTo: '#9A5B10',
  bloom: 'rgb(240 145 58 / 0.42)',
  line: '#2D3242',
  muted: '#9AA1B3',
  chev: '#7B8397',
  // Lifted a step each, so the blocks sit off a near-black ground rather than sinking into it.
  food: '#9A5310',
  onFood: '#FFF3E0',
  foodText: '#F2AC5C',
  foodSoft: '#3A2A14',
  go: '#0E6E61',
  onGo: '#E6FAF5',
  goText: '#8FE0CF',
  goSoft: '#0E2A27',
  know: '#242F6E',
  onKnow: '#EDEFFF',
  knowText: '#B4BEEE',
  knowSoft: '#1C2140',
  speak: '#5F2649',
  onSpeak: '#FCEDF5',
  speakText: '#E7A3C6',
  speakSoft: '#2E1727',
  running: '#3FC27A',
};

export type ThemeName = 'light' | 'dark';

/** Follow the phone unless the traveller has overridden it on the strip. */
export function applyTheme(theme: ThemeName): void {
  const palette = theme === 'dark' ? DARK : LIGHT;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(palette)) {
    root.style.setProperty(`--${name}`, value);
  }
  root.dataset.theme = theme;
}

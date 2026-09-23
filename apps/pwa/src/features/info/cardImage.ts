/**
 * Getting a photograph of a reception card into the shape the reader reads best (decision 032).
 * Pure arithmetic on grey levels, so every rule is tested without a camera or a canvas.
 *
 * Three things a phone photograph of a card gets wrong, all seen on the owner's own card on
 * 23 September: it is sideways, because a card is held however the hand holds it; it is dark,
 * because the side with the logo is printed white on black; and it is dim, because a hotel lobby
 * is. The reader copes with none of them, and each is cheap to undo before it looks.
 */

/** A photograph as grey levels, row by row. */
export interface Grey {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** Grey from colour, weighted the way the eye weights it. */
export function toGrey(rgba: Uint8ClampedArray, width: number, height: number): Grey {
  const pixels = new Uint8Array(width * height);
  for (let index = 0; index < pixels.length; index += 1) {
    const at = index * 4;
    pixels[index] = Math.round(
      0.299 * (rgba[at] ?? 0) + 0.587 * (rgba[at + 1] ?? 0) + 0.114 * (rgba[at + 2] ?? 0),
    );
  }
  return { width, height, pixels };
}

/** The grey levels of the middle half of the frame, where the card is. */
function middle(grey: Grey): number[] {
  const values: number[] = [];
  const x0 = Math.floor(grey.width / 4);
  const y0 = Math.floor(grey.height / 4);
  const step = Math.max(1, Math.floor(Math.min(grey.width, grey.height) / 200));
  for (let y = y0; y < grey.height - y0; y += step) {
    for (let x = x0; x < grey.width - x0; x += step)
      values.push(grey.pixels[y * grey.width + x] ?? 0);
  }
  return values.sort((a, b) => a - b);
}

/**
 * A card printed light on dark. Judged on the middle of the frame, because a white card on a dark
 * table is still a white card.
 */
export function isDarkCard(grey: Grey): boolean {
  const values = middle(grey);
  return (values[Math.floor(values.length / 2)] ?? 255) < 110;
}

/**
 * Light text on dark turned dark on light, and the lobby's dim range stretched to the full one.
 * The 2nd and 98th percentiles, not the extremes, so one glint of the lamp does not decide it.
 */
export function readable(grey: Grey): Grey {
  const dark = isDarkCard(grey);
  const sorted = Array.from(grey.pixels).sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.02)] ?? 0;
  const high = sorted[Math.floor(sorted.length * 0.98)] ?? 255;
  const span = Math.max(1, high - low);
  const pixels = new Uint8Array(grey.pixels.length);
  for (let index = 0; index < pixels.length; index += 1) {
    const stretched = Math.min(255, Math.max(0, (((grey.pixels[index] ?? 0) - low) * 255) / span));
    pixels[index] = Math.round(dark ? 255 - stretched : stretched);
  }
  return { width: grey.width, height: grey.height, pixels };
}

/** The level that best separates ink from card (Otsu's method): ink is at or below it. */
export function inkThreshold(grey: Grey): number {
  const histogram = new Array<number>(256).fill(0);
  for (const value of grey.pixels) histogram[value] = (histogram[value] ?? 0) + 1;
  const total = grey.pixels.length;
  let sum = 0;
  for (let level = 0; level < 256; level += 1) sum += level * (histogram[level] ?? 0);
  let below = 0;
  let belowSum = 0;
  let best = 0;
  let threshold = 127;
  for (let level = 0; level < 256; level += 1) {
    below += histogram[level] ?? 0;
    if (below === 0) continue;
    const above = total - below;
    if (above === 0) break;
    belowSum += level * (histogram[level] ?? 0);
    const meanBelow = belowSum / below;
    const meanAbove = (sum - belowSum) / above;
    const between = below * above * (meanBelow - meanAbove) ** 2;
    if (between > best) {
      best = between;
      threshold = level;
    }
  }
  return threshold;
}

function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
}

/**
 * Whether the lines of print run up the photograph rather than across it.
 *
 * Lines of text across a card make its rows alternate — a row of ink, a row of card — while
 * every column crosses all of them alike. Turned sideways, the columns alternate instead. So
 * the ink counted row by row and column by column says which way the print runs, without
 * reading a letter. What it cannot tell is up from down; the reader is asked both ways round
 * when the first reading is poor.
 */
export function textRunsSideways(grey: Grey): boolean {
  const threshold = inkThreshold(grey);
  const rows = new Array<number>(grey.height).fill(0);
  const columns = new Array<number>(grey.width).fill(0);
  for (let y = 0; y < grey.height; y += 1) {
    for (let x = 0; x < grey.width; x += 1) {
      if ((grey.pixels[y * grey.width + x] ?? 255) <= threshold) {
        rows[y] = (rows[y] ?? 0) + 1;
        columns[x] = (columns[x] ?? 0) + 1;
      }
    }
  }
  // Each count as a share of its line's length, so a tall frame and a wide one compare fairly.
  const rowShare = rows.map((count) => count / grey.width);
  const columnShare = columns.map((count) => count / grey.height);
  return variance(columnShare) > variance(rowShare) * 1.15;
}

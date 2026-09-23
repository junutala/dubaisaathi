import { describe, expect, it } from 'vitest';
import {
  inkThreshold,
  isDarkCard,
  readable,
  textRunsSideways,
  toGrey,
  type Grey,
} from './cardImage.js';

/**
 * A card drawn in grey levels: `lines` bands of ink across a light card, each broken into
 * words, so rows alternate ink and card the way printed lines do.
 */
function card({ dark = false, sideways = false } = {}): Grey {
  const width = 200;
  const height = 120;
  const ink = dark ? 240 : 20;
  const paper = dark ? 25 : 235;
  const pixels = new Uint8Array(width * height).fill(paper);
  for (let line = 0; line < 6; line += 1) {
    const top = 12 + line * 17;
    for (let y = top; y < top + 8; y += 1) {
      for (let x = 15; x < 185; x += 1) {
        // Words: eighteen pixels of ink, then a gap.
        if (x % 24 < 18) pixels[y * width + x] = ink;
      }
    }
  }
  if (!sideways) return { width, height, pixels };
  const turned = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1)
      turned[x * height + (height - 1 - y)] = pixels[y * width + x] ?? 0;
  }
  return { width: height, height: width, pixels: turned };
}

describe('getting a card photograph ready to read', () => {
  it('turns colour into grey the way the eye weights it', () => {
    const grey = toGrey(
      new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 0, 255, 0, 255]),
      3,
      1,
    );
    expect(Array.from(grey.pixels)).toEqual([255, 0, 150]);
  });

  it('tells the logo side, printed light on dark, from an ordinary card', () => {
    expect(isDarkCard(card({ dark: true }))).toBe(true);
    expect(isDarkCard(card())).toBe(false);
  });

  it('turns a dark card into dark print on a light card, which is what the reader reads', () => {
    const fixed = readable(card({ dark: true }));
    expect(isDarkCard(fixed)).toBe(false);
    // The ink is now the dark end of the range.
    const threshold = inkThreshold(fixed);
    const inked = Array.from(fixed.pixels).filter((value) => value <= threshold).length;
    expect(inked).toBeLessThan(fixed.pixels.length / 2);
  });

  it('stretches a dim lobby photograph across the whole range', () => {
    const dim: Grey = { width: 4, height: 1, pixels: new Uint8Array([90, 100, 150, 160]) };
    const fixed = readable(dim);
    expect(Math.min(...fixed.pixels)).toBe(0);
    expect(Math.max(...fixed.pixels)).toBe(255);
  });

  it('finds the level between ink and card', () => {
    const threshold = inkThreshold(card());
    expect(threshold).toBeGreaterThanOrEqual(20);
    expect(threshold).toBeLessThan(235);
  });

  it('knows a card photographed sideways from one held straight, without reading a letter', () => {
    expect(textRunsSideways(card())).toBe(false);
    expect(textRunsSideways(card({ sideways: true }))).toBe(true);
    expect(textRunsSideways(card({ dark: true, sideways: true }))).toBe(true);
  });
});

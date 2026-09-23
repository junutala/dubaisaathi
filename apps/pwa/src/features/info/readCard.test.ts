import { describe, expect, it } from 'vitest';
import { linesOf, turnsFor } from './readCard.js';

/**
 * The engine itself needs a canvas and wasm that jsdom does not have; what is tested here is
 * what readCard decides around it.
 */
describe('reading a card photograph', () => {
  it('tries every way round, the likely one first, and never skips the upright reading', () => {
    // On 23 September the ink check called upright cards sideways and the upright reading was
    // never made: a fallback nobody reached.
    expect([...turnsFor(false)].sort()).toEqual([0, 180, 270, 90]);
    expect([...turnsFor(true)].sort()).toEqual([0, 180, 270, 90]);
    expect(turnsFor(false)[0]).toBe(0);
    expect(turnsFor(true)[0]).toBe(90);
  });

  it('keeps every line with its height, and counts only the words the engine was sure of', () => {
    const read = linesOf([
      {
        paragraphs: [
          {
            lines: [
              {
                text: 'AL WASMI RESIDENCE\n',
                bbox: { y0: 10, y1: 54 },
                words: [
                  { text: 'AL', confidence: 95 },
                  { text: 'WASMI', confidence: 91 },
                  { text: 'RESIDENCE', confidence: 88 },
                ],
              },
              {
                text: 'UAL crawl] G29',
                bbox: { y0: 60, y1: 80 },
                words: [
                  { text: 'UAL', confidence: 31 },
                  { text: 'crawl]', confidence: 22 },
                ],
              },
            ],
          },
        ],
      },
    ]);
    expect(read.lines).toEqual([
      { text: 'AL WASMI RESIDENCE', height: 44 },
      { text: 'UAL crawl] G29', height: 20 },
    ]);
    expect(read.sure).toBe(2);
  });
});

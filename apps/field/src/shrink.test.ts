import { describe, expect, it } from 'vitest';
import { fitWithin } from './shrink.js';

describe('fitting a photo inside an edge', () => {
  it('scales a landscape phone photo down by its longest side', () => {
    expect(fitWithin(4032, 3024, 1280)).toEqual({ width: 1280, height: 960 });
  });

  it('scales a portrait photo by its height', () => {
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges a photo from an older phone', () => {
    // Blowing it up would cost data and show nothing more.
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it('leaves a photo already at the edge alone', () => {
    expect(fitWithin(1280, 720, 1280)).toEqual({ width: 1280, height: 720 });
  });

  it('survives a zero-sized image rather than dividing by it', () => {
    expect(fitWithin(0, 0, 1280)).toEqual({ width: 0, height: 0 });
  });
});

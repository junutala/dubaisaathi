import { describe, expect, it } from 'vitest';
import { concat, heardAnything, resample, WHISPER_RATE } from './resample.js';

describe('joining the worklet chunks', () => {
  it('keeps every sample, in order', () => {
    const out = concat([new Float32Array([1, 2]), new Float32Array([3]), new Float32Array([4, 5])]);
    expect([...out]).toEqual([1, 2, 3, 4, 5]);
  });

  it('survives nothing at all', () => {
    expect(concat([]).length).toBe(0);
  });
});

describe('resampling to what the model expects', () => {
  it('thirds the sample count going from 48k to 16k', () => {
    const input = new Float32Array(4800);
    expect(resample(input, 48_000).length).toBe(1600);
  });

  it('leaves audio already at the right rate untouched', () => {
    const input = new Float32Array([0.5, -0.5]);
    expect(resample(input, WHISPER_RATE)).toBe(input);
  });

  it('keeps the shape of the signal rather than just its length', () => {
    // A ramp resampled is still a ramp: the first and last values must survive.
    const ramp = Float32Array.from({ length: 300 }, (_, i) => i / 300);
    const out = resample(ramp, 48_000);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out.at(-1) ?? 0).toBeGreaterThan(0.9);
  });

  it('never reads past the end of the buffer', () => {
    const out = resample(new Float32Array([1, 2, 3]), 48_000);
    expect([...out].every((n) => Number.isFinite(n))).toBe(true);
  });
});

describe('deciding whether anything was said', () => {
  it('calls a silent buffer silent', () => {
    // Whisper invents "Thank you." out of room tone. A sentence nobody said, about to be held up
    // to a driver, is worse than being told nothing was heard.
    expect(heardAnything(new Float32Array(1600))).toBe(false);
  });

  it('calls quiet room noise silent', () => {
    const hiss = Float32Array.from({ length: 1600 }, () => (Math.random() - 0.5) * 0.002);
    expect(heardAnything(hiss)).toBe(false);
  });

  it('hears an actual voice', () => {
    const speech = Float32Array.from({ length: 1600 }, (_, i) => Math.sin(i / 8) * 0.3);
    expect(heardAnything(speech)).toBe(true);
  });
});

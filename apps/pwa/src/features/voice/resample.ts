/**
 * Microphone audio, turned into what a speech model expects.
 *
 * Whisper wants 16 kHz mono float. A phone's `AudioContext` almost always runs at 48 kHz, and
 * hands the worklet whatever it likes, so the rate has to be converted rather than assumed — a
 * model fed 48 kHz as though it were 16 kHz hears a chipmunk and transcribes nonsense, with no
 * error anywhere to say so.
 *
 * Linear interpolation rather than a proper filter: speech is being recognised, not mastered,
 * and the aliasing a cheap resampler introduces is far below what a Dubai street adds anyway.
 * The alternative is a windowed-sinc kernel and a lot of arithmetic on a cheap phone for a
 * difference no recogniser will notice.
 */

/** What every Whisper build expects, in Hz. */
export const WHISPER_RATE = 16_000;

/** Joins the worklet's chunks into one run of samples. */
export function concat(chunks: readonly Float32Array[]): Float32Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const all = new Float32Array(total);
  let at = 0;
  for (const chunk of chunks) {
    all.set(chunk, at);
    at += chunk.length;
  }
  return all;
}

export function resample(samples: Float32Array, from: number, to = WHISPER_RATE): Float32Array {
  if (from === to || samples.length === 0) return samples;
  const ratio = from / to;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const at = i * ratio;
    const left = Math.floor(at);
    const right = Math.min(left + 1, samples.length - 1);
    const weight = at - left;
    // `?? 0` for the type checker under noUncheckedIndexedAccess; both indices are in range.
    out[i] = (samples[left] ?? 0) * (1 - weight) + (samples[right] ?? 0) * weight;
  }
  return out;
}

/**
 * Was anything actually said?
 *
 * A model handed a second of silence returns a confident hallucination — Whisper is notorious
 * for inventing "Thank you." out of room tone — and a traveller shown a sentence they never said,
 * about to hold it up to a driver, is worse than being told nothing was heard. So silence is
 * caught here rather than explained away later.
 */
export function heardAnything(samples: Float32Array, floor = 0.01): boolean {
  let peak = 0;
  for (const sample of samples) {
    const level = Math.abs(sample);
    if (level > peak) peak = level;
  }
  return peak >= floor;
}

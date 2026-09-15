import { describe, expect, it } from 'vitest';
import { textFrom, WORKLET_NAME } from './whisperStt.js';
// Read as text at build time: the worklet is plain JavaScript in public/, outside the TypeScript
// project, and the only thing tying it to this engine is a string that has to match.
import worklet from '../../../public/mic-worklet.js?raw';
import engine from './whisperStt.ts?raw';

/**
 * The library's own types are `any`, so what comes back is checked rather than trusted. These
 * are the shapes it actually produces, plus the ones that would crash a screen someone is
 * speaking into.
 */
describe('reading a transcript out of whatever the pipeline returned', () => {
  it('takes the text from a single result', () => {
    expect(textFrom({ text: ' मुझे पानी चाहिए ' })).toBe('मुझे पानी चाहिए');
  });

  it('takes the first when the audio was chunked into several', () => {
    expect(textFrom([{ text: 'Karama jaana hai' }, { text: 'ignored' }])).toBe('Karama jaana hai');
  });

  it('returns nothing rather than throwing on a shape we did not expect', () => {
    // "Nothing heard" already has a screen behind it. A crash does not.
    expect(textFrom(null)).toBe('');
    expect(textFrom(undefined)).toBe('');
    expect(textFrom('a bare string')).toBe('');
    expect(textFrom({})).toBe('');
    expect(textFrom([])).toBe('');
    expect(textFrom({ text: 42 })).toBe('');
  });
});

describe('the audio worklet', () => {
  /**
   * The bug this exists for cost a test on a real phone and read as something else entirely.
   *
   * `public/mic-worklet.js` registers a processor called `saathi-mic`; this file asked its
   * AudioContext for one called `mic-worklet`, after the file it lives in. Asking a context for a
   * processor it has never registered throws `InvalidStateError` — seconds after the model has
   * loaded and the microphone has been granted, so it looked like the recogniser failing rather
   * than a name that did not match.
   *
   * Nothing else could catch it: two string literals in two files, one of them plain JavaScript
   * outside the TypeScript project, agreeing with each other or not. So the worklet is read here
   * as text and the name it registers is compared with the name this engine asks for.
   */
  it('is asked for by the name it registers itself under', () => {
    const registered = /registerProcessor\(\s*['"]([^'"]+)['"]/.exec(worklet)?.[1];
    expect(registered).toBeDefined();
    expect(WORKLET_NAME).toBe(registered);
  });

  it('is served from the path the engine loads', () => {
    expect(engine).toContain("addModule('/mic-worklet.js')");
  });
});

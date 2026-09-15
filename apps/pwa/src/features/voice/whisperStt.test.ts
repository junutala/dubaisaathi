import { describe, expect, it } from 'vitest';
import { textFrom } from './whisperStt.js';

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

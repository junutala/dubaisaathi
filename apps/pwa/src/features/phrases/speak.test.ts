import { afterEach, describe, expect, it, vi } from 'vitest';
import { findArabicVoice, meansNoVoice } from './speak.js';

/**
 * The rule under test is the one that broke on a real phone: a voice list without Arabic in it
 * is not proof that the phone has no Arabic. Android fills the list in pieces, and concluding
 * from the first piece tells a perfectly capable phone that it cannot speak.
 */

interface Voice {
  name: string;
  lang: string;
  localService: boolean;
}

const voice = (lang: string, localService = true): Voice => ({ name: lang, lang, localService });

function stubSynth(initial: Voice[]) {
  let voices = initial;
  const listeners: (() => void)[] = [];
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: () => undefined,
  });
  /** What the system engine does a moment after the page asks. */
  return (next: Voice[]) => {
    voices = next;
    listeners.forEach((fn) => {
      fn();
    });
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('findArabicVoice', () => {
  it('takes a Gulf voice over any other Arabic', async () => {
    stubSynth([voice('ar-EG'), voice('ar-AE'), voice('en-US')]);
    const support = await findArabicVoice();
    expect(support).toMatchObject({ kind: 'ready', voice: { lang: 'ar-AE' } });
  });

  it('takes a non-Gulf Arabic rather than nothing', async () => {
    stubSynth([voice('ar-EG'), voice('en-US')]);
    await expect(findArabicVoice()).resolves.toMatchObject({ kind: 'ready' });
  });

  it('keeps waiting when the first list has no Arabic in it', async () => {
    // The bug: a non-empty list was treated as the complete one, so a voice that arrived a
    // moment later was never seen and the phone was told it had none.
    const arrive = stubSynth([voice('en-US')]);
    const pending = findArabicVoice(2000);
    arrive([voice('en-US'), voice('ar-AE')]);
    await expect(pending).resolves.toMatchObject({ kind: 'ready', voice: { lang: 'ar-AE' } });
  });

  it('gives up only once the phone has had its time', async () => {
    stubSynth([voice('en-US')]);
    await expect(findArabicVoice(10)).resolves.toMatchObject({ kind: 'no-arabic-voice' });
  });

  it('reports unsupported where there is no speech synthesis at all', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    // `'speechSynthesis' in window` stays true once stubbed, so this checks the real guard path
    // by removing the property outright.
    Reflect.deleteProperty(window, 'speechSynthesis');
    await expect(findArabicVoice(10)).resolves.toMatchObject({ kind: 'unsupported' });
  });
});

describe('what a refusal actually means', () => {
  /**
   * The regression this pins. "This phone has no Arabic voice" was printed, and the button
   * permanently greyed, on *any* error the synthesiser reported — including `interrupted`, which
   * `speakArabic` used to cause itself by cancelling an idle engine before every utterance. A
   * phone with a working Arabic voice was told it had none, twice, in the same file.
   */
  it.each([['language-unavailable'], ['voice-unavailable'], ['synthesis-unavailable']])(
    'treats %s as the voice genuinely not being there',
    (reason) => {
      expect(meansNoVoice(reason)).toBe(true);
    },
  );

  it.each([['interrupted'], ['canceled'], ['audio-busy'], ['synthesis-failed'], ['unknown']])(
    'treats %s as a moment, not a verdict about the device',
    (reason) => {
      // The next tap very often works. Closing the door on these is how the winnings get lost.
      expect(meansNoVoice(reason)).toBe(false);
    },
  );

  it('says nothing about the device when it was never asked', () => {
    expect(meansNoVoice(undefined)).toBe(false);
  });
});

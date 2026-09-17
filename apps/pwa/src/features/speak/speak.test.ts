import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakArabic } from './speak.js';

/**
 * Reading the Arabic aloud, and — the part that matters — reporting what the device said rather
 * than refusing on its behalf. A phone with no Arabic voice is told apart from a phone that
 * simply would not speak, because the traveller's next move differs: show the screen, or press
 * again.
 */

type Handler = (() => void) | null;

interface FakeUtterance {
  lang: string;
  voice: SpeechSynthesisVoice | null;
  onstart: Handler;
  onend: Handler;
  onerror: Handler;
}

/** A synthesiser that ends, errors, or says nothing at all, with a voice list we control. */
function withSynth(behaviour: 'end' | 'error' | 'silent', voices: string[]) {
  const spoken: FakeUtterance[] = [];
  class Utterance implements FakeUtterance {
    lang = '';
    voice: SpeechSynthesisVoice | null = null;
    onstart: Handler = null;
    onend: Handler = null;
    onerror: Handler = null;
    constructor(readonly text: string) {}
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const synth = {
    getVoices: () => voices.map((lang) => ({ lang, name: lang }) as SpeechSynthesisVoice),
    cancel: () => undefined,
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
      utterance.onstart?.();
      if (behaviour === 'end') utterance.onend?.();
      if (behaviour === 'error') utterance.onerror?.();
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  return spoken;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
});

describe('reading the Arabic aloud', () => {
  it('speaks in Arabic, on the phone’s own Arabic voice when it has one', async () => {
    const spoken = withSynth('end', ['en-US', 'ar-SA']);
    expect(await speakArabic('مرحبا')).toEqual({ kind: 'spoke' });
    expect(spoken[0]?.lang).toBe('ar-AE');
    expect(spoken[0]?.voice?.lang).toBe('ar-SA');
  });

  it('still attempts when the browser lists no voices at all', async () => {
    // The list is commonly empty until something has been spoken once, so an empty list is never
    // taken as an answer — CLAUDE.md: never tell a traveller their phone cannot, until it has.
    const spoken = withSynth('end', []);
    expect(await speakArabic('مرحبا')).toEqual({ kind: 'spoke' });
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.voice).toBeNull();
  });

  it('reports a refusal rather than throwing when the device has no Arabic voice', async () => {
    withSynth('error', []);
    expect(await speakArabic('مرحبا')).toEqual({ kind: 'refused', reason: 'no-voice' });
  });

  it('separates a device that has the voice and still would not speak', async () => {
    withSynth('error', ['ar-AE']);
    expect(await speakArabic('مرحبا')).toEqual({ kind: 'refused', reason: 'error' });
  });

  it('gives up honestly when nothing comes back at all', async () => {
    vi.useFakeTimers();
    withSynth('silent', ['ar-AE']);
    const said = speakArabic('مرحبا');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await said).toEqual({ kind: 'refused', reason: 'error' });
    vi.useRealTimers();
  });

  it('says there is no engine on a browser that cannot speak, without throwing', async () => {
    expect(await speakArabic('مرحبا')).toEqual({ kind: 'refused', reason: 'no-engine' });
  });
});

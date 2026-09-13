/**
 * Arabic out loud, on the device.
 *
 * Many Dubai drivers now read no Hindi and no English, so hearing the sentence matters as
 * much as seeing it (CLAUDE.md, "Drivers"). The Web Speech API's synthesis half is on-device
 * on both Android and iOS and needs no network — but which voices exist is entirely up to
 * the phone, so this module reports what it found rather than assuming.
 */
export interface ArabicVoice {
  readonly name: string;
  readonly lang: string;
  /** iOS and Android mark on-device voices differently; false means it may need a network. */
  readonly localService: boolean;
}

export type SpeechSupport =
  | { readonly kind: 'ready'; readonly voice: ArabicVoice }
  | { readonly kind: 'no-arabic-voice'; readonly available: readonly ArabicVoice[] }
  | { readonly kind: 'unsupported' };

function describe(voice: SpeechSynthesisVoice): ArabicVoice {
  return { name: voice.name, lang: voice.lang, localService: voice.localService };
}

/**
 * Voices load asynchronously on most browsers, and on some they only appear after the
 * `voiceschanged` event — so this waits briefly rather than reporting a false negative.
 */
export async function findArabicVoice(timeoutMs = 1500): Promise<SpeechSupport> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { kind: 'unsupported' };
  }
  const synth = window.speechSynthesis;

  const voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const timer = setTimeout(() => {
      resolve(synth.getVoices());
    }, timeoutMs);
    synth.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(timer);
        resolve(synth.getVoices());
      },
      { once: true },
    );
  });

  const arabic = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
  if (arabic.length === 0) {
    return { kind: 'no-arabic-voice', available: voices.map(describe) };
  }
  // Prefer a Gulf voice, then any on-device one: a driver in Dubai hears ar-AE or ar-SA as
  // ordinary and an ar-EG voice as foreign but perfectly clear.
  const gulf = arabic.find((v) => /^ar[-_](AE|SA|BH|KW|QA|OM)/i.test(v.lang));
  const local = arabic.find((v) => v.localService);
  const chosen = gulf ?? local ?? arabic[0];
  if (!chosen) return { kind: 'no-arabic-voice', available: voices.map(describe) };
  return { kind: 'ready', voice: describe(chosen) };
}

export interface SpeakResult {
  readonly spoken: boolean;
  readonly voiceName?: string;
  readonly ms: number;
}

/** Speaks the Arabic. Resolves when the phone has finished, or immediately if it cannot. */
export async function speakArabic(text: string, rate = 0.85): Promise<SpeakResult> {
  const started = performance.now();
  const support = await findArabicVoice();
  if (support.kind !== 'ready') return { spoken: false, ms: performance.now() - started };

  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = support.voice.lang;
  // Slower than default: the driver is hearing it once, over traffic.
  utterance.rate = rate;
  const match = synth.getVoices().find((v) => v.name === support.voice.name);
  if (match) utterance.voice = match;

  await new Promise<void>((resolve) => {
    utterance.addEventListener(
      'end',
      () => {
        resolve();
      },
      { once: true },
    );
    utterance.addEventListener(
      'error',
      () => {
        resolve();
      },
      { once: true },
    );
    synth.speak(utterance);
  });
  return { spoken: true, voiceName: support.voice.name, ms: performance.now() - started };
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

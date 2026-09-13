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
 * The best voice found so far, remembered across calls.
 *
 * This exists so speaking can start in the same tick as the tap. Android will not populate its
 * voice list until the user has interacted with the page, and it treats an `await` before
 * `speak()` as breaking the user gesture — so a handler that waits for the probe before speaking
 * says nothing at all. The probe fills this in whenever it can; speaking reads it and never
 * waits for it.
 */
let known: SpeechSupport | null = null;

/** Picks the best Arabic voice out of a list, or reports that the list has none. */
function choose(voices: readonly SpeechSynthesisVoice[]): SpeechSupport {
  const arabic = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
  // Prefer a Gulf voice, then any on-device one: a driver in Dubai hears ar-AE or ar-SA as
  // ordinary and an ar-EG voice as foreign but perfectly clear.
  const chosen =
    arabic.find((v) => /^ar[-_](AE|SA|BH|KW|QA|OM)/i.test(v.lang)) ??
    arabic.find((v) => v.localService) ??
    arabic[0];
  return chosen
    ? { kind: 'ready', voice: describe(chosen) }
    : { kind: 'no-arabic-voice', available: voices.map(describe) };
}

/**
 * Voices arrive asynchronously, and on Android they arrive *in pieces*: `getVoices()` answers
 * immediately with whatever the system engine has handed over so far, then fires `voiceschanged`
 * as more appear. A non-empty list is therefore not a complete one — treating it as complete is
 * how a phone with a perfectly good Arabic voice gets told it has none.
 *
 * So a list without Arabic in it is not an answer yet: this keeps watching until Arabic turns up
 * or the timeout says the phone really does not have it.
 */
export async function findArabicVoice(timeoutMs = 2500): Promise<SpeechSupport> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { kind: 'unsupported' };
  }
  const synth = window.speechSynthesis;

  const ready = choose(synth.getVoices());
  if (ready.kind === 'ready') {
    known = ready;
    return ready;
  }

  return new Promise<SpeechSupport>((resolve) => {
    const settle = (support: SpeechSupport) => {
      window.clearTimeout(timer);
      synth.removeEventListener('voiceschanged', onChange);
      known = support;
      resolve(support);
    };
    const onChange = () => {
      const next = choose(synth.getVoices());
      // Keep waiting on a list that still has no Arabic — more of it may be on the way.
      if (next.kind === 'ready') settle(next);
    };
    const timer = window.setTimeout(() => {
      settle(choose(synth.getVoices()));
    }, timeoutMs);
    synth.addEventListener('voiceschanged', onChange);
  });
}

/**
 * Re-checks whenever the phone's voice list changes, so a screen that has already decided the
 * phone has no Arabic can change its mind when the voice finally loads. Returns an unsubscribe.
 */
export function watchArabicVoices(onChange: (support: SpeechSupport) => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => undefined;
  const synth = window.speechSynthesis;
  const handler = () => {
    const support = choose(synth.getVoices());
    if (support.kind === 'ready') known = support;
    onChange(support);
  };
  synth.addEventListener('voiceschanged', handler);
  return () => {
    synth.removeEventListener('voiceschanged', handler);
  };
}

export interface SpeakResult {
  readonly spoken: boolean;
  readonly voiceName?: string;
  readonly ms: number;
}

/**
 * Speaks the Arabic, starting in the same tick it is called.
 *
 * Nothing is awaited before `speak()`: Android treats a gesture handler that awaits as no longer
 * being a gesture, and refuses. So this uses whatever voice the probe has already found, and asks
 * for Gulf Arabic by language tag when it has found none — because a voice list is not a promise
 * of what the engine can say, and the phone should get to answer rather than be ruled out.
 *
 * Call it directly from the tap. The returned promise resolves when the phone has finished, or
 * with `spoken: false` if it refused.
 */
export function speakArabic(text: string, rate = 0.85): Promise<SpeakResult> {
  const started = performance.now();
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve({ spoken: false, ms: performance.now() - started });
  }

  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  // Read into a local so the narrowing survives into the callback below.
  const found = known;
  const voice =
    found?.kind === 'ready'
      ? synth.getVoices().find((v) => v.name === found.voice.name)
      : undefined;
  utterance.lang = voice?.lang ?? 'ar-AE';
  // Slower than default: the driver is hearing it once, over traffic.
  utterance.rate = rate;
  if (voice) utterance.voice = voice;

  const finished = new Promise<boolean>((resolve) => {
    utterance.addEventListener('end', () => {
      resolve(true);
    });
    // The phone telling us it cannot say this. Reported honestly rather than as silence.
    utterance.addEventListener('error', () => {
      resolve(false);
    });
  });
  synth.speak(utterance);

  return finished.then((spoken) => ({
    spoken,
    ...(voice ? { voiceName: voice.name } : {}),
    ms: performance.now() - started,
  }));
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

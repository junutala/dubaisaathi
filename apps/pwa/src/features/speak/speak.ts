/**
 * Reading aloud with the phone's own voice: the Arabic, so a shopkeeper who is not looking at the
 * screen still hears it, and the Hindi of a board the traveller photographed (घर.7).
 *
 * **Always attempt; never decide in advance.** CLAUDE.md's rule, and the five bugs of
 * 13 September, are exactly this: a browser reports partial voice lists, answers only after a
 * user gesture, and hides itself on an insecure origin, so "the API did not list an Arabic
 * voice" is not the same as "this phone cannot say it". The utterance is handed to the device
 * every time, and what comes back through `onstart`, `onend` and `onerror` is what the screen
 * reports.
 *
 * The voice list is the clearest case of that: on Android and on iOS it is commonly empty until
 * something has been spoken once, so it is re-read after the attempt rather than trusted before
 * it — and a device that has no Arabic voice at all is only said to have none once it has
 * refused with the list still empty of one.
 */

export type Spoken =
  /** The device started and finished saying it. */
  | { readonly kind: 'spoke' }
  /** It refused, and this is what it refused with. */
  | { readonly kind: 'refused'; readonly reason: 'no-engine' | 'no-voice' | 'error' };

/** Nothing came back at all. Long enough for a whole sentence; short enough not to hang a screen. */
const GIVE_UP_MS = 20_000;

/** The two languages the app ever reads aloud, and the tag handed to the phone for each. */
const TAGS = { ar: 'ar-AE', hi: 'hi-IN' } as const;
type Aloud = keyof typeof TAGS;

function voiceFor(synth: SpeechSynthesis, lang: Aloud): SpeechSynthesisVoice | undefined {
  // A browser that lists nothing throws nothing here; it simply returns an empty list, which is
  // why an empty list is never treated as an answer.
  return synth.getVoices().find((voice) => voice.lang.toLowerCase().startsWith(lang));
}

export function speakArabic(text: string, onStart?: () => void): Promise<Spoken> {
  return speakAloud(text, 'ar', onStart);
}

export function speakHindi(text: string, onStart?: () => void): Promise<Spoken> {
  return speakAloud(text, 'hi', onStart);
}

async function speakAloud(text: string, lang: Aloud, onStart?: () => void): Promise<Spoken> {
  const synth: SpeechSynthesis | undefined =
    typeof window === 'undefined' ? undefined : window.speechSynthesis;
  if (synth === undefined || typeof SpeechSynthesisUtterance === 'undefined') {
    return { kind: 'refused', reason: 'no-engine' };
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = TAGS[lang];
  // Preferred, not required: when the browser has a voice for the language ready, it is far
  // better than whatever the default would make of the letters. When it has none, `lang` alone
  // is still handed over and the device is left to answer.
  const preferred = voiceFor(synth, lang);
  if (preferred !== undefined) utterance.voice = preferred;

  return new Promise<Spoken>((resolve) => {
    let done = false;
    const finish = (outcome: Spoken) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(outcome);
    };

    const timer = setTimeout(() => {
      // Neither ended nor errored. Say it did not happen rather than leave a button spinning.
      synth.cancel();
      finish({ kind: 'refused', reason: 'error' });
    }, GIVE_UP_MS);

    // "Speaking" is shown when the device says it started, never when we asked it to: the gap
    // between the two is where a silent phone would otherwise look like a talking one.
    utterance.onstart = () => {
      onStart?.();
    };
    utterance.onend = () => {
      finish({ kind: 'spoke' });
    };
    utterance.onerror = () => {
      // Now — after an attempt — the list is worth reading: a phone that still lists no voice for
      // the language is a phone that cannot say this, and the screen has its own line for that.
      finish({
        kind: 'refused',
        reason: voiceFor(synth, lang) === undefined ? 'no-voice' : 'error',
      });
    };

    try {
      synth.speak(utterance);
    } catch {
      finish({ kind: 'refused', reason: 'error' });
    }
  });
}

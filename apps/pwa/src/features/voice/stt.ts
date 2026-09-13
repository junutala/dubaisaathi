import type { SpeechResult, SpeechSource } from '@saathi/shared';

/**
 * The seam between speech and the parser.
 *
 * Everything downstream — the parser, the screens, the learning loop — consumes `SpeechResult`
 * and does not care what produced it. So the engine that decides the PWA-vs-native gate can be
 * swapped without touching a screen: Vosk or sherpa-onnx implements `SttEngine`, is registered
 * below, and the app picks it because it reports `worksOffline`.
 *
 * Two engines exist today. `browserStt` asks the phone, preferring its on-device model when it
 * has one — which is the spike question, asked by the app rather than by hand. `typedStt` is
 * the keyboard, which works on every phone with no network and no permission, and is why the
 * mic is never a dead end.
 */

export type SttFailure =
  'no-permission' | 'no-speech' | 'no-engine' | 'insecure-context' | 'network' | 'failed';

/**
 * Browsers expose speech recognition only on a secure origin. On plain HTTP the constructor is
 * simply absent — indistinguishable, from the code's point of view, from a phone that cannot do
 * Hindi at all. Asking this separately is what stops the app telling a traveller their phone is
 * incapable when the truth is that the certificate had not issued yet.
 */
export function isSecureOrigin(): boolean {
  return window.isSecureContext;
}

export interface SttHandlers {
  /** Called as the engine changes its mind, so 1.2 can show that it is hearing something. */
  readonly onPartial: (text: string) => void;
  readonly onFinal: (result: SpeechResult) => void;
  readonly onFailure: (failure: SttFailure) => void;
}

export interface SttSession {
  /** Wrap up and report what was heard. */
  readonly stop: () => void;
  /** Drop it: रद्द करें. No result, no event. */
  readonly cancel: () => void;
}

export interface SttEngine {
  /** Travels with every `VoiceEvent`, so an engine regression is visible in the data. */
  readonly id: string;
  readonly source: SpeechSource;
  /** True only when the engine is proven to need no network. A claim, checked by the spike. */
  readonly worksOffline: boolean;
  /** Cheap and synchronous: does this phone have it at all? */
  readonly available: () => boolean;
  readonly listen: (handlers: SttHandlers) => SttSession;
}

// --- the browser's own recogniser ---------------------------------------------------------

/**
 * `SpeechRecognition` is not in lib.dom at TypeScript 5.9, and the on-device members
 * (`processLocally`, `available`) are newer than the spec text. This is the one place the app
 * touches the API, so the shape is declared here rather than loosened everywhere.
 */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  /** Chrome 138+: refuse to send audio to a server. The whole offline question, in one flag. */
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

/** The event's own shape, likewise absent from lib.dom at this version. */
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
  /** Chrome 138+: whether a local model for these languages is already installed. */
  available?: (options: { langs: readonly string[]; processLocally: boolean }) => Promise<string>;
}

// Declared rather than cast, so the two spellings of the global are typed everywhere they are
// read. Safari has only the webkit one; browsers with no recogniser have neither.
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function constructor(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/** Hindi, because that is the only speech the MVP understands (CLAUDE.md rule 4). */
export const SPEECH_LANG = 'hi-IN';

/**
 * Has the phone downloaded a Hindi model it can run without a network? Chrome 138+ can answer;
 * every other browser cannot, and "unknown" is reported as such rather than as a yes.
 */
export async function onDeviceHindi(): Promise<'available' | 'unavailable' | 'unknown'> {
  const Recognition = constructor();
  if (!Recognition?.available) return 'unknown';
  try {
    const state = await Recognition.available({ langs: [SPEECH_LANG], processLocally: true });
    return state === 'available' ? 'available' : 'unavailable';
  } catch {
    return 'unknown';
  }
}

function browserEngine(processLocally: boolean): SttEngine {
  return {
    id: processLocally ? 'browser-on-device' : 'browser-cloud',
    source: 'browser-stt',
    worksOffline: processLocally,
    available: () => constructor() !== undefined,
    listen: (handlers) => {
      const Recognition = constructor();
      if (!Recognition) {
        handlers.onFailure('no-engine');
        return { stop: () => undefined, cancel: () => undefined };
      }

      const recognition = new Recognition();
      recognition.lang = SPEECH_LANG;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      if (processLocally) recognition.processLocally = true;

      const startedAt = Date.now();
      let best = '';
      let confidence: number | undefined;
      let settled = false;

      recognition.onresult = (event) => {
        let partial = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results.item(i);
          const alternative = result.item(0);
          if (result.isFinal) {
            best = alternative.transcript;
            confidence = alternative.confidence;
          } else {
            partial += alternative.transcript;
          }
        }
        handlers.onPartial(best === '' ? partial : best);
      };

      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        handlers.onFailure(failureOf(event.error));
      };

      recognition.onend = () => {
        if (settled) return;
        settled = true;
        if (best.trim() === '') {
          handlers.onFailure('no-speech');
          return;
        }
        handlers.onFinal({
          transcript: best,
          source: 'browser-stt',
          latencyMs: Date.now() - startedAt,
          ...(confidence === undefined ? {} : { confidence }),
        });
      };

      try {
        recognition.start();
      } catch {
        settled = true;
        handlers.onFailure('failed');
      }

      return {
        stop: () => {
          recognition.stop();
        },
        cancel: () => {
          settled = true;
          recognition.abort();
        },
      };
    },
  };
}

function failureOf(error: string): SttFailure {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'no-permission';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return 'network';
    case 'language-not-supported':
      return 'no-engine';
    default:
      return 'failed';
  }
}

/** The phone's own recogniser, told to keep the audio on the device. */
export const onDeviceStt: SttEngine = browserEngine(true);

/** The same recogniser without that condition — which usually means a server hears the audio. */
export const cloudStt: SttEngine = browserEngine(false);

// --- the keyboard -------------------------------------------------------------------------

/**
 * Not speech, and not pretending to be: the traveller types the sentence and the parser does
 * the rest. It is here because it is the only input that works on every phone, with no network
 * and no microphone permission — so a phone with no Hindi model still reaches all four tiles.
 */
export const typedStt: SttEngine = {
  id: 'typed',
  source: 'typed',
  worksOffline: true,
  available: () => true,
  listen: () => ({ stop: () => undefined, cancel: () => undefined }),
};

/**
 * In order of preference: an engine that keeps the audio on the phone, then one that does not,
 * then the keyboard. Offline first, always — a cloud recogniser is a convenience, never the
 * thing a traveller depends on (CLAUDE.md rule 1).
 */
export const ENGINES: readonly SttEngine[] = [onDeviceStt, cloudStt, typedStt];

export function pickEngine(engines: readonly SttEngine[] = ENGINES): SttEngine {
  const offline = engines.find((e) => e.worksOffline && e.available());
  return offline ?? engines.find((e) => e.available()) ?? typedStt;
}

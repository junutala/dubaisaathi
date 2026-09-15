import type { SpeechResult, SpeechSource } from '@saathi/shared';
import { startSpeechClock } from './endOfSpeech.js';

/**
 * The seam between speech and the parser.
 *
 * Everything downstream — the parser, the screens, the learning loop — consumes `SpeechResult`
 * and does not care what produced it. So the engine that decides the PWA-vs-native gate can be
 * swapped without touching a screen: Whisper or sherpa-onnx implements `SttEngine`, is registered
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
  /**
   * The engine is getting ready and is NOT yet hearing anything. An on-device model takes
   * seconds to unpack, and showing a live waveform through that is a lie the traveller pays for:
   * they speak, nothing is heard, and they conclude it does not work.
   */
  readonly onPreparing?: () => void;
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
const SPEECH_LANG = 'hi-IN';

/**
 * Has the phone downloaded a Hindi model it can run without a network? Chrome 138+ can answer;
 * every other browser cannot, and "unknown" is reported as such rather than as a yes.
 */
async function onDeviceHindi(): Promise<'available' | 'unavailable' | 'unknown'> {
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
      /**
       * Kept listening until something says stop, which is the traveller or the clock below.
       *
       * `false` here was a real defect and a quiet one: it makes the browser end at the speaker's
       * first pause, so "यह बुर दुबई से discovery gardens जाना है" came back as "यह बर दुबई से" —
       * cut off mid-sentence, in under a second, on a phone in Dubai. It went unnoticed for as long
       * as a truncated sentence went straight to a screen; it became obvious the moment the words
       * were shown to the person who had said them.
       *
       * A traveller pauses to think, and pauses again because the place has four words in it. The
       * end of a sentence is silence, not a breath, and both engines now judge it the same way.
       */
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      if (processLocally) recognition.processLocally = true;

      const startedAt = Date.now();
      let best = '';
      let confidence: number | undefined;
      let settled = false;
      const clock = startSpeechClock(() => {
        recognition.stop();
      });

      recognition.onresult = (event) => {
        // Continuous recognition reports the sentence in pieces, so the final ones are collected
        // rather than overwritten — assigning here kept only the last fragment of a long sentence.
        let partial = '';
        const finals: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results.item(i);
          const alternative = result.item(0);
          if (result.isFinal) {
            finals.push(alternative.transcript.trim());
            confidence = alternative.confidence;
          } else {
            partial += alternative.transcript;
          }
        }
        best = finals.filter((text) => text !== '').join(' ');
        if (best !== '' || partial.trim() !== '') clock.heard();
        handlers.onPartial([best, partial].filter((text) => text.trim() !== '').join(' '));
      };

      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        clock.stop();
        handlers.onFailure(failureOf(event.error));
      };

      recognition.onend = () => {
        if (settled) return;
        settled = true;
        clock.stop();
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
          clock.stop();
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
const onDeviceStt: SttEngine = browserEngine(true);

/** The same recogniser without that condition — which usually means a server hears the audio. */
const cloudStt: SttEngine = browserEngine(false);

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
 * Which engines this phone should try, best first.
 *
 * Offline first, always: an engine that keeps the audio on the phone is preferred, and a cloud
 * recogniser is a convenience behind it, never the thing a traveller depends on (rule 1). But
 * preference is not the same as insistence — demanding `processLocally` on a phone with no Hindi
 * model installed fails, and failing there is not a reason to tell the traveller their phone
 * cannot hear Hindi. So the caller walks this list until one works.
 *
 * An empty list means the keyboard, and the screen says why.
 */
export async function resolveEngines(online: boolean): Promise<readonly SttEngine[]> {
  if (!isSecureOrigin()) return [];

  const candidates: SttEngine[] = [];

  // Our own model first when the phone already has it: it needs no network, no Google, and no
  // OS language pack — the three things that failed on a real phone. Downloading it is never
  // done here; that is a deliberate choice the traveller makes once, not a side effect of
  // tapping a microphone.
  const { whisperStt } = await import('./whisperStt.js');
  const { whisperModelState } = await import('./whisperModel.js');
  if (whisperStt.available() && (await whisperModelState(online)) === 'cached') {
    candidates.push(whisperStt);
  }

  if (constructor() === undefined) return candidates;
  const local = await onDeviceHindi();
  // 'unknown' is worth an attempt: every browser but Chrome 138+ answers that way, and if it
  // turns out to work with the radio off, the PWA gate is passed with no native wrapper at all.
  // 'unavailable' is the browser telling us plainly, so the attempt is skipped rather than spent.
  if (local !== 'unavailable') candidates.push(onDeviceStt);
  if (online) candidates.push(cloudStt);
  return candidates;
}

/**
 * Whether trying the next engine could plausibly help. A refused permission applies to every
 * engine and silence means the engine worked, so neither is worth a second attempt.
 */
export function worthAnotherEngine(failure: SttFailure): boolean {
  return failure === 'no-engine' || failure === 'network' || failure === 'failed';
}

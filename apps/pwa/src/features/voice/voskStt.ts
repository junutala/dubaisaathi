// Types only, so this does not pull the 6 MB WASM runtime into the initial bundle; the module
// itself is still imported dynamically, below.
import type { KaldiRecognizer, Model } from 'vosk-browser';
import type { SttEngine, SttHandlers, SttSession } from './stt.js';
import { withoutUnknownWords } from './speechGrammar.js';
import { speechGrammar } from './intentPacks.js';

/**
 * Hindi speech recognition that runs on the phone, with no network and no Google.
 *
 * A WebAssembly build of Kaldi (vosk-browser) against Vosk's small Hindi model. This is the
 * engine that decides the PWA gate: the browser's own recogniser needs an OS language pack that
 * nothing downloads by default, and a real Android phone proved it. This one carries its own.
 *
 * The model is served from our own origin — baked into the image at build time — so the page's
 * CSP stays `'self'`, no research host has to stay up, and the download is ours to cache.
 */

/** Served by nginx with a one-year immutable header; the name changes when the model does. */
const VOSK_MODEL_URL = '/models/vosk-hi.tar.gz';

/** Named so a later model can be added without evicting this one mid-trip. */
const MODEL_CACHE = 'saathi-speech-v1';

/**
 * Reported with every `VoiceEvent`, so a model regression is visible in the data. The suffix is
 * part of the identity on purpose: the same model decoding against our word list is a different
 * recogniser from the same model decoding against fifty thousand words, and the learning loop has
 * to be able to tell the two apart when it compares what travellers were heard to say.
 */
const VOSK_ENGINE_ID = 'vosk-hi-0.22+grammar';

export type ModelState = 'cached' | 'fetchable' | 'unavailable';

/**
 * Whether the model is already on the phone. Nothing downloads 42 MB because someone tapped a
 * microphone — that is a decision the traveller makes once, on wifi, before the trip.
 */
export async function voskModelState(online: boolean): Promise<ModelState> {
  if (!('caches' in window) || typeof Worker === 'undefined') return 'unavailable';
  try {
    const cache = await caches.open(MODEL_CACHE);
    if (await cache.match(VOSK_MODEL_URL)) return 'cached';
  } catch {
    return 'unavailable';
  }
  return online ? 'fetchable' : 'unavailable';
}

/**
 * Downloads the model into the cache, reporting progress. Resolves true once it is on the phone
 * for good — after this the mic works with the radio off.
 */
export async function downloadVoskModel(
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetch(VOSK_MODEL_URL, signal ? { signal } : {});
    if (!response.ok || !response.body) return false;

    // Content-Length lets the traveller watch a real bar rather than a spinner that lies.
    const total = Number(response.headers.get('content-length') ?? 0);
    const chunks: Uint8Array[] = [];
    let received = 0;
    const reader = response.body.getReader();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // Abandoned by the traveller: stop reading and keep nothing, so a half-file is never
      // mistaken for a model later.
      if (signal?.aborted) {
        await reader.cancel();
        return false;
      }
      chunks.push(value);
      received += value.length;
      if (total > 0) onProgress(received / total);
    }

    const body = new Blob(chunks as BlobPart[], { type: 'application/gzip' });
    const cache = await caches.open(MODEL_CACHE);
    await cache.put(VOSK_MODEL_URL, new Response(body));

    // The model is useless without the runtime that reads it, and the runtime is a separate 6 MB
    // chunk kept out of the install step. Pulling it in here means the download the traveller
    // agreed to is the whole of what voice needs — not most of it, with the rest discovered
    // missing in a taxi.
    await import('vosk-browser');

    onProgress(1);
    return true;
  } catch {
    return false;
  }
}

// --- the engine --------------------------------------------------------------------------

/**
 * Loading the model costs seconds and megabytes of memory, so it is done once and kept for the
 * life of the page rather than per tap.
 */
let loading: Promise<Awaited<ReturnType<typeof createVoskModel>>> | null = null;

async function createVoskModel() {
  // Imported dynamically: the WASM runtime is ~6 MB and has no business in the initial bundle
  // of an app whose first screen is four tiles.
  const { createModel } = await import('vosk-browser');
  return createModel(VOSK_MODEL_URL);
}

function loadModel() {
  loading ??= createVoskModel().catch((error: unknown) => {
    // A failed load must not poison every later attempt.
    loading = null;
    throw error;
  });
  return loading;
}

/**
 * A recogniser that decodes against our word list instead of the model's whole vocabulary.
 *
 * Returns null rather than throwing, because a missing biased recogniser is a worse transcript
 * and not a broken microphone — the unbiased one is still there, and it is what shipped before
 * this existed. The `try` only catches a refusal the constructor makes here; vosk builds the
 * grammar inside its worker, so a grammar it cannot build shows up instead as that recogniser
 * returning nothing, which the caller already handles by reading the unbiased one.
 */
function tryGrammarRecognizer(model: Model, sampleRate: number): KaldiRecognizer | null {
  try {
    return new model.KaldiRecognizer(sampleRate, JSON.stringify(speechGrammar));
  } catch {
    return null;
  }
}

export const voskStt: SttEngine = {
  id: VOSK_ENGINE_ID,
  source: 'offline-stt',
  worksOffline: true,
  // Whether the model is actually present is asked separately and asynchronously; by the time
  // this engine is in the candidate list, that question has been answered.
  available: () => typeof Worker !== 'undefined' && 'caches' in window,
  listen: (handlers: SttHandlers): SttSession => {
    let stopped = false;
    let cleanup: (() => void) | null = null;

    const run = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        });
      } catch {
        handlers.onFailure('no-permission');
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => {
          t.stop();
        });
        return;
      }

      let model;
      try {
        // Unpacking 78 MB of acoustic model into the WASM filesystem is not instant, and on the
        // first run after a download it is the slowest thing the app ever does.
        handlers.onPreparing?.();
        model = await loadModel();
      } catch {
        stream.getTracks().forEach((t) => {
          t.stop();
        });
        handlers.onFailure('no-engine');
        return;
      }

      const started = Date.now();
      const context = new AudioContext();

      /**
       * Two recognisers on one model, listening to the same audio.
       *
       * The first is biased: it decodes against the few hundred words in `data/intents/`, which is
       * what makes it hear "मॉल ऑफ़ द एमिरेट्स" instead of the commoner words that sound like it.
       * The second is the model as it comes, decoding against everything it knows.
       *
       * Both, and not just the first, because biasing is a trade and this is the side of it that
       * has to be paid for: a grammar can only return words it holds, so the day a traveller says
       * a place nobody has curated, the biased recogniser is deaf to it by construction. The
       * unbiased one still hears it — which keeps the sentence parseable when the biased reading
       * yields nothing, and keeps the learning loop able to see words we have never seen, which is
       * the only way the list ever grows. The model, the megabytes and the audio are shared; what
       * is doubled is the decoding, and the decode of a small model is a fraction of real time.
       */
      const biased = tryGrammarRecognizer(model, context.sampleRate);
      const unbiased = new model.KaldiRecognizer(context.sampleRate);

      let best = '';
      let heardWithoutGrammar = '';

      const collect = (recognizer: KaldiRecognizer, append: (text: string) => void) => {
        recognizer.on('result', (message) => {
          if ('result' in message && 'text' in message.result) {
            const text = withoutUnknownWords(message.result.text);
            if (text !== '') append(text);
          }
        });
      };
      collect(unbiased, (text) => {
        heardWithoutGrammar = heardWithoutGrammar === '' ? text : `${heardWithoutGrammar} ${text}`;
      });
      // The biased recogniser is the one whose partials the traveller watches, because it is the
      // one whose words the parser will read. Where it could not be built, the unbiased one is.
      const primary = biased ?? unbiased;
      if (biased) {
        collect(biased, (text) => {
          best = best === '' ? text : `${best} ${text}`;
        });
      }
      primary.on('partialresult', (message) => {
        if ('result' in message && 'partial' in message.result) {
          const partial = withoutUnknownWords(message.result.partial);
          const shown = biased ? best : heardWithoutGrammar;
          handlers.onPartial(shown === '' ? partial : `${shown} ${partial}`);
        }
      });

      const source = context.createMediaStreamSource(stream);
      // The worklet is a separate module fetched by URL; adding it can fail on an old browser,
      // and that is a missing engine rather than a missing permission.
      try {
        await context.audioWorklet.addModule('/mic-worklet.js');
      } catch {
        stream.getTracks().forEach((t) => {
          t.stop();
        });
        void context.close();
        handlers.onFailure('no-engine');
        return;
      }
      const node = new AudioWorkletNode(context, 'saathi-mic');
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        for (const recognizer of biased ? [biased, unbiased] : [unbiased]) {
          try {
            recognizer.acceptWaveformFloat(event.data, context.sampleRate);
          } catch {
            // A dropped frame is not worth ending the sentence over.
          }
        }
      };
      source.connect(node);
      // Connected so the graph keeps pulling frames. The node writes nothing, so this is silent
      // and cannot echo back into the microphone.
      node.connect(context.destination);

      cleanup = () => {
        node.port.onmessage = null;
        source.disconnect();
        node.disconnect();
        biased?.remove();
        unbiased.remove();
        stream.getTracks().forEach((t) => {
          t.stop();
        });
        void context.close();
      };

      // Nothing here ends on its own: Kaldi keeps listening until told to stop, which is what
      // the रद्द करें button and the stop below are for.
      finish = () => {
        cleanup?.();
        cleanup = null;
        const biasedText = best.trim();
        const plainText = heardWithoutGrammar.trim();
        // Silence is both of them hearing nothing. One of them hearing nothing is a reading, and
        // the caller decides which reading to act on.
        if (biasedText === '' && plainText === '') {
          handlers.onFailure('no-speech');
          return;
        }
        handlers.onFinal({
          transcript: biasedText === '' ? plainText : biasedText,
          source: 'offline-stt',
          latencyMs: Date.now() - started,
          // The unbiased reading, for the caller to fall back to and for the learning loop to
          // keep. Left off when it is the same string or empty, so nothing downstream has to
          // decide whether a duplicate means anything.
          ...(plainText === '' || plainText === biasedText ? {} : { alternatives: [plainText] }),
        });
      };
    };

    let finish: (() => void) | null = null;
    void run();

    return {
      stop: () => {
        stopped = true;
        finish?.();
        finish = null;
      },
      cancel: () => {
        stopped = true;
        finish = null;
        cleanup?.();
        cleanup = null;
      },
    };
  },
};

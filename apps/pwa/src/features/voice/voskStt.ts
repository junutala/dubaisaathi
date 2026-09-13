import type { SttEngine, SttHandlers, SttSession } from './stt.js';

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
export const VOSK_MODEL_URL = '/models/vosk-hi.tar.gz';

/** Named so a later model can be added without evicting this one mid-trip. */
const MODEL_CACHE = 'saathi-speech-v1';

/** Reported with every `VoiceEvent`, so a model regression is visible in the data. */
export const VOSK_ENGINE_ID = 'vosk-hi-0.22';

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
export async function downloadVoskModel(onProgress: (fraction: number) => void): Promise<boolean> {
  try {
    const response = await fetch(VOSK_MODEL_URL);
    if (!response.ok || !response.body) return false;

    // Content-Length lets the traveller watch a real bar rather than a spinner that lies.
    const total = Number(response.headers.get('content-length') ?? 0);
    const chunks: Uint8Array[] = [];
    let received = 0;
    const reader = response.body.getReader();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
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

/** Frees the space again. The traveller's phone, the traveller's call. */
export async function removeVoskModel(): Promise<void> {
  if (!('caches' in window)) return;
  await caches.delete(MODEL_CACHE);
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
      const recognizer = new model.KaldiRecognizer(context.sampleRate);
      let best = '';

      recognizer.on('result', (message) => {
        if ('result' in message && 'text' in message.result) {
          const text = message.result.text.trim();
          if (text !== '') best = best === '' ? text : `${best} ${text}`;
        }
      });
      recognizer.on('partialresult', (message) => {
        if ('result' in message && 'partial' in message.result) {
          const partial = message.result.partial.trim();
          handlers.onPartial(best === '' ? partial : `${best} ${partial}`);
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
        try {
          recognizer.acceptWaveformFloat(event.data, context.sampleRate);
        } catch {
          // A dropped frame is not worth ending the sentence over.
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
        recognizer.remove();
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
        if (best.trim() === '') {
          handlers.onFailure('no-speech');
          return;
        }
        handlers.onFinal({
          transcript: best.trim(),
          source: 'offline-stt',
          latencyMs: Date.now() - started,
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

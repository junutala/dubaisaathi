import type { SpeechResult } from '@saathi/shared';
import type { SttEngine, SttHandlers, SttSession } from './stt.js';
import { concat, heardAnything, resample, WHISPER_RATE } from './resample.js';

/**
 * Offline Hindi speech, with Whisper running in the browser.
 *
 * Replaces Vosk on the owner's decision. Vosk got ordinary sentences roughly right and proper
 * nouns wrong — "Mall of the Emirates" came back as "माला एमरेट्स" — and place names are most of
 * what this product has to hear. Whisper is a different architecture trained on far more data,
 * and at int8 it is *smaller* than the 42 MB Vosk model it replaces.
 *
 * **It is batch, not streaming.** Vosk fed the recogniser as the traveller spoke and could show
 * partial words; Whisper transcribes an utterance once it is finished. So there are no interim
 * results, and the screen says it is listening rather than pretending to hear — which is the
 * honest version of what was happening anyway.
 *
 * **Everything is served from our own origin.** `allowRemoteModels` is off, so the library can
 * never reach for a CDN: a traveller in a Dubai basement must not depend on Hugging Face being
 * up, and the CSP is `self`. The Dockerfile puts the files under /models/whisper/ at build time,
 * the same arrangement the Vosk model used and the OCR data uses.
 */

const MODEL_ID = 'whisper-tiny';
const ENGINE_ID = 'whisper-tiny-q8';
/** Where the Dockerfile puts the model. Trailing slash matters to the library. */
const LOCAL_MODELS = '/models/';

/** Hindi, because that is what the product hears. Whisper needs telling; it will not guess well. */
const LANGUAGE = 'hindi';

/** The library's pipeline, as this file uses it. Its own types resolve to `any`. */
type Transcribe = (audio: Float32Array, options: object) => Promise<unknown>;

let loading: Promise<Transcribe> | null = null;

/**
 * The transcript out of whatever the pipeline returned, checked rather than assumed.
 *
 * It answers with one result, or an array of them when the audio was long enough to be chunked,
 * and the library's own types are `any` either way. So the shape is verified here at the one
 * point it is touched: anything unexpected becomes an empty string, which the caller already
 * treats as "nothing was heard" — never a crash on a screen someone is speaking into.
 */
export function textFrom(out: unknown): string {
  const one: unknown = Array.isArray(out) ? out[0] : out;
  if (typeof one !== 'object' || one === null || !('text' in one)) return '';
  const text: unknown = (one as { text?: unknown }).text;
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * Loads the model once and keeps it.
 *
 * Unpacking takes seconds on a cheap phone, and a traveller who taps the mic twice must not pay
 * for it twice. The import is inside the function so the library is not in the first paint: a
 * phone that never speaks should never download the runtime.
 */
async function transcriber(): Promise<Transcribe> {
  loading ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = LOCAL_MODELS;
    // WASM only. WebGPU is faster where it exists and absent on most of the phones this is for,
    // and a second code path that only some travellers take is a second path nobody tests.
    // Optional in the library's own types, so it is set only when present rather than asserted.
    if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = '/models/ort/';
    const built: unknown = await pipeline('automatic-speech-recognition', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
    });
    if (typeof built !== 'function') throw new Error('the speech pipeline did not build');
    // One cast, at a genuine external boundary whose own types are `any` (CLAUDE.md, code
    // quality gates). What comes back out of it is checked by `textFrom`, not trusted.
    return built as Transcribe;
  })();
  return loading;
}

/** True when the phone could run this at all — the model still has to be downloaded. */
function canRun(): boolean {
  return typeof AudioContext !== 'undefined' && typeof WebAssembly !== 'undefined';
}

export const whisperStt: SttEngine = {
  id: ENGINE_ID,
  source: 'offline-stt',
  worksOffline: true,
  available: canRun,

  listen(handlers: SttHandlers): SttSession {
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    const chunks: Float32Array[] = [];
    let finished = false;

    const shutDown = () => {
      for (const track of stream?.getTracks() ?? []) track.stop();
      void context?.close();
      stream = null;
      context = null;
    };

    const run = async () => {
      handlers.onPreparing?.();
      try {
        // The model first, then the microphone. Asking for the mic and then making somebody wait
        // through a model unpack is how a traveller speaks into a recogniser that is not listening.
        const transcribe = await transcriber();
        if (finished) return;

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        context = new AudioContext();
        await context.audioWorklet.addModule('/mic-worklet.js');
        const source = context.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(context, 'mic-worklet');
        node.port.onmessage = (event: MessageEvent<Float32Array>) => {
          chunks.push(new Float32Array(event.data));
        };
        source.connect(node);

        // Listening for real now, so the screen may say so.
        handlers.onPartial('');

        // `stop()` resolves this: the traveller says when they have finished, which is the one
        // control the microphone screen was missing entirely at one point.
        await new Promise<void>((done) => {
          stopListening = done;
        });

        const rate = context.sampleRate;
        shutDown();
        const audio = resample(concat(chunks), rate, WHISPER_RATE);

        if (!heardAnything(audio)) {
          handlers.onFailure('no-speech');
          return;
        }

        const heard = textFrom(await transcribe(audio, { language: LANGUAGE, task: 'transcribe' }));
        if (heard === '') {
          handlers.onFailure('no-speech');
          return;
        }
        const result: SpeechResult = { transcript: heard, source: 'offline-stt' };
        handlers.onFinal(result);
      } catch (error) {
        shutDown();
        if (finished) return;
        // The phone's own answer, never our guess at it: a refused permission and a missing model
        // are different problems with different ways forward.
        const name = error instanceof Error ? error.name : '';
        handlers.onFailure(name === 'NotAllowedError' ? 'no-permission' : 'failed');
      }
    };

    let stopListening: (() => void) | null = null;
    void run();

    return {
      stop: () => {
        stopListening?.();
      },
      cancel: () => {
        finished = true;
        shutDown();
        stopListening?.();
      },
    };
  },
};

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
 * up, and the CSP is `self`. The Dockerfile puts the files under /models/whisper-tiny/ at build
 * time and writes a manifest beside them; `whisperModel.ts` is what puts them on the phone.
 */

const MODEL_ID = 'whisper-tiny';
const ENGINE_ID = 'whisper-tiny-q8';
/** Where the Dockerfile puts the model. Trailing slash matters to the library. */
const LOCAL_MODELS = '/models/';

/**
 * The processor's name, as `public/mic-worklet.js` registers it — not the file it lives in.
 *
 * These were two different strings and the mismatch cost a test on a real phone. Asking a context
 * for a processor it has never registered throws `InvalidStateError`, several seconds after the
 * model has loaded and the microphone has been granted, so it read as "the model is broken" when
 * the model was fine. The file is `mic-worklet.js`; the processor inside it is `saathi-mic`.
 */
export const WORKLET_NAME = 'saathi-mic';

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
    /**
     * WASM only, and the exact runtime rather than a directory to pick from.
     *
     * WebGPU is faster where it exists and absent on most of the phones this is for, and a second
     * code path that only some travellers take is a second path nobody tests.
     *
     * onnxruntime-web ships four WebAssembly builds and chooses between them by what the browser
     * supports. A prefix would let it choose, and then the file a traveller pre-downloaded for
     * offline use might not be the file it asks for in a basement — the failure would be "the
     * voice does not work offline", months from the decision that caused it. The library's
     * default entry is the bundled jsep build, so that is the one pinned here, the one the image
     * manifest lists, and therefore the one on the phone. Optional in the library's own types,
     * so it is set only when present rather than asserted.
     */
    if (env.backends.onnx.wasm) {
      /**
       * One thread, stated rather than detected.
       *
       * The runtime we serve is the multi-threaded build, and multi-threaded WebAssembly needs
       * `SharedArrayBuffer`, which a page only gets when it is cross-origin isolated — COOP and
       * COEP headers we do not send and should not start sending, because `require-corp` would
       * break every image and font on the page for a feature a phone barely benefits from.
       * onnxruntime is supposed to notice and fall back to one thread; on a phone that refuses
       * to spin up a worker it can instead fail while starting, which is what this looks like.
       * Saying "one thread" up front removes the question.
       */
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.wasmPaths = {
        wasm: '/models/ort/ort-wasm-simd-threaded.jsep.wasm',
        mjs: '/models/ort/ort-wasm-simd-threaded.jsep.mjs',
      };
    }
    const built: unknown = await pipeline('automatic-speech-recognition', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
      /**
       * Basic graph optimisation, because the extended level is what refused to load the model
       * on a real phone:
       *
       *   Can't create a session. qdq_actions.cc:137 TransposeDQWeightsForMatMulNBits
       *   Missing required scale: model.decoder.embed_tokens.weight_merged_0_scale
       *
       * That pass rewrites a quantized weight into a MatMulNBits kernel and wants an initializer
       * these graphs do not carry. It is an optimisation — the model runs without it, a little
       * slower — so declining it costs a fraction of a second on a sentence and is the
       * difference between a microphone that works offline and one that does not.
       */
      session_options: { graphOptimizationLevel: 'basic' },
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
        const node = new AudioWorkletNode(context, WORKLET_NAME);
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
        const said = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        handlers.onFailure(name === 'NotAllowedError' ? 'no-permission' : 'failed', said);
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

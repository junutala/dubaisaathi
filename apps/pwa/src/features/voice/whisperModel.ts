import { MODEL_CACHE, type ModelState } from './modelCache.js';

/**
 * Getting Whisper onto the phone, and knowing whether it is already there.
 *
 * Vosk was one tarball, so its download was one fetch. Whisper is a handful of files — the
 * quantized encoder and decoder, the tokenizer, the feature extractor's settings, and the ONNX
 * runtime's WebAssembly — and the list is not written here. It is written by the build, from
 * what the build actually fetched, and served as a manifest.
 *
 * That is deliberate. A list maintained in this file would be a second copy of a decision made in
 * the Dockerfile, and the two would drift the first time Hugging Face renamed something: the app
 * would report the voice ready while one file was missing, and the traveller would find out in a
 * taxi. There is one list, it is generated, and if it is wrong the download fails here rather
 * than the recogniser failing there.
 */

const MANIFEST_URL = '/models/voice-manifest.json';

interface VoiceFile {
  readonly path: string;
  readonly bytes: number;
}

export interface VoiceManifest {
  readonly files: readonly VoiceFile[];
  readonly totalBytes: number;
}

/** Parsed rather than trusted: this is a fetched document, and a captive portal can answer it. */
export function manifestFrom(body: unknown): VoiceManifest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { files, totalBytes } = body as { files?: unknown; totalBytes?: unknown };
  if (!Array.isArray(files) || files.length === 0) return null;
  if (typeof totalBytes !== 'number' || totalBytes <= 0) return null;
  const parsed: VoiceFile[] = [];
  for (const entry of files) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { path, bytes } = entry as { path?: unknown; bytes?: unknown };
    if (typeof path !== 'string' || !path.startsWith('/models/')) return null;
    if (typeof bytes !== 'number' || bytes <= 0) return null;
    parsed.push({ path, bytes });
  }
  return { files: parsed, totalBytes };
}

let manifest: Promise<VoiceManifest | null> | null = null;

/**
 * The manifest, fetched once. Cached in the model cache on the way past, so a phone that has the
 * voice can still answer "what does the voice consist of" with the radio off.
 */
export async function voiceManifest(): Promise<VoiceManifest | null> {
  manifest ??= (async () => {
    try {
      const cache = 'caches' in window ? await caches.open(MODEL_CACHE) : null;
      const kept = await cache?.match(MANIFEST_URL);
      if (kept) return manifestFrom(await kept.json());
      const answer = await fetch(MANIFEST_URL);
      if (!answer.ok) return null;
      const parsed = manifestFrom(await answer.clone().json());
      if (parsed !== null) await cache?.put(MANIFEST_URL, answer);
      return parsed;
    } catch {
      // No signal and nothing cached. The caller reports 'unavailable', which is the truth.
      return null;
    }
  })();
  return manifest;
}

/** What the traveller is being asked to download, in whole megabytes. `null` until it is known. */
export async function voiceSizeMb(): Promise<number | null> {
  const list = await voiceManifest();
  return list === null ? null : Math.round(list.totalBytes / 1_048_576);
}

/**
 * Whether the voice is already on this phone.
 *
 * Every file, not the first one. A download abandoned halfway leaves some of them cached, and
 * "the encoder is here so the voice is ready" is exactly the kind of half-truth that becomes a
 * failure at a taxi door rather than on wifi.
 */
export async function whisperModelState(online: boolean): Promise<ModelState> {
  if (!('caches' in window) || typeof WebAssembly === 'undefined') return 'unavailable';
  try {
    const list = await voiceManifest();
    if (list === null) return 'unavailable';
    const cache = await caches.open(MODEL_CACHE);
    for (const file of list.files) {
      if (!(await cache.match(file.path))) return online ? 'fetchable' : 'unavailable';
    }
    return 'cached';
  } catch {
    return 'unavailable';
  }
}

/**
 * Fetches every file into the cache, reporting a real fraction as it goes.
 *
 * Progress is by bytes rather than by file, because the files differ by two orders of magnitude:
 * counting them would show a bar that jumps to 80% and then sits still through the only download
 * that takes any time. The manifest carries each size, so the bar can tell the truth.
 */
export async function downloadWhisperModel(
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const list = await voiceManifest();
    if (list === null) return false;
    const cache = await caches.open(MODEL_CACHE);
    let done = 0;

    for (const file of list.files) {
      if (signal?.aborted) return false;
      if (await cache.match(file.path)) {
        done += file.bytes;
        onProgress(done / list.totalBytes);
        continue;
      }

      const answer = await fetch(file.path, signal ? { signal } : {});
      if (!answer.ok) return false;

      /**
       * It must be the file, not a page about the file. A navigation fallback, a captive portal
       * or a 404 handler all answer 200 with a body, and caching one stores something that will
       * never load — in a cache with no expiry, which the traveller would then have to be told
       * how to clear. The Vosk download checked two magic bytes for the same reason; here the
       * check is the type, because these are several formats and every one of them is a type
       * this origin sets deliberately.
       */
      const type = answer.headers.get('content-type') ?? '';
      if (type.includes('text/html')) return false;

      await cache.put(file.path, answer.clone());
      done += file.bytes;
      onProgress(done / list.totalBytes);
    }

    onProgress(1);
    return true;
  } catch {
    return false;
  }
}

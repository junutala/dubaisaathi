import { MODEL_CACHE, type ModelState } from './modelCache.js';
import { BUILD } from '../../app/version.js';

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
  /** Names this exact set of files; changes when the model does and at no other time. */
  readonly version: string;
  readonly files: readonly VoiceFile[];
  readonly totalBytes: number;
}

/**
 * The URL to ask the network for — not the URL the file is kept under.
 *
 * Our own service worker answers everything beneath /models/ from the cache first, which is
 * exactly right for a 68 MB download a traveller is relying on and exactly wrong for finding out
 * that it has been replaced. It answers before the network is consulted, so a plain fetch here
 * returned the old manifest and the old bytes, the two agreed with each other, and the app
 * reported a voice that could not start. `cache: 'no-store'` does not help: a service worker
 * runs in front of that flag, not behind it.
 *
 * A query the worker has never seen is a key it has nothing cached for, so the request reaches
 * the server. What comes back is then stored under the plain path, because that is what
 * transformers.js asks for and it must find it there with the radio off.
 */
function askFor(path: string, version: string): string {
  return `${path}?v=${encodeURIComponent(version)}`;
}

/** Parsed rather than trusted: this is a fetched document, and a captive portal can answer it. */
export function manifestFrom(body: unknown): VoiceManifest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { files, totalBytes } = body as { files?: unknown; totalBytes?: unknown };
  if (!Array.isArray(files) || files.length === 0) return null;
  if (typeof totalBytes !== 'number' || totalBytes <= 0) return null;
  const { version } = body as { version?: unknown };
  if (typeof version !== 'string' || version === '') return null;
  const parsed: VoiceFile[] = [];
  for (const entry of files) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { path, bytes } = entry as { path?: unknown; bytes?: unknown };
    if (typeof path !== 'string' || !path.startsWith('/models/')) return null;
    if (typeof bytes !== 'number' || bytes <= 0) return null;
    parsed.push({ path, bytes });
  }
  return { version, files: parsed, totalBytes };
}

/**
 * What the phone last finished downloading, and what it is part-way through.
 *
 * The paths do not change when the model does, so something has to say which model these bytes
 * are. The first attempt compared each file's `content-length` against the size in the manifest,
 * which was wrong in a way that only a phone could show: nginx gzips `application/json`, so the
 * length of a served config file is its compressed length and never the manifest's number. Every
 * JSON file therefore looked stale, a complete 102 MB download reported itself unfinished, and
 * offline the app told its owner his phone could not recognise Hindi while the model sat on it.
 *
 * A version written down after the last file lands says the same thing and cannot be confused by
 * an encoding. The second marker is what makes a download resumable: a traveller on hotel wifi
 * who loses it at 80 MB should not start again, so files already fetched for *this* version are
 * kept, and files fetched for an older one are not.
 */
const INSTALLED_URL = '/models/installed-version';
const FETCHING_URL = '/models/fetching-version';

async function versionAt(cache: Cache, url: string): Promise<string | null> {
  const kept = await cache.match(url);
  return kept ? (await kept.text()).trim() : null;
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
      // The network first, when there is one. A cached manifest describes the build a phone
      // last spoke to, and the whole point of this document is to notice when that has moved.
      if (navigator.onLine) {
        try {
          // Qualified by the build, so a deployment is what makes this document be read again
          // rather than a timer or a guess. It is under two kilobytes.
          const answer = await fetch(`${MANIFEST_URL}?b=${encodeURIComponent(BUILD)}`);
          if (answer.ok) {
            const parsed = manifestFrom(await answer.clone().json());
            if (parsed !== null) {
              await cache?.put(MANIFEST_URL, answer);
              return parsed;
            }
          }
        } catch {
          // Online by the browser's reckoning and not in fact. The cached copy below is the
          // answer, and it is the right one for a traveller who already has the voice.
        }
      }
      const kept = await cache?.match(MANIFEST_URL);
      if (kept) return manifestFrom(await kept.json());
      return null;
    } catch {
      // No signal and nothing cached. The caller reports 'unavailable', which is the truth.
      return null;
    }
  })();
  return manifest;
}

/**
 * Which model is on this phone, read out of the manifest rather than written down here.
 *
 * The build fetches whatever `WHISPER_REPO` names and puts it in a directory of the repository's
 * own name, so the served paths say which model it is. transformers.js needs that name to find
 * the files; hardcoding it here would be the same string in two places, which is exactly the
 * shape of the worklet-name bug — `saathi-mic` in one file, `mic-worklet` in the other, and a
 * test on a real phone spent finding out.
 *
 * `null` when the manifest names no single model directory, which the caller reports as a voice
 * that cannot run rather than guessing at a name.
 */
export async function voiceModelId(): Promise<string | null> {
  const list = await voiceManifest();
  if (list === null) return null;
  const directories = new Set(
    list.files
      .map((file) => file.path.slice('/models/'.length).split('/')[0])
      .filter((name): name is string => name !== undefined && name !== 'ort'),
  );
  const [only] = [...directories];
  return directories.size === 1 && only !== undefined ? only : null;
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
    // The version first: it is one read, and it is the question. Only then whether every file of
    // it is actually here, because a download abandoned halfway leaves some of them.
    if ((await versionAt(cache, INSTALLED_URL)) !== list.version) {
      return online ? 'fetchable' : 'unavailable';
    }
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
    // Files already fetched for this same version are kept; files left by an older one are not,
    // because they sit at exactly these paths and are not these bytes.
    const resuming = (await versionAt(cache, FETCHING_URL)) === list.version;
    await cache.put(FETCHING_URL, new Response(list.version));
    let done = 0;

    for (const file of list.files) {
      if (signal?.aborted) return false;
      const kept = resuming ? await cache.match(file.path) : undefined;
      if (kept) {
        done += file.bytes;
        onProgress(done / list.totalBytes);
        continue;
      }

      const answer = await fetch(askFor(file.path, list.version), signal ? { signal } : {});
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

    // Last, and only now: before this line the download was incomplete, and a marker written
    // any earlier would have claimed a voice the phone does not have.
    await cache.put(INSTALLED_URL, new Response(list.version));
    await cache.delete(FETCHING_URL);
    await forgetWhatIsNoLongerNeeded(cache, list);
    onProgress(1);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes anything under /models/ that this build does not list.
 *
 * Swapping the model left one file behind that nothing will ever ask for again. On its own that
 * is a few kilobytes; as a habit it is a cache with no expiry filling up with the leavings of
 * every model this app has ever shipped, on a phone whose owner cannot see it and cannot clear
 * it without clearing everything.
 *
 * Only ever after a complete download, and only files this build has replaced — never a file a
 * traveller is still relying on.
 */
async function forgetWhatIsNoLongerNeeded(cache: Cache, list: VoiceManifest): Promise<void> {
  const needed = new Set<string>([
    MANIFEST_URL,
    INSTALLED_URL,
    ...list.files.map((file) => file.path),
  ]);
  for (const request of await cache.keys()) {
    const asked = new URL(request.url);
    // Compared with the query, not without it: the service worker keeps its own copy of every
    // cache-busted request we made, which is a second 68 MB of the same files. Those are the
    // main thing this clears, along with anything an older model left behind.
    if (!asked.pathname.startsWith('/models/')) continue;
    if (asked.search !== '' || !needed.has(asked.pathname)) await cache.delete(request);
  }
}

/**
 * Forgets the downloaded voice, so it can be fetched again.
 *
 * For the case the owner hit: the files are all present and correctly sized, so the app says the
 * voice is ready, and the runtime refuses to build a session out of them. There was no way out of
 * that from inside the app — no offer, because nothing was missing — short of clearing every bit
 * of site data and losing the hotel and the documents with it.
 *
 * Deliberately narrow. This runs when the recogniser has refused these exact bytes, never on a
 * refused microphone or a quiet room, because 68 MB is a real thing to ask of somebody twice.
 */
export async function forgetVoice(): Promise<void> {
  manifest = null;
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(MODEL_CACHE);
    for (const request of await cache.keys()) {
      if (new URL(request.url).pathname.startsWith('/models/')) await cache.delete(request);
    }
  } catch {
    // Nothing to be done from here. The traveller still has the keyboard, and online still works.
  }
}

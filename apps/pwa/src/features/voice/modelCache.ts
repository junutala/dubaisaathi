/**
 * The name of the cache the offline voice model lives in.
 *
 * It is here, in its own file, because two things have to agree on it and they are not near each
 * other: the service worker configuration in `vite.config.ts`, and `whisperModel.ts`, which
 * writes the download into it by hand. They once disagreed by sharing a name with a cache that
 * had an eviction policy, and a traveller's 42 MB download was deleted by our next release. One
 * definition, imported twice, so that cannot happen by editing one of them.
 */
export const MODEL_CACHE = 'saathi-model-v1';

/**
 * Whether the offline voice is on this phone, could be fetched, or is out of reach.
 *
 * It lived in `voskStt.ts` because Vosk was the only engine that had one. It sits beside the
 * cache now, which outlives any particular engine.
 */
export type ModelState = 'cached' | 'fetchable' | 'unavailable';

/** Where the Vosk model was kept, in this cache and in the one before it. */
const VOSK_LEFTOVERS = { url: '/models/vosk-hi.tar.gz', caches: [MODEL_CACHE, 'saathi-speech-v1'] };

/**
 * Gives a phone back the 42 MB Vosk left behind.
 *
 * Normally a release never takes something away from a phone — a traveller's download is theirs
 * until they delete it, and this project has the scar to prove it. This is the one shape that is
 * not that: nothing can load these bytes any more. The engine that read them is deleted, the
 * archive is no longer served, and what is left is 42 MB of a file with no reader, sitting in a
 * cache with no expiry on a phone whose owner has no way to find it. Removing something unusable
 * is not the same as removing something someone is using.
 *
 * Silent and best-effort: it runs at launch, it never blocks anything, and a browser that
 * refuses simply keeps the bytes.
 */
export async function forgetVosk(): Promise<void> {
  if (!('caches' in globalThis)) return;
  for (const name of VOSK_LEFTOVERS.caches) {
    try {
      if (!(await caches.has(name))) continue;
      const cache = await caches.open(name);
      await cache.delete(VOSK_LEFTOVERS.url);
    } catch {
      // A cache we cannot open is a cache we cannot tidy. It costs storage, not correctness.
    }
  }
}

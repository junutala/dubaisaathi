/**
 * The name of the cache the offline voice model lives in.
 *
 * It is here, in its own file, because two things have to agree on it and they are not near each
 * other: the service worker configuration in `vite.config.ts`, and `voskStt.ts`, which writes the
 * download into it by hand. They once disagreed by sharing a name with a cache that had an
 * eviction policy, and a traveller's 42 MB download was deleted by our next release. One
 * definition, imported twice, so that cannot happen by editing one of them.
 */
export const MODEL_CACHE = 'saathi-model-v1';

/**
 * Caches the model may be found in, newest first.
 *
 * A phone that downloaded the voice before the cache was split still has it under the old name,
 * and asking somebody to fetch 42 MB again because we reorganised our storage is not something
 * this product gets to do. Found in an old cache, it is moved into the new one and the phone never
 * notices.
 */
export const LEGACY_MODEL_CACHES = ['saathi-speech-v1'];

/**
 * Whether the offline voice is on this phone, could be fetched, or is out of reach.
 *
 * It lived in `voskStt.ts` because Vosk was the only engine that had one. Two engines now answer
 * this question and neither owns the vocabulary, so it sits beside the cache they both write to.
 */
export type ModelState = 'cached' | 'fetchable' | 'unavailable';

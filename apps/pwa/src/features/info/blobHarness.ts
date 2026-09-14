/**
 * Used by this feature's tests only; nothing in the app imports it.
 *
 * A photograph is stored as a `Blob` (decision 003), and `fake-indexeddb` copies every value
 * it stores with the platform's `structuredClone` — which does not know jsdom's Blob and
 * quietly replaces it with an empty object. The bytes are gone, and every assertion about
 * names, dates and counts still passes: a harness that photographs a passport, stores
 * nothing, and reports success. That is the exact failure CLAUDE.md warns about, and it is
 * the reason this file exists rather than the tests working around it.
 *
 * A real IndexedDB keeps the bytes, so the harness is corrected to keep them too: everything
 * else is copied as before, and a Blob is carried across by reference. Nothing in the app
 * mutates a stored photograph, so sharing the instance cannot hide a bug the browser would
 * have.
 */
export function cloneKeepingBlobs(value: unknown): unknown {
  if (value instanceof Blob) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return (value as readonly unknown[]).map(cloneKeepingBlobs);
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = cloneKeepingBlobs(item);
    return copy;
  }
  return value;
}

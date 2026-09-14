/**
 * Used by this app's tests only; nothing in the app imports it.
 *
 * `fake-indexeddb` copies every stored value with the platform's `structuredClone`, which does
 * not know jsdom's Blob and quietly replaces it with an empty object. The photographs are then
 * gone while every assertion about names, counts and status still passes — a harness that
 * records a visit, stores no evidence of it, and reports success.
 *
 * The traveller app hit exactly this on 14 September and the same fix is the right one here: a
 * real IndexedDB keeps the bytes, so the harness is corrected to keep them too. Nothing mutates
 * a stored photograph, so carrying the instance by reference cannot hide a bug a browser would
 * have had.
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

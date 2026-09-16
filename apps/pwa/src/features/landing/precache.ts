/**
 * How far the offline pack has come down, measured rather than drawn.
 *
 * The pack is the app itself: the service worker precaches every screen, the fonts and the
 * content on install. Workbox does not report progress to the page, so the page reads it
 * directly — the precache manifest out of the worker's own script for the total, and the
 * precache cache for how many of those files have landed. On a phone that installed earlier
 * both numbers are equal at once, and the landing says ready without pretending to download.
 */
export interface PackProgress {
  readonly cached: number;
  readonly total: number;
}

/** The number of files the worker will precache, read out of its script. `null` offline. */
export async function precacheTotal(): Promise<number | null> {
  try {
    const script = await fetch('/sw.js', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : ''));
    // The manifest is minified inside the worker: `{revision:"…",url:"index.html"}`, keys
    // unquoted. Match the key either way, so a build setting cannot silently zero the total.
    // Counted once each: the worker's own code names a few of the same files again outside the
    // manifest, and counting those would leave the bar stuck short of full for ever.
    const entries = new Set([...script.matchAll(/\burl"?:"([^"]+)"/g)].map((m) => m[1]));
    return entries.size === 0 ? null : entries.size;
  } catch {
    return null;
  }
}

/** How many precached files are on the phone right now. */
export async function precacheCached(): Promise<number> {
  if (!('caches' in window)) return 0;
  try {
    const names = (await caches.keys()).filter((name) => name.includes('precache'));
    let count = 0;
    for (const name of names) count += (await (await caches.open(name)).keys()).length;
    return count;
  } catch {
    return 0;
  }
}

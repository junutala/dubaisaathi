/**
 * नक्शा's street map on the phone (decision 035): Dubai out of OpenStreetMap, as one PMTiles
 * archive plus the glyphs and sprites its style names, served from our own origin under
 * `/map/v1/` and kept in a cache of its own once downloaded.
 *
 * Kept for good. A release never takes back something a traveller waited for (CLAUDE.md), so the
 * cache is named in `KEPT_CACHES` (app/updates.ts) and nothing ever deletes it. The path is
 * versioned: a new map is a new name, never an eviction.
 *
 * The archive is written last, after every glyph and sprite, so its presence is the sign that the
 * whole map is on the phone — a download cut off halfway never looks finished.
 */

/** The Cache Storage name. `KEPT_CACHES` in app/updates.ts names it too; change one, change both. */
export const MAP_CACHE = 'saathi-map';
const MAP_BASE = '/map/v1/';
export const ARCHIVE = 'dubai.pmtiles';

interface MapManifest {
  readonly files: readonly string[];
  readonly bytes: number;
}

/** A path under `/map/v1/`, as the one URL both the download and every later read use. */
export function mapUrl(path: string): string {
  // MapLibre may hand a font name already escaped ("Noto%20Sans%20Regular") or not; one spelling
  // for both, so the kept copy is always found under the name it was stored with.
  return new URL(MAP_BASE + encodeURI(decodeURI(path)), window.location.origin).href;
}

async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(MAP_CACHE);
  } catch {
    // A private window or a browser without Cache Storage: the map is simply not kept.
    return null;
  }
}

/** The archive, when the whole map is on this phone. */
export async function archiveOnPhone(): Promise<File | null> {
  const cache = await openCache();
  const hit = await cache?.match(mapUrl(ARCHIVE));
  if (!hit) return null;
  return new File([await hit.blob()], ARCHIVE);
}

/** A glyph or sprite from the phone's copy, or from our server while it has not arrived yet. */
export async function mapFile(path: string, signal: AbortSignal): Promise<Response> {
  const url = mapUrl(path);
  const cache = await openCache();
  const kept = await cache?.match(url);
  if (kept) return kept;
  return fetch(url, { signal });
}

/** How big the download is, in bytes, before anyone is asked to wait for it. */
export async function mapSize(): Promise<number> {
  const manifest = await fetchManifest();
  return manifest.bytes;
}

async function fetchManifest(): Promise<MapManifest> {
  const res = await fetch(mapUrl('files.json'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`files.json answered ${String(res.status)}`);
  const raw: unknown = await res.json();
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('files' in raw) ||
    !('bytes' in raw) ||
    !Array.isArray(raw.files) ||
    typeof raw.bytes !== 'number'
  ) {
    throw new Error('files.json is not a map manifest');
  }
  return {
    files: raw.files.filter((file): file is string => typeof file === 'string'),
    bytes: raw.bytes,
  };
}

export type DownloadResult = { readonly ok: true } | { readonly ok: false; readonly why: string };

/**
 * Every file of the map into the phone's keep-cache, the archive last, reporting bytes as they
 * arrive. A failure says what failed — the screen shows it rather than a spinner that never ends.
 */
export async function downloadMap(
  onProgress: (done: number, total: number) => void,
): Promise<DownloadResult> {
  try {
    const cache = await openCache();
    if (cache === null) return { ok: false, why: 'Cache Storage is not available' };
    const manifest = await fetchManifest();
    const total = manifest.bytes;
    let done = 0;
    onProgress(done, total);
    const ordered = [
      ...manifest.files.filter((file) => file !== ARCHIVE),
      ...manifest.files.filter((file) => file === ARCHIVE),
    ];
    for (const file of ordered) {
      const url = mapUrl(file);
      if (file !== ARCHIVE && (await cache.match(url))) continue;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok || !res.body) return { ok: false, why: `${file}: ${String(res.status)}` };
      const reader = res.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      for (;;) {
        const { done: finished, value } = await reader.read();
        if (finished) break;
        // A copy onto a plain ArrayBuffer, which is what a Blob accepts.
        chunks.push(new Uint8Array(value));
        done += value.byteLength;
        onProgress(Math.min(done, total), total);
      }
      const type = res.headers.get('content-type') ?? 'application/octet-stream';
      await cache.put(
        url,
        new Response(new Blob(chunks, { type }), { headers: { 'content-type': type } }),
      );
    }
    onProgress(total, total);
    return { ok: true };
  } catch (error) {
    return { ok: false, why: error instanceof Error ? error.message : String(error) };
  }
}

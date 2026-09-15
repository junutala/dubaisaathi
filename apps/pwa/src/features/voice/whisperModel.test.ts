import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { manifestFrom } from './whisperModel.js';

/**
 * The download a traveller waits for on hotel wifi before a trip.
 *
 * Two things here have burned this project before and both are asserted rather than assumed.
 *
 * A 200 with a body is not a file. A captive portal, a 404 page and the app's own navigation
 * fallback all answer every request with HTML, and caching one stores something that will never
 * load — in a cache with no expiry, which the traveller would then have to be told how to clear.
 * That is how a "downloaded" voice can be broken on a phone with no way to notice.
 *
 * And a half-download is not a download. The files differ by two orders of magnitude, so a check
 * that finds the tokenizer and reports the voice ready is a check that reports the voice ready
 * while the 30 MB decoder is missing — discovered in a taxi rather than on wifi.
 */

const MANIFEST = {
  files: [
    { path: '/models/whisper-tiny/config.json', bytes: 100 },
    { path: '/models/whisper-tiny/onnx/decoder_model_merged_quantized.onnx', bytes: 900 },
  ],
  totalBytes: 1000,
};

/** A Cache Storage that behaves like the real one for the three methods this module uses. */
function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: (key: string) => Promise.resolve(store.get(key)),
    put: (key: string, value: Response) => {
      store.set(key, value);
      return Promise.resolve();
    },
    keys: () =>
      Promise.resolve([...store.keys()].map((path) => new Request(`https://saathi.test${path}`))),
    delete: (request: Request) => {
      store.delete(new URL(request.url).pathname);
      return Promise.resolve(true);
    },
  };
  vi.stubGlobal('caches', { open: () => Promise.resolve(cache) });
  vi.stubGlobal('navigator', { onLine: true });
  return store;
}

/** A cached file of a stated size — which is how a stale one is told from a current one. */
const sized = (bytes: number) =>
  new Response('x', { status: 200, headers: { 'content-length': String(bytes) } });

const ok = (body: unknown, type = 'application/json') =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': type } });

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading the manifest', () => {
  it('accepts what the build writes', () => {
    expect(manifestFrom(MANIFEST)?.files.length).toBe(2);
  });

  /** Every one of these is something a server can return with a 200. */
  it.each([
    ['not an object', 'hello'],
    ['null', null],
    ['no files', { files: [], totalBytes: 10 }],
    ['no total', { files: MANIFEST.files }],
    ['a zero total', { files: MANIFEST.files, totalBytes: 0 }],
    ['an entry with no size', { files: [{ path: '/models/a.json' }], totalBytes: 10 }],
    // The one that matters most: a path outside /models/ would let a manifest name any URL on
    // the origin and have the app cache it under a cache with no expiry.
    ['a path outside /models/', { files: [{ path: '/index.html', bytes: 5 }], totalBytes: 5 }],
  ])('refuses %s', (_why, body) => {
    expect(manifestFrom(body)).toBeNull();
  });
});

describe('the download', () => {
  it('refuses an HTML page dressed as a model file', async () => {
    fakeCaches();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('voice-manifest.json')
            ? ok(MANIFEST)
            : // A captive portal, or our own SPA fallback answering for a file.
              new Response('<!doctype html><title>Sign in</title>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
              }),
        ),
      ),
    );
    const { downloadWhisperModel } = await import('./whisperModel.js');
    expect(await downloadWhisperModel(() => undefined)).toBe(false);
  });

  it('reports progress by bytes, so the bar does not lie about the big file', async () => {
    fakeCaches();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('voice-manifest.json')
            ? ok(MANIFEST)
            : new Response('x', { status: 200, headers: { 'content-type': 'application/json' } }),
        ),
      ),
    );
    const seen: number[] = [];
    const { downloadWhisperModel } = await import('./whisperModel.js');
    expect(await downloadWhisperModel((f) => seen.push(f))).toBe(true);
    // Counting files would have shown 0.5 after the 100-byte config. Counting bytes shows 0.1.
    expect(seen[0]).toBeCloseTo(0.1);
    expect(seen.at(-1)).toBe(1);
  });
});

describe('whether the voice is on the phone', () => {
  it('is not "cached" when only some of the files are there', async () => {
    const store = fakeCaches();
    store.set('/models/voice-manifest.json', ok(MANIFEST));
    store.set('/models/whisper-tiny/config.json', sized(100));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('no network'))),
    );
    const { whisperModelState } = await import('./whisperModel.js');
    expect(await whisperModelState(true)).toBe('fetchable');
  });

  it('is "cached" only once every file is there', async () => {
    const store = fakeCaches();
    store.set('/models/voice-manifest.json', ok(MANIFEST));
    for (const file of MANIFEST.files) store.set(file.path, sized(file.bytes));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('no network'))),
    );
    const { whisperModelState } = await import('./whisperModel.js');
    expect(await whisperModelState(false)).toBe('cached');
  });

  /** Offline with nothing cached is not "fetchable" — it is out of reach, and says so. */
  it('is "unavailable" offline with nothing on the phone', async () => {
    fakeCaches();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('no network'))),
    );
    const { whisperModelState } = await import('./whisperModel.js');
    expect(await whisperModelState(false)).toBe('unavailable');
  });
});

describe('a model that was replaced under the same file names', () => {
  /**
   * The trap this closes, caught before it cost a second test rather than after.
   *
   * The model repository was swapped because the previous conversion could not be loaded by the
   * runtime at all. The paths did not change. Every phone that had already downloaded the old
   * one still held those bytes under exactly these names, would have reported the voice ready,
   * and would have failed in precisely the same way — with a fix deployed and nothing to show
   * for it.
   */
  it('is not "cached" when a file is there at the wrong size', async () => {
    const store = fakeCaches();
    store.set('/models/voice-manifest.json', ok(MANIFEST));
    store.set('/models/whisper-tiny/config.json', sized(100));
    // The old build's decoder: same path, different bytes.
    store.set('/models/whisper-tiny/onnx/decoder_model_merged_quantized.onnx', sized(900 + 12345));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('no network'))),
    );
    const { whisperModelState } = await import('./whisperModel.js');
    expect(await whisperModelState(true)).toBe('fetchable');
  });

  it('clears out a file this build no longer lists', async () => {
    const store = fakeCaches();
    store.set('/models/voice-manifest.json', ok(MANIFEST));
    // Left behind by the conversion we moved away from.
    store.set('/models/whisper-tiny/normalizer.json', sized(52666));
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('voice-manifest.json')
            ? ok(MANIFEST)
            : new Response('x', {
                status: 200,
                headers: { 'content-type': 'application/json' },
              }),
        ),
      ),
    );
    const { downloadWhisperModel } = await import('./whisperModel.js');
    expect(await downloadWhisperModel(() => undefined)).toBe(true);
    expect(store.has('/models/whisper-tiny/normalizer.json')).toBe(false);
    // ...and keeps everything this build does list.
    for (const file of MANIFEST.files) expect(store.has(file.path)).toBe(true);
  });
});

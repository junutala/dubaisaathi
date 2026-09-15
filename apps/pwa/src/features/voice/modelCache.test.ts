import { describe, expect, it } from 'vitest';
// Read as text at build time rather than through the filesystem: vitest serves test modules over
// http, so no path relative to this module resolves on disk.
import config from '../../../vite.config.ts?raw';
import { MODEL_CACHE } from './modelCache.js';

/**
 * The regression this exists for, and it is the worst one this project has had.
 *
 * The 42 MB voice model shared a cache with the speech runtime chunk, under `maxEntries: 4`. The
 * runtime chunk is named by content, so every deployment added an entry; after four deployments
 * the least recently used was evicted, and the least recently used was always the model, because a
 * traveller touches it only when they speak. Shipping a build therefore deleted a download someone
 * had waited for on hotel wifi — and the app then told them their phone could not recognise Hindi.
 *
 * On 13 September this happened five times in an hour on the owner's own phone. A traveller it
 * happened to would have been in Dubai, on roaming, with no idea why the thing that worked
 * yesterday had stopped.
 *
 * Replacing Vosk with Whisper made it worse rather than better: the download is fifteen files now
 * instead of one, so any entry limit low enough to look tidy would evict most of it mid-trip.
 *
 * So the service worker's configuration is read here as text and checked. It is not TypeScript
 * anyone imports at runtime, no test would otherwise touch it, and a one-word edit in it is enough
 * to do this again.
 */

/** The `runtimeCaching` entry that governs the model, as written in the config. */
function modelCacheRule(): string {
  const start = config.indexOf("url.pathname.startsWith('/models/')");
  expect(start).toBeGreaterThan(-1);
  return config.slice(start, config.indexOf('},\n          {', start) + 1);
}

describe('the cache the downloaded voice lives in', () => {
  it('is one name, defined once, because two files have to agree on it', () => {
    // vite.config.ts imports this same constant. A cache name typed out twice is a cache name
    // that will disagree with itself on the day somebody edits one of them.
    expect(config).toContain("from './src/features/voice/modelCache.js'");
    expect(config).toContain('cacheName: MODEL_CACHE');
    expect(MODEL_CACHE).not.toBe('');
  });

  it('has no expiry policy at all', () => {
    // Not a bigger limit — none. One file, named by content, downloaded on purpose. There is no
    // number of entries at which deleting it is the right thing to do.
    expect(modelCacheRule()).not.toContain('expiration');
    expect(modelCacheRule()).not.toContain('maxEntries');
  });

  it('never limits how many entries it holds, because the voice is many files', () => {
    // One file could survive a generous limit by luck. Fifteen cannot, and the encoder surviving
    // while the decoder is evicted is a voice that reports itself present and does not work.
    expect(modelCacheRule()).not.toContain('maxAgeSeconds');
    expect(modelCacheRule()).not.toContain('purgeOnQuotaError');
  });
});

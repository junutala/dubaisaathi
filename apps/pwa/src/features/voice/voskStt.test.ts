import { afterEach, describe, expect, it, vi } from 'vitest';
import { voskModelState } from './voskStt.js';

/**
 * The bug this guards against: the download was only offered once every engine had failed, so
 * online — where the cloud recogniser succeeds — it was offered to nobody, and offline it was
 * reported unavailable. Reachable in neither state.
 */

/** Only its presence is checked, never constructed — a function stands in fine. */
const workerStub = function Worker() {
  // never called
};

function stubCaches(hasModel: boolean) {
  vi.stubGlobal('caches', {
    open: () =>
      Promise.resolve({
        match: () => Promise.resolve(hasModel ? new Response('x') : undefined),
      }),
  });
  vi.stubGlobal('Worker', workerStub);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('voskModelState', () => {
  it('is cached once the model is on the phone, network or not', async () => {
    stubCaches(true);
    await expect(voskModelState(true)).resolves.toBe('cached');
    await expect(voskModelState(false)).resolves.toBe('cached');
  });

  it('is fetchable when it is missing and there is a network', async () => {
    stubCaches(false);
    await expect(voskModelState(true)).resolves.toBe('fetchable');
  });

  it('is unavailable when it is missing and there is no network', async () => {
    stubCaches(false);
    await expect(voskModelState(false)).resolves.toBe('unavailable');
  });

  it('is unavailable where the browser has no cache storage to keep it in', async () => {
    vi.stubGlobal('Worker', workerStub);
    Reflect.deleteProperty(window, 'caches');
    await expect(voskModelState(true)).resolves.toBe('unavailable');
  });
});

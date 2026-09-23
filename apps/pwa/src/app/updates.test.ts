import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyPendingUpdate, latestBuild, repairToLatest, watchForUpdate } from './updates.js';

/**
 * The rule being tested is the product decision, not the plumbing: an update downloaded in an
 * earlier session is applied at this launch, and one that arrives mid-session is not.
 */

interface Fake {
  readonly waiting: { postMessage: ReturnType<typeof vi.fn> } | null;
  readonly controller: object | null;
}

function stubServiceWorker({ waiting, controller }: Fake) {
  const listeners: (() => void)[] = [];
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller,
      getRegistration: () => Promise.resolve({ waiting }),
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    },
  });
  // The handover event the real browser fires once the new worker takes over.
  return () => {
    listeners.forEach((fn) => {
      fn();
    });
  };
}

const reload = vi.fn();

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  reload.mockClear();
  restoreLocation();
  vi.unstubAllGlobals();
});

// jsdom makes location.reload non-configurable, so the whole object is swapped for the test and
// put back afterwards. Only the three members this module could touch are provided; building it
// by hand rather than spreading the real Location keeps a class instance out of a plain object.
const realLocation = Object.getOwnPropertyDescriptor(window, 'location');

function stubReload() {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'http://localhost/', hash: '', reload },
  });
}

function restoreLocation() {
  if (realLocation) Object.defineProperty(window, 'location', realLocation);
}

describe('applyPendingUpdate', () => {
  it('applies a build that was waiting from an earlier session', async () => {
    const postMessage = vi.fn();
    const handover = stubServiceWorker({ waiting: { postMessage }, controller: {} });
    stubReload();
    const done = applyPendingUpdate();
    // Wait until the module has actually asked the worker to step aside before firing the
    // browser's handover event — otherwise the listener is not attached yet, the event is
    // missed, and the test passes on the timeout instead of on the path being tested.
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
    handover();
    await expect(done).resolves.toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing when no build is waiting', async () => {
    stubServiceWorker({ waiting: null, controller: {} });
    stubReload();
    await expect(applyPendingUpdate()).resolves.toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload on a first install, when there is no old build to replace', async () => {
    const postMessage = vi.fn();
    stubServiceWorker({ waiting: { postMessage }, controller: null });
    stubReload();
    await expect(applyPendingUpdate()).resolves.toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('applies once per tab session, so a stuck worker cannot loop the app', async () => {
    const postMessage = vi.fn();
    const handover = stubServiceWorker({ waiting: { postMessage }, controller: {} });
    stubReload();
    const first = applyPendingUpdate();
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalled();
    });
    handover();
    await first;
    await expect(applyPendingUpdate()).resolves.toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('is a no-op where service workers do not exist', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
    stubReload();
    await expect(applyPendingUpdate()).resolves.toBe(false);
  });
});

/**
 * The defect this covers was found on a phone, not here: the owner's Android downloaded the new
 * build in full — the http log shows the worker fetching `index.html`, the stylesheet and a
 * 452 KB bundle — and the app went on showing the build before it, because nothing asked again
 * after the first paint while he sat on घर.
 */
describe('watchForUpdate', () => {
  /** A registration whose `updatefound` and worker `statechange` can be fired by the test. */
  function stubRegistration({
    waiting = null,
    controller = {},
  }: {
    waiting?: object | null;
    controller?: object | null;
  } = {}) {
    const worker = { state: 'installing', listeners: [] as (() => void)[] };
    const installing = {
      get state() {
        return worker.state;
      },
      addEventListener: (_: string, fn: () => void) => worker.listeners.push(fn),
    };
    const found: (() => void)[] = [];
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller,
        getRegistration: () =>
          Promise.resolve({
            waiting,
            installing,
            addEventListener: (name: string, fn: () => void) => {
              if (name === 'updatefound') found.push(fn);
            },
            removeEventListener: () => undefined,
          }),
      },
    });
    return {
      /** The browser finding a new build, and that build finishing its download. */
      download: () => {
        found.forEach((fn) => {
          fn();
        });
        worker.state = 'installed';
        worker.listeners.forEach((fn) => {
          fn();
        });
      },
    };
  }

  it('says so when a build finishes downloading while the app is open', async () => {
    const arrived = vi.fn();
    const sw = stubRegistration();
    const stop = watchForUpdate(arrived);
    await vi.waitFor(() => {
      expect(navigator.serviceWorker).toBeDefined();
    });
    // Let the registration promise settle before the browser reports anything.
    await Promise.resolve();
    await Promise.resolve();
    sw.download();

    expect(arrived).toHaveBeenCalledOnce();
    stop();
  });

  it('says so at once when one was already waiting — the gap that hid a release', async () => {
    const arrived = vi.fn();
    stubRegistration({ waiting: { postMessage: vi.fn() } });
    const stop = watchForUpdate(arrived);
    await vi.waitFor(() => {
      expect(arrived).toHaveBeenCalledOnce();
    });
    stop();
  });

  it('stays quiet on a first install, where there is no old build to replace', async () => {
    const arrived = vi.fn();
    const sw = stubRegistration({ controller: null });
    const stop = watchForUpdate(arrived);
    await Promise.resolve();
    await Promise.resolve();
    sw.download();

    expect(arrived).not.toHaveBeenCalled();
    stop();
  });

  it('says nothing more once it has been stopped', async () => {
    const arrived = vi.fn();
    const sw = stubRegistration();
    const stop = watchForUpdate(arrived);
    await Promise.resolve();
    await Promise.resolve();
    stop();
    sw.download();

    expect(arrived).not.toHaveBeenCalled();
  });

  it('is a no-op where service workers do not exist', async () => {
    const arrived = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
    const stop = watchForUpdate(arrived);
    await Promise.resolve();
    await Promise.resolve();
    expect(arrived).not.toHaveBeenCalled();
    stop();
  });
});

/**
 * The beacon and the repair (18 September). Every other signal in this file is about the worker,
 * and a worker that has downloaded a build and will not hand it over makes all of them say
 * "nothing to do" — which is how a phone sat four releases behind while the logs showed it
 * downloading every one of them.
 */
describe('the beacon', () => {
  it('reads what the server says it is serving, and never from a cache', async () => {
    const asked: RequestInit[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_: string, init: RequestInit) => {
        asked.push(init);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ build: '80682e5', at: '18 Sep 13:24', minimumAt: '' }),
        });
      }),
    );
    expect((await latestBuild())?.build).toBe('80682e5');
    expect(asked[0]?.cache).toBe('no-store');
  });

  it('says nothing rather than something wrong when the phone cannot ask', async () => {
    // No signal is not the same as being up to date, and must never read as either answer.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await latestBuild()).toBeNull();
  });

  it('refuses a body that is not a version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ nope: true }) })),
    );
    expect(await latestBuild()).toBeNull();
  });
});

describe('the repair, when the worker will not hand over', () => {
  function stubWorkerAndCaches() {
    const unregistered: string[] = [];
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {},
        getRegistrations: () =>
          Promise.resolve([
            {
              unregister: () => {
                unregistered.push('sw');
                return Promise.resolve(true);
              },
            },
          ]),
      },
    });
    const deleted: string[] = [];
    vi.stubGlobal('caches', {
      keys: () => Promise.resolve(['workbox-precache', 'saathi-shell', 'saathi-ocr']),
      delete: (name: string) => {
        deleted.push(name);
        return Promise.resolve(true);
      },
    });
    return { unregistered, deleted };
  }

  it('takes the worker and its caches out of the way, then reloads', async () => {
    stubReload();
    const { unregistered, deleted } = stubWorkerAndCaches();
    expect(await repairToLatest()).toBe(true);
    expect(unregistered).toEqual(['sw']);
    // The app's own offline copy, and nothing else: documents, hotel and pass are not in here,
    // and the card reader a traveller already downloaded is theirs (decision 032).
    expect(deleted).toEqual(['workbox-precache', 'saathi-shell']);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does it once an hour at most, so an unreachable server cannot make a loop', async () => {
    stubReload();
    stubWorkerAndCaches();
    expect(await repairToLatest()).toBe(true);
    expect(await repairToLatest()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

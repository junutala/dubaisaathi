import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyPendingUpdate, watchForUpdate } from './updates.js';

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

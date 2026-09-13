import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveEngines, worthAnotherEngine } from './stt.js';

/**
 * The rule under test is the one that broke on a real phone: preferring an on-device engine must
 * not mean insisting on it. A phone with no Hindi model downloaded should still reach the cloud
 * recogniser rather than be told it cannot hear Hindi.
 */

/** A stand-in for the browser's recogniser. The tests never start one; only its presence and
 *  what its `available` probe answers decide which engines are offered. */
class FakeRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult = null;
  onerror = null;
  onend = null;
  start() {
    // never reached: resolveEngines only inspects the constructor
  }
  stop() {
    // as above
  }
  abort() {
    // as above
  }
}

function stubBrowser({
  secure = true,
  hasApi = true,
  local,
}: {
  secure?: boolean;
  hasApi?: boolean;
  local?: 'available' | 'unavailable' | 'error' | undefined;
}) {
  vi.stubGlobal('isSecureContext', secure);
  if (hasApi && local !== undefined) {
    Object.defineProperty(FakeRecognition, 'available', {
      configurable: true,
      value: () => (local === 'error' ? Promise.reject(new Error('nope')) : Promise.resolve(local)),
    });
  } else {
    Reflect.deleteProperty(FakeRecognition, 'available');
  }
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: hasApi ? FakeRecognition : undefined,
  });
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    configurable: true,
    value: undefined,
  });
}

const ids = async (online: boolean) => (await resolveEngines(online)).map((e) => e.id);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveEngines', () => {
  it('puts the on-device engine first when the phone has a Hindi model', async () => {
    stubBrowser({ local: 'available' });
    await expect(ids(true)).resolves.toEqual(['browser-on-device', 'browser-cloud']);
  });

  it('skips the on-device engine when the browser says the model is not there', async () => {
    // This is the case that produced "this phone cannot recognise Hindi speech" on a phone that
    // could have used the cloud recogniser perfectly well.
    stubBrowser({ local: 'unavailable' });
    await expect(ids(true)).resolves.toEqual(['browser-cloud']);
  });

  it('still tries on-device when the browser cannot say — that is the whole spike question', async () => {
    stubBrowser({});
    await expect(ids(true)).resolves.toEqual(['browser-on-device', 'browser-cloud']);
  });

  it('treats a probe that throws as no answer rather than as a no', async () => {
    stubBrowser({ local: 'error' });
    await expect(ids(true)).resolves.toEqual(['browser-on-device', 'browser-cloud']);
  });

  it('leaves the cloud engine out with no network, because it cannot work', async () => {
    stubBrowser({ local: 'available' });
    await expect(ids(false)).resolves.toEqual(['browser-on-device']);
  });

  it('offers nothing when the page is not on a secure origin', async () => {
    stubBrowser({ secure: false, local: 'available' });
    await expect(ids(true)).resolves.toEqual([]);
  });

  it('offers nothing when the browser has no speech API at all', async () => {
    stubBrowser({ hasApi: false });
    await expect(ids(true)).resolves.toEqual([]);
  });
});

describe('worthAnotherEngine', () => {
  it('retries the failures another engine could fix', () => {
    expect(worthAnotherEngine('no-engine')).toBe(true);
    expect(worthAnotherEngine('network')).toBe(true);
    expect(worthAnotherEngine('failed')).toBe(true);
  });

  it('does not retry a refused permission or plain silence', () => {
    // Permission applies to every engine, and silence means the engine worked fine.
    expect(worthAnotherEngine('no-permission')).toBe(false);
    expect(worthAnotherEngine('no-speech')).toBe(false);
  });
});

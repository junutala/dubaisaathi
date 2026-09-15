import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveEngines, worthAnotherEngine, joinFinals } from './stt.js';

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

describe('a recogniser that restates the sentence as it hears more', () => {
  /**
   * Recorded verbatim in `voice_events`, from the owner's phone. Not a duplicate — seven final
   * results, each one a longer prefix of the same sentence, joined into what he was shown as
   * what he had said.
   */
  it('keeps the whole sentence once', () => {
    expect(
      joinFinals([
        'मेरा',
        'मेरा',
        'मेरा',
        'मेरा एक',
        'मेरा एक खराब',
        'मेरा एक खराब है',
        'मेरा एक खराब है',
      ]),
    ).toBe('मेरा एक खराब है');
  });

  it('keeps the longer reading when the recogniser extends itself', () => {
    expect(joinFinals(['माल का एमिरेट्स', 'माल का एमिरेट्स जाना है'])).toBe(
      'माल का एमिरेट्स जाना है',
    );
  });

  it('is not fooled by spacing or case', () => {
    expect(joinFinals(['Mall of the Emirates', '  mall of the  emirates jaana hai '])).toBe(
      'mall of the  emirates jaana hai',
    );
  });

  /** A sentence that really did arrive in parts keeps both of them. */
  it('still joins pieces that are not restatements', () => {
    expect(joinFinals(['मुझे करामा', 'जाना है'])).toBe('मुझे करामा जाना है');
  });

  /** A stray syllable that opens nothing is kept: it is what the phone heard, and not ours to cut. */
  it('does not invent a tidier sentence than it was given', () => {
    expect(joinFinals(['ग', 'मुझे करामा जाना है', 'मुझे करामा जाना है'])).toBe(
      'ग मुझे करामा जाना है',
    );
  });

  it('drops empty pieces without leaving gaps', () => {
    expect(joinFinals(['', 'Karama', '   ', 'jaana hai'])).toBe('Karama jaana hai');
  });
});

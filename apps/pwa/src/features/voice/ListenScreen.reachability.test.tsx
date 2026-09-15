import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { SettingsProvider } from '../../app/settings.js';
import { ListenScreen } from './ListenScreen.js';
import type { SttEngine, SttFailure, SttHandlers } from './stt.js';

/**
 * The reachability harness.
 *
 * Six of the nine defects found on a phone on 13 September were not wrong code. They were
 * correct code nobody could reach: an offer rendered in one of eight states, a download branch
 * behind a condition that never held, a button waiting on a probe that waited on the button.
 * Reading the code found none of them, because the code was right.
 *
 * So this asserts the one property those bugs all broke, and the rule CLAUDE.md states plainly:
 * **a traveller is never left on a screen with no way forward.** Every state of the microphone
 * screen must offer at least one enabled control. Not the control this author expected — any
 * control, because the failure was always an author's expectation and never a compiler's.
 *
 * That property is necessary and it is not sufficient, which this harness learned the hard way.
 * The listening state offered two enabled controls — रद्द करें and "type it instead" — and passed,
 * while the one thing a traveller needed was missing: a way to say they had finished speaking.
 * Both controls it did offer throw the speech away. The offline engine's `stop()`, the only thing
 * that submits what was heard, was written and called from nowhere, so with Kaldi as the engine the
 * microphone stayed open for ever. A way out is not a way through; the last block here asserts the
 * difference.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

// The learning loop writes to IndexedDB; it is not what is under test here.
vi.mock('./voiceEvent.js', () => ({ recordVoiceEvent: () => Promise.resolve(undefined) }));

/** What `resolveEngines` will answer with, per test. */
let engines: SttEngine[] = [];
/** What `voskModelState` will answer with, per test. */
let modelState: 'cached' | 'fetchable' | 'unavailable' = 'unavailable';
/** How the mocked download behaves: hang there, fail, or succeed. Set per test. */
let downloadOutcome: 'hangs' | 'fails' | 'succeeds' = 'hangs';

vi.mock('./stt.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./stt.js')>()),
  resolveEngines: () => Promise.resolve(engines),
  isSecureOrigin: () => true,
}));

vi.mock('./voskStt.js', () => ({
  voskModelState: () => Promise.resolve(modelState),
  downloadVoskModel: (onProgress: (fraction: number) => void) => {
    onProgress(0.4);
    if (downloadOutcome === 'hangs') return new Promise<boolean>(() => undefined);
    return Promise.resolve(downloadOutcome === 'succeeds');
  },
}));

/** An engine that does exactly one thing, so a single state can be held still and looked at. */
function engineThat(behaviour: (h: SttHandlers) => void, id = 'test'): SttEngine {
  return {
    id,
    source: 'browser-stt',
    worksOffline: false,
    available: () => true,
    listen: (handlers) => {
      behaviour(handlers);
      return { stop: () => undefined, cancel: () => undefined };
    },
  };
}

const failsWith = (failure: SttFailure) =>
  engineThat((h) => {
    h.onFailure(failure);
  });

/**
 * Renders and hands back the screen's own container. Queries go through this rather than the
 * document, because a query against the document finds the first match anywhere — including a
 * container left over from an earlier render, which is how this harness first came to pass a
 * state that had no controls at all.
 */
function show(ui: ReactElement): HTMLElement {
  return render(<SettingsProvider>{ui}</SettingsProvider>).container;
}

/**
 * Every control the screen itself offers right now, within this render only.
 *
 * Scoped twice over, and both matter. Not the whole document, because a query there finds the
 * first match anywhere — including a container left over from an earlier test, which is how this
 * harness first came to pass a state that has no controls at all. And not the bottom bar or the
 * header, which are present in every state: switching tiles is not a way out of the state the
 * traveller is stuck in, and counting them would make every state pass and assert nothing.
 */
function wayForward(container: HTMLElement): string[] {
  const flow = container.querySelector('.flow');
  if (!flow) return [];
  return [...flow.querySelectorAll('button')]
    .filter((b) => !b.disabled)
    .map((b) => b.textContent.trim())
    .filter((label) => label !== '');
}

/** The download button, within this render only. */
function downloadButton(container: HTMLElement): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll('button')].find((b) => /download/i.test(b.textContent)) ?? null
  );
}

beforeEach(() => {
  // Deliberately no module reset: the screen and the provider must come from the same module
  // instance or the React context they share is two different contexts.
  navigate.mockClear();
  engines = [];
  modelState = 'unavailable';
  downloadOutcome = 'hangs';
});

afterEach(() => {
  cleanup();
});

const noop = () => undefined;
const mount = () => <ListenScreen from="home" onHeard={noop} onMic={noop} />;

describe('every state of the microphone screen offers a way forward', () => {
  it.each([
    ['no-permission'],
    ['no-speech'],
    ['no-engine'],
    ['network'],
    ['failed'],
    ['insecure-context'],
  ] as const)('after a %s failure', async (failure) => {
    engines = [failsWith(failure)];
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
  });

  it('while listening', async () => {
    engines = [engineThat(() => undefined)];
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
  });

  it('when no engine exists at all and no model can be fetched', async () => {
    engines = [];
    modelState = 'unavailable';
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
  });

  it('when no engine exists but the voice could be downloaded', async () => {
    engines = [];
    modelState = 'fetchable';
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
  });

  it('while the voice is downloading', async () => {
    // The state a traveller can be stuck in longest: 42 MB on a hotel connection that stalls.
    engines = [];
    modelState = 'fetchable';
    downloadOutcome = 'hangs';
    const view = show(mount());
    await waitFor(() => {
      expect(downloadButton(view)).not.toBeNull();
    });
    downloadButton(view)?.click();
    await waitFor(() => {
      expect(view.querySelector('.bar-track')).not.toBeNull();
    });
    // A stalled 42 MB download on hotel wifi is the longest a traveller can be held on one
    // screen. There must be a way off it.
    expect(wayForward(view).length).toBeGreaterThan(0);
  });

  it('after a download fails', async () => {
    engines = [];
    modelState = 'fetchable';
    downloadOutcome = 'fails';
    const view = show(mount());
    await waitFor(() => {
      expect(downloadButton(view)).not.toBeNull();
    });
    downloadButton(view)?.click();
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
  });
});

/**
 * The second property, and the one that cost the most.
 *
 * A way forward is not enough if the screen is lying about what it is doing. This header said
 * "Listening…" in seven states out of eight — while the microphone was being refused, while a
 * 42 MB model downloaded, while the sentence was worked out, and while the traveller typed,
 * having been told by this same screen to type instead. The waveform ran in two of those, one of
 * them directly above the words "Do not speak yet".
 *
 * A traveller reads the heading and the moving bars, not the paragraph. Told the phone is
 * listening, they speak — in a shop, at a taxi door, at 50°C — into a microphone that is shut.
 * An app that says "I cannot" costs them seconds. An app that says "I am" when it is not costs
 * them the thing they were trying to do. Denial of service is survivable; a lie is not.
 */
describe('the screen never claims to be listening when it is not', () => {
  /** What the header is saying, within this render only. */
  const heading = (container: HTMLElement): string =>
    container.querySelector('.hdr-title')?.textContent.trim() ?? '';
  /** The mic-is-live waveform — not the busy dots, which mean the opposite. */
  const micIsLive = (container: HTMLElement): boolean => container.querySelector('.wave') !== null;

  it.each([
    ['no-permission'],
    ['no-speech'],
    ['no-engine'],
    ['network'],
    ['failed'],
    ['insecure-context'],
  ] as const)('after a %s failure', async (failure) => {
    engines = [failsWith(failure)];
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
    // Not vacuous: an h1 selector matched nothing here and every assertion below passed on an
    // empty string, which is how a lying header nearly shipped with a green harness.
    expect(heading(view)).not.toBe('');
    expect(heading(view)).not.toMatch(/listening/i);
    expect(micIsLive(view)).toBe(false);
  });

  it('while the voice is downloading', async () => {
    engines = [];
    modelState = 'fetchable';
    downloadOutcome = 'hangs';
    const view = show(mount());
    await waitFor(() => {
      expect(downloadButton(view)).not.toBeNull();
    });
    downloadButton(view)?.click();
    await waitFor(() => {
      expect(view.textContent).toMatch(/40%|४०/);
    });
    // Not vacuous: an h1 selector matched nothing here and every assertion below passed on an
    // empty string, which is how a lying header nearly shipped with a green harness.
    expect(heading(view)).not.toBe('');
    expect(heading(view)).not.toMatch(/listening/i);
    expect(micIsLive(view)).toBe(false);
  });

  it('while the traveller is typing, having been told to type', async () => {
    engines = [failsWith('no-permission')];
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
    const typeIt = [...view.querySelectorAll('button')].find((b) => /type it/i.test(b.textContent));
    expect(typeIt).toBeDefined();
    typeIt?.click();
    await waitFor(() => {
      expect(view.querySelector('textarea, input')).not.toBeNull();
    });
    // Not vacuous: an h1 selector matched nothing here and every assertion below passed on an
    // empty string, which is how a lying header nearly shipped with a green harness.
    expect(heading(view)).not.toBe('');
    expect(heading(view)).not.toMatch(/listening/i);
    expect(micIsLive(view)).toBe(false);
  });

  /** ...and it does say so when it is true, or the property above is satisfied by saying nothing. */
  it('does say it while the microphone is actually open', async () => {
    engines = [engineThat(() => undefined)];
    const view = show(mount());
    await waitFor(() => {
      expect(micIsLive(view)).toBe(true);
    });
    expect(heading(view)).toMatch(/listening/i);
  });
});

describe('the offer to download the offline voice', () => {
  it('is reachable while the microphone is working, not only when it has failed', async () => {
    // The bug: it lived inside the "listening" branch only, so online — where the cloud
    // recogniser succeeds — it was shown to nobody.
    engines = [engineThat(() => undefined)];
    modelState = 'fetchable';
    const view = show(mount());
    await waitFor(() => {
      expect(downloadButton(view)).not.toBeNull();
    });
  });

  it.each([['no-permission'], ['no-speech'], ['failed']] as const)(
    'is reachable after a %s failure, which is exactly when it matters',
    async (failure) => {
      engines = [failsWith(failure)];
      modelState = 'fetchable';
      const view = show(mount());
      await waitFor(() => {
        expect(downloadButton(view)).not.toBeNull();
      });
    },
  );

  it('is not shown once the voice is already on the phone', async () => {
    engines = [engineThat(() => undefined)];
    modelState = 'cached';
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
    expect(downloadButton(view)).toBeNull();
  });

  it('is not shown with no network, because it cannot be fetched', async () => {
    engines = [failsWith('no-engine')];
    modelState = 'unavailable';
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
    expect(downloadButton(view)).toBeNull();
  });
});

describe('finishing, which is not the same as escaping', () => {
  /**
   * An engine that reports nothing, so the screen stays in `listening` and can be looked at. Its
   * session records which of the two endings it was asked for: `stop` reports what was heard,
   * `cancel` throws it away.
   */
  function heldListening() {
    const stop = vi.fn();
    const cancel = vi.fn();
    const engine: SttEngine = {
      id: 'held',
      source: 'offline-stt',
      worksOffline: true,
      available: () => true,
      listen: () => ({ stop, cancel }),
    };
    return { engine, stop, cancel };
  }

  it('offers a control that submits what was heard, not only ones that discard it', async () => {
    // The defect, stated as a test: every control on the listening screen discarded the speech.
    // Asserted by pressing each one in turn rather than by looking for a label, because the bug
    // was an author's expectation about which control existed.
    const labels: string[] = [];
    {
      const { engine } = heldListening();
      engines = [engine];
      const view = show(mount());
      await waitFor(() => {
        expect(wayForward(view).length).toBeGreaterThan(0);
      });
      labels.push(...wayForward(view));
      cleanup();
    }

    const submitted: string[] = [];
    for (const label of labels) {
      const { engine, stop } = heldListening();
      engines = [engine];
      const view = show(mount());
      await waitFor(() => {
        expect(wayForward(view).length).toBeGreaterThan(0);
      });
      const button = [...view.querySelectorAll('.flow button')].find(
        (b) => b.textContent.trim() === label,
      );
      (button as HTMLButtonElement | undefined)?.click();
      if (stop.mock.calls.length > 0) submitted.push(label);
      cleanup();
    }

    expect(submitted.length).toBeGreaterThan(0);
  });

  it('does not lose the sentence to the control that finishes it', async () => {
    const { engine, stop, cancel } = heldListening();
    engines = [engine];
    const view = show(mount());
    await waitFor(() => {
      expect(wayForward(view).length).toBeGreaterThan(0);
    });
    const finishing = [...view.querySelectorAll('.flow button')].find((b) =>
      /हो गया|done/i.test(b.textContent),
    );
    (finishing as HTMLButtonElement | undefined)?.click();
    expect(stop).toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});

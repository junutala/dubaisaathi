import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { SpeechResult } from '@saathi/shared';
import { SettingsProvider } from '../../app/settings.js';
import { ListenScreen } from './ListenScreen.js';
import type { SttEngine } from './stt.js';

/**
 * The offline engine hands over two readings of the same audio: one from a recogniser biased
 * toward the words in `data/intents/`, one from the model's own unconstrained vocabulary. The
 * biased reading is what makes it hear place names; the unbiased one is the only reading that can
 * contain a word nobody has curated.
 *
 * This is about what the screen does with the pair. Nothing is acted on until the traveller presses
 * आगे बढ़िए, so what the pair decides is which sentence is waiting in the box — and the box is the
 * safety net under grammar biasing, because a mangled place name does not fail, it resolves. These
 * tests therefore always press the button: a reading that only reaches the box has changed nothing
 * until someone agrees with it.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

const recorded = vi.fn();
vi.mock('./voiceEvent.js', () => ({
  recordVoiceEvent: (input: unknown) => {
    recorded(input);
    return Promise.resolve(undefined);
  },
}));

let engines: SttEngine[] = [];
vi.mock('./stt.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./stt.js')>()),
  resolveEngines: () => Promise.resolve(engines),
  isSecureOrigin: () => true,
}));

vi.mock('./voskStt.js', () => ({
  voskModelState: () => Promise.resolve('cached'),
  downloadVoskModel: () => Promise.resolve(true),
}));

/** An engine that reports one result the moment it is asked to listen. */
function engineSaying(result: SpeechResult): SttEngine {
  return {
    id: 'vosk-hi-0.22+grammar',
    source: 'offline-stt',
    worksOffline: true,
    available: () => true,
    listen: (handlers) => {
      handlers.onFinal(result);
      return { stop: () => undefined, cancel: () => undefined };
    },
  };
}

/** The sentence sitting in the box, which is what a reading actually decides. */
function inTheBox(container: HTMLElement): string {
  return container.querySelector<HTMLInputElement>('input.typed')?.value ?? '';
}

/** Presses आगे बढ़िए. Nothing in this app happens until a traveller does. */
function pressSend(container: HTMLElement) {
  const send = [...container.querySelectorAll<HTMLButtonElement>('.flow button')].find(
    (b) => !b.disabled && /आगे बढ़िए|^Go$/.test(b.textContent),
  );
  send?.click();
}

const noop = () => undefined;
function show() {
  return render(
    <SettingsProvider>
      <ListenScreen from="home" onHeard={noop} onMic={noop} />
    </SettingsProvider>,
  ).container;
}

beforeEach(() => {
  navigate.mockClear();
  recorded.mockClear();
  engines = [];
});

afterEach(() => {
  cleanup();
});

describe('two readings of one sentence', () => {
  it('puts the biased reading in the box when it is the one that makes sense', async () => {
    engines = [
      engineSaying({
        transcript: 'मुझे करामा जाना है',
        source: 'offline-stt',
        // What the model heard with no grammar: the place name mangled, which is the defect
        // measured on a phone on 13 September.
        alternatives: ['मुझे करम जाना है'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).toBe('मुझे करामा जाना है');
    });
    // Still nothing acted on: that is the point of the step.
    expect(navigate).not.toHaveBeenCalled();
    pressSend(view);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'soon', tile: 'transport' });
    });
  });

  it('offers the unbiased reading when the biased one yields nothing to act on', async () => {
    // The cost of a small vocabulary: a sentence made of words the grammar does not hold comes
    // back as fragments. The model's own reading is still there, and it is still a sentence.
    engines = [
      engineSaying({
        transcript: 'को',
        source: 'offline-stt',
        alternatives: ['ड्राइवर को कहो मीटर चालू करे'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).toBe('ड्राइवर को कहो मीटर चालू करे');
    });
    pressSend(view);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'arabic', phraseId: 'taxi-meter' });
    });
  });

  it('never joins the two readings into one sentence', async () => {
    // They are competing transcripts of the same seconds of audio. Concatenating them would
    // invent a sentence nobody said — and here it would invent a second place in it.
    engines = [
      engineSaying({
        transcript: 'मुझे करामा जाना है',
        source: 'offline-stt',
        alternatives: ['मुझे देरा जाना है'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).not.toBe('');
    });
    expect(inTheBox(view)).toBe('मुझे करामा जाना है');
  });

  it('lets the other reading be taken in one tap rather than retyped', async () => {
    // A phone keyboard in a script the traveller may not have installed is not a correction path.
    engines = [
      engineSaying({
        transcript: 'मुझे करामा जाना है',
        source: 'offline-stt',
        alternatives: ['मुझे देरा जाना है'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).toBe('मुझे करामा जाना है');
    });
    const other = [...view.querySelectorAll<HTMLButtonElement>('.flow button')].find((b) =>
      b.textContent.includes('देरा'),
    );
    expect(other).toBeDefined();
    other?.click();
    await waitFor(() => {
      expect(inTheBox(view)).toBe('मुझे देरा जाना है');
    });
  });

  it('records the unbiased reading, because that is where an uncurated word shows up', async () => {
    engines = [
      engineSaying({
        transcript: 'मुझे करामा जाना है',
        source: 'offline-stt',
        alternatives: ['मुझे अल क़ूज़ जाना है'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).not.toBe('');
    });
    pressSend(view);
    await waitFor(() => {
      expect(recorded).toHaveBeenCalled();
    });
    const event = recorded.mock.calls[0]?.[0] as { unconstrainedTranscript?: string };
    expect(event.unconstrainedTranscript).toBe('मुझे अल क़ूज़ जाना है');
  });

  it('still works for an engine that offers only one reading', async () => {
    engines = [engineSaying({ transcript: 'मुझे करामा जाना है', source: 'browser-stt' })];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).toBe('मुझे करामा जाना है');
    });
    pressSend(view);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'soon', tile: 'transport' });
    });
    const event = recorded.mock.calls[0]?.[0] as { unconstrainedTranscript?: string };
    expect(event.unconstrainedTranscript).toBeUndefined();
  });

  it('asks rather than guessing when the sentence sent is still ambiguous', async () => {
    engines = [
      engineSaying({
        transcript: 'करामा',
        source: 'offline-stt',
        alternatives: ['करम'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).not.toBe('');
    });
    pressSend(view);
    await waitFor(() => {
      expect(recorded).toHaveBeenCalled();
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('a sentence the traveller corrected', () => {
  it('is what gets acted on, not what was heard', async () => {
    // The whole reason this step exists: "माला एमरेट्स" resolves rather than failing, so a
    // confidence threshold cannot save anyone. A traveller looking at it can.
    engines = [engineSaying({ transcript: 'माला एमरेट्स', source: 'offline-stt' })];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).toBe('माला एमरेट्स');
    });
    const box = view.querySelector<HTMLInputElement>('input.typed');
    if (box) fireEvent.change(box, { target: { value: 'mall of emirates jaana hai' } });
    pressSend(view);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });
    const event = recorded.mock.calls[0]?.[0] as {
      transcript: string;
      correctedFrom?: string;
    };
    expect(event.transcript).toBe('mall of emirates jaana hai');
    // The pair that teaches the packs: what was heard, and what it should have been.
    expect(event.correctedFrom).toBe('माला एमरेट्स');
  });

  it('is recorded without a correction when the traveller changed nothing', async () => {
    engines = [engineSaying({ transcript: 'मुझे करामा जाना है', source: 'offline-stt' })];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).not.toBe('');
    });
    pressSend(view);
    await waitFor(() => {
      expect(recorded).toHaveBeenCalled();
    });
    const event = recorded.mock.calls[0]?.[0] as { correctedFrom?: string };
    expect(event.correctedFrom).toBeUndefined();
  });

  it('can be typed in Roman letters, because a Hindi keyboard is not a requirement', async () => {
    // CLAUDE.md rule 4: Hinglish is first-class. A traveller with no Devanagari keyboard must be
    // able to fix a mangled place name, or this step is a demand rather than a help.
    engines = [engineSaying({ transcript: 'माला एमरेट्स', source: 'offline-stt' })];
    const view = show();
    await waitFor(() => {
      expect(inTheBox(view)).not.toBe('');
    });
    const box = view.querySelector<HTMLInputElement>('input.typed');
    if (box) fireEvent.change(box, { target: { value: 'karama jaana hai' } });
    pressSend(view);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'soon', tile: 'transport' });
    });
  });
});

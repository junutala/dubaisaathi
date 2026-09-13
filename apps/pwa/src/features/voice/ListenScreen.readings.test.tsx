import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
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
 * This is about what the screen does with the pair — which is the whole safety net under grammar
 * biasing. Without a fallback, the day the biased recogniser hears nothing useful is the day the
 * traveller is told their phone did not understand, while the model sitting next to it did.
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
  it('acts on the biased reading when it is the one that makes sense', async () => {
    engines = [
      engineSaying({
        transcript: 'मुझे करामा जाना है',
        source: 'offline-stt',
        // What the model heard with no grammar: the place name mangled, which is the defect
        // measured on a phone on 13 September.
        alternatives: ['मुझे करम जाना है'],
      }),
    ];
    show();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'soon', tile: 'transport' });
    });
  });

  it('falls back to the unbiased reading when the biased one yields nothing to act on', async () => {
    // The cost of a small vocabulary: a sentence made of words the grammar does not hold comes
    // back as fragments. The model's own reading is still there, and it is still a sentence.
    engines = [
      engineSaying({
        transcript: 'को',
        source: 'offline-stt',
        alternatives: ['ड्राइवर को कहो मीटर चालू करे'],
      }),
    ];
    show();
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
    show();
    await waitFor(() => {
      expect(recorded).toHaveBeenCalled();
    });
    const event = recorded.mock.calls[0]?.[0] as { transcript: string };
    expect(event.transcript).toBe('मुझे करामा जाना है');
  });

  it('records the unbiased reading, because that is where an uncurated word shows up', async () => {
    engines = [
      engineSaying({
        transcript: 'मुझे करामा जाना है',
        source: 'offline-stt',
        alternatives: ['मुझे अल क़ूज़ जाना है'],
      }),
    ];
    show();
    await waitFor(() => {
      expect(recorded).toHaveBeenCalled();
    });
    const event = recorded.mock.calls[0]?.[0] as { unconstrainedTranscript?: string };
    expect(event.unconstrainedTranscript).toBe('मुझे अल क़ूज़ जाना है');
  });

  it('still works for an engine that offers only one reading', async () => {
    engines = [engineSaying({ transcript: 'मुझे करामा जाना है', source: 'browser-stt' })];
    show();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'soon', tile: 'transport' });
    });
    const event = recorded.mock.calls[0]?.[0] as { unconstrainedTranscript?: string };
    expect(event.unconstrainedTranscript).toBeUndefined();
  });

  it('asks rather than guessing when neither reading is confident', async () => {
    engines = [
      engineSaying({
        transcript: 'करामा',
        source: 'offline-stt',
        alternatives: ['करम'],
      }),
    ];
    const view = show();
    await waitFor(() => {
      expect(view.querySelector('.flow')?.textContent ?? '').not.toBe('');
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});

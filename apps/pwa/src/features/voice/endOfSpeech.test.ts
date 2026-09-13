import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startSpeechClock } from './endOfSpeech.js';

/**
 * The defect this exists for: the offline engine listened for ever. Kaldi stops when it is told
 * to, `stop()` was written, and nothing called it — so a traveller spoke, watched a waveform, and
 * had no way to say they were finished. These are the three ways a session must end on its own.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the clock that decides a sentence is over', () => {
  it('ends a moment after the speaker stops', () => {
    const ended = vi.fn();
    const clock = startSpeechClock(ended);
    clock.heard();
    vi.advanceTimersByTime(1_400);
    expect(ended).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(ended).toHaveBeenCalledOnce();
  });

  it('survives the pause in the middle of a sentence', () => {
    // "मुझे करामा … जाना है" — a traveller thinking mid-sentence must not be cut off.
    const ended = vi.fn();
    const clock = startSpeechClock(ended);
    for (let i = 0; i < 6; i++) {
      clock.heard();
      vi.advanceTimersByTime(1_200);
    }
    expect(ended).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_500);
    expect(ended).toHaveBeenCalledOnce();
  });

  it('gives up on a mic nothing was ever said into, but not quickly', () => {
    // Ending after the post-speech silence would cut off someone still drawing breath.
    const ended = vi.fn();
    startSpeechClock(ended);
    vi.advanceTimersByTime(1_600);
    expect(ended).not.toHaveBeenCalled();
    vi.advanceTimersByTime(7_000);
    expect(ended).toHaveBeenCalledOnce();
  });

  it('closes the microphone on speech that never stops', () => {
    // A radio, a television, the next table. Whatever was heard is what the traveller gets.
    const ended = vi.fn();
    const clock = startSpeechClock(ended);
    for (let i = 0; i < 100; i++) {
      clock.heard();
      vi.advanceTimersByTime(500);
    }
    expect(ended).toHaveBeenCalledOnce();
  });

  it('ends once, whichever limit arrives first', () => {
    const ended = vi.fn();
    const clock = startSpeechClock(ended);
    clock.heard();
    vi.advanceTimersByTime(60_000);
    expect(ended).toHaveBeenCalledOnce();
  });

  it('says nothing more once the session was ended another way', () => {
    // A tap on रद्द करें, or an engine failure. The clock must not fire into a dead session.
    const ended = vi.fn();
    const clock = startSpeechClock(ended);
    clock.heard();
    clock.stop();
    vi.advanceTimersByTime(60_000);
    expect(ended).not.toHaveBeenCalled();
  });

  it('ignores speech reported after the session ended', () => {
    const ended = vi.fn();
    const clock = startSpeechClock(ended);
    clock.stop();
    clock.heard();
    vi.advanceTimersByTime(60_000);
    expect(ended).not.toHaveBeenCalled();
  });
});

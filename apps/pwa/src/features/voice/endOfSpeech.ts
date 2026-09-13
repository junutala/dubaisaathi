/**
 * When is the sentence over?
 *
 * The phone's own recogniser answers this itself: `continuous = false` and it stops when the
 * speaker stops. Kaldi does not. It listens until it is told to stop, which means an engine that
 * does not decide this for itself leaves the microphone open for as long as the traveller is
 * willing to stare at a waveform — and that is exactly what shipped, because `stop()` was written
 * and nothing ever called it.
 *
 * So an offline engine keeps a clock, and three numbers end the session. Each is here because it
 * answers a different question a traveller can put the mic in:
 *
 *  - **Said something, then stopped.** `SILENCE_MS` after the last thing heard, the sentence is
 *    over. Short enough not to feel like waiting, long enough to survive the pause in
 *    "मुझे करामा … जाना है".
 *  - **Tapped the mic and said nothing.** Ending after `SILENCE_MS` would cut off someone still
 *    drawing breath, so silence before any speech gets its own, longer allowance —
 *    `QUIET_START_MS` — and then the screen says plainly that nothing was heard.
 *  - **Never stopped.** A radio, a television, a conversation in the room. `MAX_LISTEN_MS` is the
 *    hard cap: whatever was heard by then is what the traveller gets, because a microphone that
 *    can be left open forever is a battery complaint and a privacy one.
 */

/** Quiet after speech that means the sentence has ended. */
const SILENCE_MS = 1_500;

/** Quiet before any speech at all, after which there is nothing to wait for. */
const QUIET_START_MS = 8_000;

/** The longest the microphone stays open, however much is being said into it. */
const MAX_LISTEN_MS = 20_000;

export interface SpeechClock {
  /** Something was heard just now; the sentence is still in progress. */
  readonly heard: () => void;
  /** The session ended for some other reason — a tap, a failure. Stop watching. */
  readonly stop: () => void;
}

/**
 * Starts the clock. `onEnd` is called at most once, whichever of the three limits arrives first,
 * and never after `stop()`.
 */
export function startSpeechClock(onEnd: () => void): SpeechClock {
  let quiet: ReturnType<typeof setTimeout> | null = null;
  let cap: ReturnType<typeof setTimeout> | null = null;
  let ended = false;

  const clear = () => {
    if (quiet !== null) clearTimeout(quiet);
    if (cap !== null) clearTimeout(cap);
    quiet = null;
    cap = null;
  };

  const end = () => {
    if (ended) return;
    ended = true;
    clear();
    onEnd();
  };

  cap = setTimeout(end, MAX_LISTEN_MS);
  quiet = setTimeout(end, QUIET_START_MS);

  return {
    heard: () => {
      if (ended) return;
      if (quiet !== null) clearTimeout(quiet);
      quiet = setTimeout(end, SILENCE_MS);
    },
    stop: () => {
      ended = true;
      clear();
    },
  };
}

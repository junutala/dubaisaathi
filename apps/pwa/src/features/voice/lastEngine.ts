/**
 * Which recogniser actually produced the last thing the traveller was shown.
 *
 * This exists because engines fall back silently, and they must: a phone that cannot start one
 * recogniser should try the next before anybody is told anything is wrong (`worthAnotherEngine`).
 * That is right for a traveller at a taxi door and it is a trap for anyone judging a recogniser,
 * which right now is the two of us. Our own model is first and the browser's own recogniser is
 * behind it, so a Whisper that will not load hands the microphone to whatever the phone has —
 * silently, and with the result shown under no name at all. The new engine then gets judged on
 * output it never produced, and the real fault, a model that would not start, is never looked
 * for. It is the difference between "Whisper is no better" and "Whisper never ran".
 *
 * It is reported in the brand bar beside the build stamp rather than on any traveller screen.
 * That line already answers "which version of this am I holding"; "and which recogniser heard
 * me" is the same question about the same build. A traveller has no use for either, which is why
 * both are 10px and grey, and why neither takes a place in the field ledger on a real screen.
 */

let engine: string | null = null;
let trouble: string | null = null;
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

/** Called when an engine produced a reading a person is about to see. */
export function noteEngine(id: string): void {
  if (engine === id) return;
  engine = id;
  announce();
}

/**
 * Called when an engine failed and the next one was tried instead.
 *
 * Kept even after a later engine succeeds, because that is exactly the case worth seeing: a
 * transcript arrived, so nothing looks wrong, and the engine that was supposed to produce it
 * never ran. The line reads "what you got · what did not work".
 */
export function noteEngineTrouble(id: string, detail: string | undefined): void {
  const said = `${id} ✗ ${(detail ?? 'no reason given').slice(0, 60)}`;
  if (trouble === said) return;
  trouble = said;
  announce();
}

/** The whole diagnostic line: the engine that answered, and any that did not. */
export function lastEngine(): string | null {
  if (engine === null && trouble === null) return null;
  return [engine, trouble].filter((part) => part !== null).join(' · ');
}

export function watchEngine(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

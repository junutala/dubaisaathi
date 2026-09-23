import { cardFields, type CardFields } from './cardFields.js';
import { readCard } from './readCard.js';
import type { SavedHotel } from './records.js';
import { readHotel, saveHotelCapture } from './storage.js';

/**
 * Reading the saved hotel's card and filling its empty boxes (decision 032) — one reading at a
 * time, for the whole app rather than for one screen.
 *
 * It lives outside घर.1 because a card that could not be read must still be read when the
 * signal comes back, whether or not the traveller is looking at घर.1 then, and after the app
 * has been closed. So the hotel itself carries `cardUnread`, and `startCardRetry` — started once
 * at boot, like the outbox — tries again on every `online` and at launch until a reading lands
 * (CLAUDE.md: a moment the app waits for must be a moment the app can notice).
 */

export type ReadOutcome = 'reading' | 'read' | 'nothing' | 'failed' | 'offline';

/** The three fields a card can fill. The room is never on one. */
const FILLED = ['name', 'phone', 'address'] as const;

let outcome: ReadOutcome | undefined;
const listeners = new Set<(outcome: ReadOutcome | undefined) => void>();

function announce(next: ReadOutcome | undefined) {
  outcome = next;
  for (const listener of listeners) listener(next);
}

/** What the last reading came to, for the screen that says it. */
export function currentReading(): ReadOutcome | undefined {
  return outcome;
}

export function watchReading(onChange: (outcome: ReadOutcome | undefined) => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function cardsOf(hotel: SavedHotel | undefined): Blob[] {
  return [hotel?.cardPhoto, hotel?.cardBack].filter((blob): blob is Blob => blob !== undefined);
}

let running: Promise<void> | undefined;
/** Set when a reading is asked for while one is running — a side retaken mid-reading. */
const queued = { again: false };
/** Read through a function, so the loop sees a flag another caller set while it awaited. */
function askedAgain(): boolean {
  return queued.again;
}

/**
 * Reads the card as it is saved now, and fills only what is empty when the reading lands — a
 * box typed into while the engine was working is the traveller's, and wins.
 */
export function readHotelCard(): Promise<void> {
  if (running !== undefined) {
    queued.again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        queued.again = false;
        await readOnce();
      } while (askedAgain());
    } finally {
      running = undefined;
    }
  })();
  return running;
}

async function readOnce(): Promise<void> {
  const before = await readHotel();
  const photos = cardsOf(before);
  announce('reading');
  const result = await readCard(photos);
  const found = cardFields(result.lines);
  const now = await readHotel();
  // Removed while the card was being read: the traveller's word is the last one.
  if (before !== undefined && now === undefined) {
    announce(undefined);
    return;
  }
  const capture: { -readonly [K in keyof CardFields]: CardFields[K] } = {};
  for (const field of FILLED) {
    const value = found[field];
    if (value !== undefined && (now?.[field] ?? '').trim() === '') capture[field] = value;
  }
  await saveHotelCapture({
    ...capture,
    submittedAt: now?.submittedAt ?? new Date().toISOString(),
    // A card the engine never got to read is read again when it can be; one it read is done.
    cardUnread: result.failed && photos.length > 0 ? true : undefined,
  });
  announce(
    result.failed
      ? navigator.onLine
        ? 'failed'
        : 'offline'
      : Object.keys(found).length > 0
        ? 'read'
        : photos.length > 0
          ? 'nothing'
          : undefined,
  );
}

/**
 * Reads a card that is still waiting, at launch and every time the phone regains a signal, from
 * any screen. Returns the function that stops it.
 */
export function startCardRetry(): () => void {
  const tryNow = () => {
    if (!navigator.onLine) return;
    void readHotel().then((hotel) => {
      if (hotel?.cardUnread === true) void readHotelCard();
    });
  };
  tryNow();
  window.addEventListener('online', tryNow);
  return () => {
    window.removeEventListener('online', tryNow);
  };
}

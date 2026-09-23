import type { MapsPlace } from '@saathi/shared';
import { cardFields, type CardFields } from './cardFields.js';
import { cardQrOf, pinFromCard } from './cardQr.js';
import { followShortLink } from './mapLink.js';
import { readCard } from './readCard.js';
import { readQr } from './readQr.js';
import type { SavedHotel } from './records.js';
import { readHotel, saveHotelCapture, type HotelCapture } from './storage.js';

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

/**
 * One reading, in the order the owner asked for: the QR codes first, because they take a moment
 * and a maps link names the hotel exactly; the print after, for everything else. The card's
 * engine is started as soon as the codes are decoded, and a short link is followed while it works.
 */
async function readOnce(): Promise<void> {
  const before = await readHotel();
  const photos = cardsOf(before);
  announce('reading');
  const qr = cardQrOf(await readQr(photos));
  const printed = readCard(photos);

  let place = qr.place;
  let linkWaiting: string | undefined;
  if (place === undefined && qr.shortLink !== undefined) {
    const followed = await followShortLink(qr.shortLink);
    if (followed.kind === 'place') place = followed.place;
    else if (followed.kind === 'waiting') linkWaiting = qr.shortLink;
  }
  // Shown the moment it is known, not when the print has been read.
  const fromQr = place !== undefined && (await placeOnHotel(place, before !== undefined));

  const result = await printed;
  const found = cardFields([...qr.lines, ...result.lines]);
  const now = await readHotel();
  // Removed while the card was being read: the traveller's word is the last one.
  if (before !== undefined && now === undefined) {
    // And a reading asked for before the removal is not run against a hotel that is gone: with
    // nothing to read it would save an empty hotel back onto the strip.
    queued.again = false;
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
    // A short link with no signal to follow it waits for one; any other reading clears it.
    cardLink: linkWaiting,
  });
  announce(
    result.failed
      ? navigator.onLine
        ? 'failed'
        : 'offline'
      : Object.keys(found).length > 0 || fromQr
        ? 'read'
        : photos.length > 0
          ? 'nothing'
          : undefined,
  );
}

/**
 * What a maps link on the card fills, the moment it is read: the name, only into an empty box,
 * and the pin by the rule in `pinFromCard`. True when it filled or asked something. Nothing is
 * written to a hotel removed meanwhile.
 */
async function placeOnHotel(place: MapsPlace, hadHotel: boolean): Promise<boolean> {
  const now = await readHotel();
  if (hadHotel && now === undefined) return false;
  const capture: { -readonly [K in keyof HotelCapture]: HotelCapture[K] } = {
    ...(place.at === undefined ? {} : pinFromCard(now, place.at)),
  };
  if (place.name !== undefined && (now?.name ?? '').trim() === '') capture.name = place.name;
  const changed =
    capture.name !== undefined || capture.pin !== undefined || capture.cardPin !== undefined;
  if (Object.keys(capture).length === 0) return false;
  await saveHotelCapture({
    ...capture,
    // Past the card: step two opens on what the code said while the print is still being read.
    submittedAt: now?.submittedAt ?? new Date().toISOString(),
  });
  return changed;
}

/**
 * A short link that had no signal, followed now. The print was read at the time, so only the link
 * is: the name into an empty box, the pin by the card's rule — and a link that turns out not to be
 * a maps place is dropped.
 */
async function followWaitingLink(link: string): Promise<void> {
  const followed = await followShortLink(link);
  if (followed.kind === 'waiting') return;
  const now = await readHotel();
  // Removed, or read again meanwhile with a different card: this link is no longer the hotel's.
  if (now?.cardLink !== link) return;
  if (followed.kind === 'place') await placeOnHotel(followed.place, true);
  if ((await readHotel()) !== undefined) await saveHotelCapture({ cardLink: undefined });
}

/**
 * Reads a card that is still waiting, at launch and every time the phone regains a signal, from
 * any screen — and follows a short maps link off a card that was read with no signal to follow
 * it. Returns the function that stops it.
 */
export function startCardRetry(): () => void {
  const tryNow = () => {
    if (!navigator.onLine) return;
    void readHotel().then((hotel) => {
      if (hotel?.cardUnread === true) void readHotelCard();
      else if (hotel?.cardLink !== undefined && running === undefined) {
        void followWaitingLink(hotel.cardLink);
      }
    });
  };
  tryNow();
  window.addEventListener('online', tryNow);
  return () => {
    window.removeEventListener('online', tryNow);
  };
}

import { db, requestPersistentStorage } from '../../db/schema.js';
import { HOTEL_ID, type SavedHotel, type TravellerDocument } from './records.js';

/**
 * The hotel and the documents, read and written on the device. Nothing here touches the
 * network — not to save, not to load, not to check anything (rule 6). A hotel photographed in
 * a lobby with the radio off is readable a fortnight later with the radio still off.
 */

/** A change to the hotel. Any one field is a hotel on its own. */
export type HotelCapture = Omit<SavedHotel, 'id' | 'savedAt'>;

const watchers = new Set<() => void>();

/** The strip shows the hotel on every screen, so it is told when घर.1 changes it. */
export function watchHotel(onChange: () => void): () => void {
  watchers.add(onChange);
  return () => {
    watchers.delete(onChange);
  };
}

export async function readHotel(): Promise<SavedHotel | undefined> {
  return db.hotels.get(HOTEL_ID);
}

/**
 * घर.1 saves one thing at a time, so a capture merges into whatever is already there: pin in
 * the lobby now, photograph the card when someone hands one over tomorrow. Doing a second never
 * throws the first away.
 */
export async function saveHotelCapture(capture: HotelCapture): Promise<SavedHotel> {
  // Asked here rather than only at boot, because this is the first moment there is something on
  // the phone worth keeping. Best-effort by design: it changes nothing the traveller can see.
  void requestPersistentStorage();
  const existing = await readHotel();
  const hotel: SavedHotel = {
    ...existing,
    ...capture,
    id: HOTEL_ID,
    savedAt: new Date().toISOString(),
  };
  await db.hotels.put(hotel);
  for (const notify of watchers) notify();
  return hotel;
}

/** होटल हटाएँ — the traveller decides when it goes, and only the traveller. */
export async function deleteHotel(): Promise<void> {
  await db.hotels.delete(HOTEL_ID);
  for (const notify of watchers) notify();
}

/** Newest first: the document added last is the one being looked for. */
export async function listDocuments(): Promise<TravellerDocument[]> {
  return db.documents.orderBy('addedAt').reverse().toArray();
}

export async function readDocument(id: string): Promise<TravellerDocument | undefined> {
  return db.documents.get(id);
}

export async function saveDocument(name: string, photo: Blob): Promise<TravellerDocument> {
  void requestPersistentStorage();
  const doc: TravellerDocument = {
    id: crypto.randomUUID(),
    name,
    addedAt: new Date().toISOString(),
    photo,
  };
  await db.documents.add(doc);
  return doc;
}

/** हटाएँ, and the photograph goes with the row — the tourist decides when it goes. */
export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
}

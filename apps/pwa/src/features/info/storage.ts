import { db, requestPersistentStorage } from '../../db/schema.js';
import { HOTEL_ID, type SavedHotel, type TravellerDocument } from './records.js';

/**
 * The whole of ज़रूरी जानकारी, read and written on the device. Nothing here touches the
 * network — not to save, not to load, not to check anything (non-negotiable rule 6). A hotel
 * photographed in a lobby with the radio off is readable a fortnight later with the radio
 * still off and the pass expired.
 */

/** One capture from 4.2. Any one of the three fields is a hotel on its own. */
export type HotelCapture = Omit<SavedHotel, 'id' | 'savedAt'>;

export async function readHotel(): Promise<SavedHotel | undefined> {
  return db.hotels.get(HOTEL_ID);
}

/**
 * 4.2 captures one thing at a time, so a capture merges into whatever is already there: pin in
 * the lobby now, photograph the card when someone hands one over tomorrow. The traveller never
 * has to do all three in one go, and doing a second never throws the first away.
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
  return hotel;
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

import type { LatLng, Timestamp } from '@saathi/shared';

/**
 * What the hotel and the documents keep, and why it is declared here rather than in
 * `@saathi/shared`: neither ever leaves the phone (decision 003), so there is no second side to
 * share a definition with, and a shared type would describe a wire format that must not exist.
 */

/** A traveller has one hotel at a time, so it has one row and one key. */
export const HOTEL_ID = 'hotel';

/** A place name in both interface languages, copied onto the row so a pack update cannot blank it. */
export interface AreaName {
  readonly hi: string;
  readonly en: string;
  /** The place it was resolved from, so जाना can be handed a destination rather than an empty box. */
  readonly placeId?: string;
}

/**
 * The hotel, as the traveller wants to keep it (owner, 16 September): a photo of the card, a
 * photo of the front, the room number, the desk's number, a note, a pin — any of them, all of
 * them, none of them typed if they would rather not. Every field is optional because a pin with
 * nothing else is a hotel, and so is a card photo with nothing else.
 */
export interface SavedHotel {
  readonly id: string;
  readonly savedAt: Timestamp;
  readonly name?: string;
  readonly room?: string;
  readonly phone?: string;
  readonly note?: string;
  /** यहीं पिन लगाएँ: where the traveller was standing when they pressed it. */
  readonly pin?: LatLng;
  /** The area that pin fell in, read off the place pack on the device. */
  readonly area?: AreaName;
  /** The reception's card, which is the thing a driver already understands. */
  readonly cardPhoto?: Blob;
  /** The entrance, for recognising the building on the way back. */
  readonly gatePhoto?: Blob;
  /** Anything else they photographed — the lift, the street, the breakfast times. */
  readonly photos?: readonly Blob[];
}

/** Any document, one photo, one name — the tourist decides which (decision 003). */
export interface TravellerDocument {
  readonly id: string;
  readonly name: string;
  readonly addedAt: Timestamp;
  readonly photo: Blob;
}

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
 * The hotel, as the traveller wants to keep it. Since 23 September (decision 032) the way in is
 * the reception's card, both sides, and a pin: the phone reads the card and fills in what it can,
 * and the traveller corrects it. The room is never on a card, so it is the one field they type.
 * Every field is still optional, because a pin with nothing else is a hotel, and so is a card
 * with nothing else.
 */
export interface SavedHotel {
  readonly id: string;
  readonly savedAt: Timestamp;
  readonly name?: string;
  readonly room?: string;
  readonly phone?: string;
  /** The street and the area, as the card prints them — what a driver asks for. */
  readonly address?: string;
  readonly note?: string;
  /** यहीं पिन लगाएँ: where the traveller was standing when they pressed it. */
  readonly pin?: LatLng;
  /** The area that pin fell in, read off the place pack on the device. */
  readonly area?: AreaName;
  /** The reception's card, the side with the name on it. */
  readonly cardPhoto?: Blob;
  /** The card's other side, which on most Dubai cards is the one with the number and street. */
  readonly cardBack?: Blob;
  /**
   * When the traveller pressed Submit on the card screen. Set whether or not the phone could read
   * anything, because it is what moves घर.1 from the card to the fields — a card that read
   * nothing must still lead to the boxes where the traveller types it.
   */
  readonly submittedAt?: Timestamp;
  /**
   * The front of the building, from before 23 September. Nothing asks for it now; a phone that
   * holds one keeps it until the traveller removes it, because a release never takes something
   * away from a phone.
   */
  readonly gatePhoto?: Blob;
  /** Anything else photographed before 23 September — kept for the same reason. */
  readonly photos?: readonly Blob[];
}

/** Any document, one photo, one name — the tourist decides which (decision 003). */
export interface TravellerDocument {
  readonly id: string;
  readonly name: string;
  readonly addedAt: Timestamp;
  readonly photo: Blob;
}

import type { LatLng, Timestamp } from '@saathi/shared';

/**
 * What ज़रूरी जानकारी keeps, and why it is declared here rather than in `@saathi/shared`:
 * neither of these ever leaves the phone (decision 003), so there is no second side to share
 * a definition with, and a shared type would describe a wire format that must not exist.
 * See `docs/decisions/015`.
 */

/** A traveller has one hotel at a time, so it has one row and one key. */
export const HOTEL_ID = 'hotel';

/** A place name in both interface languages, copied onto the row so a pack update cannot blank it. */
export interface AreaName {
  readonly hi: string;
  readonly en: string;
}

/**
 * The hotel, captured and never typed (design rule 14). Every way of capturing it is optional
 * because any one of the three is enough — a pin with no photo is a hotel, and so is a card
 * photo with no pin.
 */
export interface SavedHotel {
  readonly id: string;
  readonly savedAt: Timestamp;
  /** यहीं पिन करें: where the traveller was standing when they pressed it. */
  readonly pin?: LatLng;
  /**
   * The area that pin fell in, read off the place pack on the device. It is the only name
   * nobody has to type, which is why it is the one shown on 4.1.
   */
  readonly area?: AreaName;
  /** कार्ड की फ़ोटो — the reception's card, which is the thing a driver already understands. */
  readonly cardPhoto?: Blob;
  /** गेट की फ़ोटो — the entrance, for recognising the building on the way back. */
  readonly gatePhoto?: Blob;
}

/** Any document, one photo, one name — the tourist decides which (decision 003). */
export interface TravellerDocument {
  readonly id: string;
  /** Typed by the traveller, so it can be found and asked for by voice ("beema dikhao"). */
  readonly name: string;
  readonly addedAt: Timestamp;
  readonly photo: Blob;
}

import { isShortMapsLink, mapsPlaceOf, type LatLng, type MapsPlace } from '@saathi/shared';
import { distanceKm, insideDubai } from '../../lib/dubai.js';
import type { CardLine } from './cardFields.js';
import { areaFor } from './nearestArea.js';
import type { CardPin, SavedHotel } from './records.js';
import type { HotelCapture } from './storage.js';

/**
 * What a QR code on the hotel's card is worth (decision 032, the owner's addendum of 23
 * September). Pure: the decoded texts go in, what they mean comes out, and nothing here knows
 * about a camera, a decoder or a screen.
 *
 * Many Dubai cards carry a QR code that opens Google Maps. A long maps link says where the hotel
 * is and what Google calls it, in its own text, so the phone reads both with the radio off. A
 * short one (maps.app.goo.gl) says nothing until it is followed, which takes a signal. A contact
 * card (vCard, MECARD) is handed to the same rules as the printed card. Anything else — the
 * WhatsApp link most cards carry, a website, a menu — is ignored, and the card is read the usual
 * way: _"if the QR code does not read either and points to their whatsapp, then we go our usual
 * way of OCRing and drop pin options."_
 */
export interface CardQr {
  /** The place a long maps link gives, when one of the codes is one. */
  readonly place?: MapsPlace;
  /** A short maps link, when that is all there is: followed online, or kept until a signal. */
  readonly shortLink?: string;
  /** A contact card's fields, as lines for `cardFields` — so a Dubai desk number is the rule. */
  readonly lines: readonly CardLine[];
}

export function cardQrOf(texts: readonly string[]): CardQr {
  let place: MapsPlace | undefined;
  let shortLink: string | undefined;
  const lines: CardLine[] = [];
  for (const text of texts) {
    const found = mapsPlaceOf(text);
    if (found !== undefined && (found.at !== undefined || found.name !== undefined)) {
      place ??= found;
      continue;
    }
    if (isShortMapsLink(text)) {
      shortLink ??= text.trim();
      continue;
    }
    lines.push(...contactLines(text));
  }
  return {
    ...(place === undefined ? {} : { place }),
    ...(shortLink === undefined || place !== undefined ? {} : { shortLink }),
    lines,
  };
}

/** The height a contact card's own lines are given: the name as print, the rest as small print. */
const NAME_HEIGHT = 30;
const SMALL_HEIGHT = 14;

/**
 * A vCard or a MECARD as the lines a card would print: the organisation, the numbers labelled as
 * a card labels them, the address, the web address and the email. `cardFields` then decides what
 * is the hotel's name and which number is the desk — a mobile on a vCard is still not the desk.
 */
export function contactLines(text: string): CardLine[] {
  const trimmed = text.trim();
  if (/^BEGIN:VCARD/i.test(trimmed)) return vcardLines(trimmed);
  if (/^MECARD:/i.test(trimmed)) return mecardLines(trimmed);
  return [];
}

function vcardLines(text: string): CardLine[] {
  // Folded lines continue with a space or a tab.
  const unfolded = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const lines: CardLine[] = [];
  for (const raw of unfolded) {
    const colon = raw.indexOf(':');
    if (colon < 0) continue;
    const key = (raw.slice(0, colon).split(';')[0] ?? '').toUpperCase().replace(/^ITEM\d+\./, '');
    const value = unescapeValue(raw.slice(colon + 1));
    lines.push(...lineFor(key, value, ';'));
  }
  return lines;
}

function mecardLines(text: string): CardLine[] {
  const lines: CardLine[] = [];
  // Fields end with an unescaped semicolon.
  for (const field of text.replace(/^MECARD:/i, '').split(/(?<!\\);/)) {
    const colon = field.indexOf(':');
    if (colon < 0) continue;
    lines.push(
      ...lineFor(field.slice(0, colon).toUpperCase(), unescapeValue(field.slice(colon + 1)), ','),
    );
  }
  return lines;
}

function lineFor(key: string, value: string, partSeparator: string): CardLine[] {
  const text = value.trim();
  if (text === '') return [];
  switch (key) {
    case 'ORG':
      // A vCard's organisation may carry its department after a semicolon.
      return [{ text: (text.split(';')[0] ?? text).trim(), height: NAME_HEIGHT }];
    case 'TEL':
      return [{ text: `Tel: ${text}`, height: SMALL_HEIGHT }];
    case 'ADR': {
      const parts = text
        .split(partSeparator)
        .map((part) => part.trim())
        .filter((part) => part !== '');
      return parts.length === 0 ? [] : [{ text: parts.join(', '), height: SMALL_HEIGHT }];
    }
    case 'URL':
      return [{ text, height: SMALL_HEIGHT }];
    case 'EMAIL':
      return [{ text, height: SMALL_HEIGHT }];
    default:
      return [];
  }
}

function unescapeValue(text: string): string {
  return text.replace(/\\([;,:\\])/g, '$1').replace(/\\n/gi, ' ');
}

/**
 * Beyond this the card and the traveller disagree about where the hotel is, and the traveller is
 * asked. Closer, they agree — a GPS fix in a lobby wanders by tens of metres — and the pin the
 * traveller placed stands.
 */
export const DISAGREE_KM = 0.2;

type MutableCapture = { -readonly [K in keyof HotelCapture]: HotelCapture[K] };

/**
 * What the card's place does to the pin. The rule the owner agreed:
 * - outside Dubai, nothing — a pin outside Dubai is refused from the card as it is from the phone
 *   (decision 024);
 * - no pin yet, or a pin that came from the card: the card's place is the pin, with its area;
 * - a pin the traveller placed standing within 200 m: it stands, and there is nothing to ask;
 * - one further away: it stands for now, and the card's place is kept for step two to ask about.
 */
export function pinFromCard(hotel: SavedHotel | undefined, at: LatLng): HotelCapture {
  if (!insideDubai(at)) return {};
  if (hotel?.pin === undefined || hotel.pinFrom === 'card') {
    return { pin: at, area: areaFor(at), pinFrom: 'card', cardPin: undefined };
  }
  if (distanceKm(hotel.pin, at) <= DISAGREE_KM) return { cardPin: undefined };
  return { cardPin: cardPinAt(at) };
}

/**
 * What यहीं पिन लगाएँ does, now that the card can have a say. The traveller's own pin always
 * becomes the pin. A card's place that disagrees with it by more than 200 m — kept from before,
 * or the pin being replaced because it came from the card — is kept for step two to ask about.
 */
export function pinFromStanding(hotel: SavedHotel | undefined, at: LatLng): HotelCapture {
  const capture: MutableCapture = { pin: at, area: areaFor(at), pinFrom: undefined };
  const card =
    hotel?.cardPin?.at ??
    (hotel?.pinFrom === 'card' && hotel.pin !== undefined ? hotel.pin : undefined);
  capture.cardPin =
    card !== undefined && distanceKm(card, at) > DISAGREE_KM ? cardPinAt(card) : undefined;
  return capture;
}

/** The card's place with the area it falls in, when the place pack knows one. */
function cardPinAt(at: LatLng): CardPin {
  const area = areaFor(at);
  return area === undefined ? { at } : { at, area };
}

/** The traveller's answer on step two. */
export function choosePin(hotel: SavedHotel, choice: 'stood' | 'card'): HotelCapture {
  if (choice === 'stood' || hotel.cardPin === undefined) return { cardPin: undefined };
  return { pin: hotel.cardPin.at, area: hotel.cardPin.area, pinFrom: 'card', cardPin: undefined };
}

import type { DubaiPlace, Phrase } from '@saathi/shared';

/**
 * "Take me to X" for any place in the pack, composed rather than stored.
 *
 * The sixteen ready sentences are content; this one is a shape. Writing a row per place would
 * mean the Arabic a driver is shown depends on someone having remembered to add it, and a
 * traveller standing at a taxi door with a place we know the Arabic name of would be told we
 * cannot say it. So it is built from the place's own names, which every place already carries.
 */

const PREFIX = 'go-to:';
/** A destination we could not resolve — the traveller's own words, carried through verbatim. */
const TYPED_PREFIX = 'go-to-text:';

export function destinationPhraseId(placeId: string): string {
  return `${PREFIX}${placeId}`;
}

/** The place id inside a composed phrase id, or `null` for an ordinary pack phrase. */
export function placeIdInPhrase(phraseId: string): string | null {
  return phraseId.startsWith(PREFIX) ? phraseId.slice(PREFIX.length) : null;
}

export function typedDestinationPhraseId(text: string): string {
  return `${TYPED_PREFIX}${encodeURIComponent(text.trim())}`;
}

/** The traveller's own words out of a composed id, or `null` if it is not one. */
export function typedTextInPhrase(phraseId: string): string | null {
  if (!phraseId.startsWith(TYPED_PREFIX)) return null;
  try {
    return decodeURIComponent(phraseId.slice(TYPED_PREFIX.length));
  } catch {
    // A hash someone edited by hand. Their words are gone, which is better than a crash.
    return null;
  }
}

/**
 * "Take me to «whatever they wrote»", for a destination that is not in the pack and never will
 * be — a friend's flat in Satwa, a building name, an office.
 *
 * This is the whole answer to a closed list of places. A curated pack can hold the twenty
 * destinations a tourist shares with every other tourist; it can never hold the one address
 * that is the reason they came. But the driver already knows the city, so the app does not need
 * to: it needs to put the traveller's words in front of him under a sentence he can read.
 *
 * The words go through untouched. We do not transliterate, correct or resolve them — every one
 * of those is a chance to change where someone is asking to be taken.
 */
export function typedDestinationPhrase(text: string): Phrase | null {
  const words = text.trim();
  if (words === '') return null;
  return {
    id: typedDestinationPhraseId(words),
    situation: 'taxi',
    hi: `${words} ले चलो`,
    hinglish: `${words} le chalo`,
    en: `Take me to ${words}`,
    ar: `خذني إلى ${words}`,
  };
}

/**
 * `arTranslit` is deliberately absent. It is optional on a `Phrase`, and a transliteration we
 * invented would be read aloud by a traveller to a driver — wrong is worse than missing here.
 */
export function destinationPhrase(place: DubaiPlace): Phrase | null {
  const arabic = place.name.ar;
  if (arabic === undefined || arabic === '') return null;
  return {
    id: destinationPhraseId(place.id),
    situation: 'taxi',
    hi: `${place.name.hi} ले चलो`,
    hinglish: `${place.name.en} le chalo`,
    en: `Take me to ${place.name.en}`,
    ar: `خذني إلى ${arabic}`,
  };
}

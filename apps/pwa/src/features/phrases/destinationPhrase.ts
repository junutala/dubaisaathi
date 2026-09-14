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

export function destinationPhraseId(placeId: string): string {
  return `${PREFIX}${placeId}`;
}

/** The place id inside a composed phrase id, or `null` for an ordinary pack phrase. */
export function placeIdInPhrase(phraseId: string): string | null {
  return phraseId.startsWith(PREFIX) ? phraseId.slice(PREFIX.length) : null;
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

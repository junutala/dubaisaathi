import { buildCorpus, type IntentCorpus } from './corpus.js';
import { foldArabic } from './normalise.js';
import places from '../../../../../data/intents/places.v1.json';
import keywords from '../../../../../data/intents/keywords.v1.json';

/**
 * The parser's vocabulary, bound to the packs that ship with the app. Built once, at module
 * load, so a malformed pack fails at boot rather than on the first sentence someone speaks.
 */
export const intentCorpus: IntentCorpus = buildCorpus(places, keywords);

/**
 * Every place we ship in both alphabets, folded Perso-Arabic to Devanagari.
 *
 * The Arabic name exists for the driver's card; it is also the spelling the offline recogniser
 * produces when it writes Hindi in Urdu script, so it is what turns "برجمان" back into
 * "बुरजुमान" on the screen the traveller is asked to check. Exact, because it is our own data
 * rather than a transliteration — and a place name is the part of a sentence they read hardest.
 */
export const placeNamesInDevanagari: ReadonlyMap<string, string> = new Map(
  [...intentCorpus.places.values()].flatMap((place) =>
    place.name.ar === undefined || place.name.ar === ''
      ? []
      : [[foldArabic(place.name.ar), place.name.hi] as const],
  ),
);

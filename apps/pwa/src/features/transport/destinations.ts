import type { DubaiPlace } from '@saathi/shared';
import type { Locale } from '../../i18n/index.js';
import { GLUE, ROMAN_GLUE, fold, intentCorpus, parseIntent } from '../ask/index.js';

/**
 * Turning what a traveller typed into a place we know — the one job screen 2.1 has before it
 * can do anything else.
 *
 * It goes through the script-agnostic matcher, which is what makes "Karama", "करामा", "karma"
 * and "mujhe Karama jaana hai" all the same destination (CLAUDE.md rule 4: Hinglish is
 * first-class and the parser never branches on script). Nothing here is a second matcher; a
 * new alias is a row in `data/intents/places.v1.json` and this picks it up for free.
 */

export function placeById(placeId: string): DubaiPlace | undefined {
  return intentCorpus.places.get(placeId);
}

/**
 * `null` when we do not know the place. That is not a failure to hide: 2.1 says so on the
 * screen and keeps the box, because a traveller who typed a real Dubai neighbourhood we have
 * not curated yet deserves to be told, not left looking at a blank.
 */
export function placeFromText(text: string): DubaiPlace | null {
  const placeId = parseIntent(text, intentCorpus).destination?.placeId;
  if (placeId === undefined) return null;
  return intentCorpus.places.get(placeId) ?? null;
}

/**
 * The place the words most likely mean, and whether it was an exact reading or a near one.
 *
 * "Burjman" is two edits from BurJuman; the matcher already resolves it, at less than full
 * confidence. 2.1 shows a near reading as a question — "क्या आपका मतलब बुरजुमान है?" — with the
 * place's own Devanagari name on it. That is the only transliteration the screen ever shows: a
 * name we ship, never a guess at how their Roman letters would be written (owner, 16 September).
 */
export function readPlace(
  text: string,
): { readonly place: DubaiPlace; readonly sure: boolean } | null {
  const intent = parseIntent(text, intentCorpus);
  const placeId = intent.destination?.placeId;
  if (placeId === undefined) return null;
  const place = intentCorpus.places.get(placeId);
  if (!place) return null;
  // An exact alias scores 1 on the place itself; a skeleton or edit-distance hit scores less.
  return { place, sure: (intent.destination?.confidence ?? 0) >= 1 };
}

/** A place, a station or a line, in whichever language the interface is set to. */
export function localName(
  name: { readonly en: string; readonly hi: string },
  locale: Locale,
): string {
  return locale === 'hi' ? name.hi : name.en;
}

/**
 * Whether what the traveller typed carries **more than the place name** — a building, a street,
 * a landmark, a flat number.
 *
 * This decides what a driver is shown. "करामा जाना है" is just the place, so the driver gets
 * proper Arabic for Karama. "Satwa, Al Hudaiba Building" is not: resolving it to the
 * neighbourhood and showing خذني إلى السطوة would quietly throw away the only part that says
 * which door — the same defect as a bare "mall" alias, one level down.
 *
 * So anything left over after the matched place and the words we know are filler ("jaana hai",
 * "le chalo", "metro se") means the traveller's own words go through untouched instead.
 */
export function carriesMoreThanThePlace(typed: string, matched: string | undefined): boolean {
  const known = new Set<string>();
  for (const list of [
    intentCorpus.intents,
    intentCorpus.modes,
    intentCorpus.foodTags,
    intentCorpus.documents,
    intentCorpus.phraseIds,
    intentCorpus.hotel,
  ]) {
    for (const keyword of list) for (const word of keyword.folded.split(' ')) known.add(word);
  }
  for (const alias of intentCorpus.placeByAlias.keys()) {
    for (const word of alias.split(' ')) known.add(word);
  }
  // The glue a traveller writes around the words that carry meaning. Without it "mujhe karama
  // jaana hai" reads as an address, because "mujhe" is in no keyword list.
  for (const word of [...GLUE, ...ROMAN_GLUE]) known.add(fold(word));
  if (matched !== undefined) for (const word of fold(matched).split(' ')) known.add(word);

  return fold(typed)
    .split(' ')
    .filter((word) => word.length > 2)
    .some((word) => !known.has(word));
}

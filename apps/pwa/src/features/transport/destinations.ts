import type { DubaiPlace } from '@saathi/shared';
import type { Locale } from '../../i18n/index.js';
import { intentCorpus } from '../voice/intentPacks.js';
import { parseIntent } from '../voice/parseIntent.js';

/**
 * Turning what a traveller typed into a place we know — the one job screen 1.1 has before it
 * can do anything else.
 *
 * It goes through the same parser as the mic, which is what makes "Karama", "करामा", "karma"
 * and "mujhe Karama jaana hai" all the same destination (CLAUDE.md rule 4: Hinglish is
 * first-class and the parser never branches on script). Nothing here is a second matcher; a
 * new alias is a row in `data/intents/places.v1.json` and this picks it up for free.
 */

export function placeById(placeId: string): DubaiPlace | undefined {
  return intentCorpus.places.get(placeId);
}

/**
 * `null` when we do not know the place. That is not a failure to hide: 1.1 says so on the
 * screen and keeps the box, because a traveller who typed a real Dubai neighbourhood we have
 * not curated yet deserves to be told, not left looking at a blank.
 */
export function placeFromText(text: string): DubaiPlace | null {
  const placeId = parseIntent(text, intentCorpus).destination?.placeId;
  if (placeId === undefined) return null;
  return intentCorpus.places.get(placeId) ?? null;
}

/** A place, a station or a line, in whichever language the interface is set to. */
export function localName(
  name: { readonly en: string; readonly hi: string },
  locale: Locale,
): string {
  return locale === 'hi' ? name.hi : name.en;
}

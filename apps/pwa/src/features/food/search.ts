import type { FoodTag, LatLng, Restaurant } from '@saathi/shared';
import { distanceKm } from '../info/nearestArea.js';
import { fold } from '../voice/normalise.js';
import { isDietTag, outlets } from './outlets.js';

/**
 * What the traveller asked for, turned into a list of places they can eat.
 *
 * It decides nothing on their behalf. There is no learning, no reweighting and no guess about
 * what they fancy today — the owner's rule, and the right one: *"He should decide whether he
 * wants idli or roti. I cannot choose for him."* A constraint they stated is honoured; a taste
 * is never predicted. What orders the list is distance, which is a fact about the world rather
 * than an opinion about them.
 */

export interface OutletHit {
  readonly outlet: Restaurant;
  /** Absent when the phone has not given us a location — then no distance is shown at all. */
  readonly km?: number;
}

export interface OutletSearch {
  /** What matched, nearest first. Empty only when they asked for something we do not have. */
  readonly hits: readonly OutletHit[];
  /** The diet constraints read out of the sentence, so the screen can say what it applied. */
  readonly diet: readonly FoodTag[];
  /** The cuisines read out of the sentence. */
  readonly cuisines: readonly FoodTag[];
  /** True when they typed something we could not read as food at all. */
  readonly unmatchedWords: boolean;
}

/**
 * A kitchen with no vegetarian food in it cannot answer a vegetarian question. This is not a
 * preference being applied on the traveller's behalf — it is the question they asked.
 */
function servesDiet(outlet: Restaurant, diet: readonly FoodTag[]): boolean {
  if (diet.length === 0) return true;
  if (outlet.kitchen === 'non-veg') return false;
  return diet.every((tag) => outlet.tags.includes(tag));
}

/** A name typed straight in — "udupi", "उडुपी" — should find the place, tags or no tags. */
function nameMatches(outlet: Restaurant, typed: string): boolean {
  if (typed === '') return false;
  const needle = fold(typed);
  return fold(outlet.name.en).includes(needle) || fold(outlet.name.hi).includes(needle);
}

export function searchOutlets(
  typed: string,
  tags: readonly FoodTag[],
  here: LatLng | undefined,
): OutletSearch {
  const diet = tags.filter(isDietTag);
  const cuisines = tags.filter((tag) => !isDietTag(tag));
  const words = typed.trim();

  const byName = words === '' ? [] : outlets.filter((outlet) => nameMatches(outlet, words));

  const matched =
    byName.length > 0
      ? byName
      : outlets.filter((outlet) => {
          if (!servesDiet(outlet, diet)) return false;
          // Cuisine narrows within the constraint rather than filtering alongside it: asking for
          // Jain and South Indian means a Jain kitchen that does South Indian, and asking for
          // two cuisines means either will do.
          if (cuisines.length === 0) return true;
          return cuisines.some((tag) => outlet.tags.includes(tag));
        });

  const hits = matched
    .map((outlet) => ({
      outlet,
      ...(here === undefined ? {} : { km: distanceKm(here, outlet.location) }),
    }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  return {
    hits,
    diet,
    cuisines,
    unmatchedWords: words !== '' && tags.length === 0 && byName.length === 0,
  };
}

/** Everything near the traveller, for the screen they land on before they have typed anything. */
export function nearbyOutlets(here: LatLng | undefined): OutletSearch {
  return searchOutlets('', [], here);
}

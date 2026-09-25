import type { FoodTag, LatLng, Restaurant } from '@saathi/shared';
import { distanceKm } from '../../lib/distance.js';
import { fold, intentCorpus, parseIntent } from '../ask/index.js';
import { dishFromText, isSameDish, type Dish } from './dishes.js';
import { openState } from './openNow.js';
import { isDietTag, outlets } from './outlets.js';

/**
 * What the traveller asked for, turned into a list of places they can eat — dish first.
 *
 * It decides nothing on their behalf. There is no learning, no reweighting and no guess about
 * what they fancy today — the owner's rule: *"He should decide whether he wants idli or roti. I
 * cannot choose for him."* A constraint they stated is honoured; a taste is never predicted.
 * What orders the list is distance, which is a fact about the world rather than an opinion.
 */

/** The chips on 1.1: constraints a traveller states, never inferred. */
export type Constraint = 'veg' | 'jain' | 'noOnionGarlic' | 'vrat' | 'openNow';

export interface OutletHit {
  readonly outlet: Restaurant;
  /** Absent when the phone has not given us a location — then no distance is shown at all. */
  readonly km?: number;
  /** A collector confirmed the searched dish here, as opposed to the kitchen being its kind. */
  readonly confirmed: boolean;
  /**
   * What the searched dish costs here, off this kitchen's own menu — so a row can say "samosa
   * AED 1.5" beside the next kitchen's AED 6, which is the saving a family feels (the owner,
   * 25 September). Absent when no dish was searched or this menu carries no price for it.
   */
  readonly dishPriceAed?: number;
}

export interface OutletSearch {
  /** What matched: confirmed dish first, then the kitchen's kind, nearest first within each. */
  readonly hits: readonly OutletHit[];
  /** The dish that was read out of the box, when it was one we know. */
  readonly dish?: Dish;
  /** The diet constraints read out of a sentence ("jain khana"), so the screen can say so. */
  readonly diet: readonly FoodTag[];
  /** True when they typed something we could not read as food at all. */
  readonly unmatchedWords: boolean;
}

function meets(outlet: Restaurant, constraint: Constraint, now: Date): boolean {
  const asked = (question: string) => {
    const answer = outlet.dietary?.[question];
    return answer === 'yes' || answer === 'on-request';
  };
  switch (constraint) {
    case 'veg':
      return outlet.kitchen === 'pure-veg';
    case 'jain':
      return asked('jain') || outlet.tags.includes('jain');
    case 'noOnionGarlic':
      return (
        asked('noOnionGarlic') ||
        (outlet.tags.includes('no-onion') && outlet.tags.includes('no-garlic'))
      );
    case 'vrat':
      return asked('vrat') || outlet.tags.includes('vrat');
    case 'openNow':
      return openState(outlet.hours, now)?.open === true;
  }
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

function confirmedHere(outlet: Restaurant, dish: Dish): boolean {
  return (outlet.confirmedDishes ?? []).some((made) => isSameDish(dish, made.name));
}

export function searchOutlets(
  typed: string,
  constraints: readonly Constraint[],
  here: LatLng | undefined,
  now: Date = new Date(),
): OutletSearch {
  const words = typed.trim();
  const dish = dishFromText(words);
  const intent = words === '' ? undefined : parseIntent(words, intentCorpus);
  const sentenceTags = intent?.foodTags ?? [];
  const diet = sentenceTags.filter(isDietTag);
  const cuisines = sentenceTags.filter((tag) => !isDietTag(tag));

  const byName =
    words === '' || dish !== undefined ? [] : outlets().filter((o) => nameMatches(o, words));

  let matched: readonly { readonly outlet: Restaurant; readonly confirmed: boolean }[];
  if (dish !== undefined) {
    // The dish is the search. A kitchen where a person confirmed it comes first, whatever its
    // tags say — the person standing in it knows better than our label. A kitchen of its kind
    // comes after, and only if it can serve the diet the dish implies.
    const dishDiet = dish.tags.filter(isDietTag);
    matched = outlets()
      .map((outlet) => ({
        outlet,
        confirmed: confirmedHere(outlet, dish),
        kind:
          servesDiet(outlet, dishDiet) &&
          dish.tags.some((tag) => !isDietTag(tag) && outlet.tags.includes(tag)),
      }))
      .filter((row) => row.confirmed || row.kind);
  } else if (byName.length > 0) {
    matched = byName.map((outlet) => ({ outlet, confirmed: false }));
  } else {
    matched = outlets()
      .filter((outlet) => {
        if (!servesDiet(outlet, diet)) return false;
        if (cuisines.length === 0) return true;
        return cuisines.some((tag) => outlet.tags.includes(tag));
      })
      .map((outlet) => ({ outlet, confirmed: false }));
  }

  const hits = matched
    .filter((row) => constraints.every((constraint) => meets(row.outlet, constraint, now)))
    .map((row) => {
      const price =
        dish === undefined
          ? undefined
          : (row.outlet.confirmedDishes ?? []).find(
              (made) => made.priceAed !== undefined && isSameDish(dish, made.name),
            )?.priceAed;
      return {
        outlet: row.outlet,
        confirmed: row.confirmed,
        ...(here === undefined ? {} : { km: distanceKm(here, row.outlet.location) }),
        ...(price === undefined ? {} : { dishPriceAed: price }),
      };
    })
    .sort((a, b) => {
      if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
      // Nearest first; with no location at all, by name — never the order they were uploaded in.
      const nearer = (a.km ?? 0) - (b.km ?? 0);
      return nearer !== 0 ? nearer : a.outlet.name.en.localeCompare(b.outlet.name.en, 'en');
    });

  return {
    hits,
    ...(dish === undefined ? {} : { dish }),
    diet,
    unmatchedWords:
      words !== '' && dish === undefined && sentenceTags.length === 0 && byName.length === 0,
  };
}

/** Everything near the traveller, for the screen they land on before they have typed anything. */
export function nearbyOutlets(
  here: LatLng | undefined,
  constraints: readonly Constraint[] = [],
): OutletSearch {
  return searchOutlets('', constraints, here);
}

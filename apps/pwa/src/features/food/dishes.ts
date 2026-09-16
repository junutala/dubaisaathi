import { FOOD_TAGS, type FoodTag, type LocalisedName } from '@saathi/shared';
import { fold } from '../ask/index.js';
import pack from '../../../../../data/restaurants/dishes.v1.json';

/**
 * The dishes an Indian traveller actually searches for, in both scripts. The dish is the search
 * and the place is the answer (16 September): "sabudana khichdi" finds every kitchen a collector
 * confirmed it at, and every kitchen of its kind after that.
 */
export interface Dish {
  readonly id: string;
  readonly name: LocalisedName;
  /** What the dish says about a kitchen — a dosa implies a South Indian one. */
  readonly tags: readonly FoodTag[];
  readonly popular: boolean;
  /** Every alias, folded once, for matching. */
  readonly folded: readonly string[];
}

interface RawDish {
  readonly id: string;
  readonly name: { readonly en: string; readonly hi: string; readonly aliases: readonly string[] };
  readonly tags: readonly string[];
  readonly popular?: boolean;
}

function isFoodTag(value: string): value is FoodTag {
  return (FOOD_TAGS as readonly string[]).includes(value);
}

export const dishes: readonly Dish[] = (pack.dishes as readonly RawDish[]).map((raw) => {
  const bad = raw.tags.find((tag) => !isFoodTag(tag));
  if (bad !== undefined) throw new Error(`dish ${raw.id} has an unknown tag: ${bad}`);
  return {
    id: raw.id,
    name: raw.name,
    tags: raw.tags.filter(isFoodTag),
    popular: raw.popular === true,
    folded: [raw.name.en, raw.name.hi, ...raw.name.aliases].map(fold),
  };
});

export const popularDishes: readonly Dish[] = dishes.filter((dish) => dish.popular);

/**
 * The dish a traveller typed, if it is one we know. Whole-string first, then the longest alias
 * that sits inside what they typed — so "jain thali chahiye" still finds the thali.
 */
export function dishFromText(typed: string): Dish | undefined {
  const needle = fold(typed);
  if (needle === '') return undefined;
  let best: { readonly dish: Dish; readonly length: number } | undefined;
  for (const dish of dishes) {
    for (const alias of dish.folded) {
      if (alias === '' || alias.length < 3) continue;
      const hit = needle === alias || needle.includes(alias);
      if (hit && (best === undefined || alias.length > best.length))
        best = { dish, length: alias.length };
    }
  }
  return best?.dish;
}

/** Whether a confirmed dish on an outlet is this dish, by any of its spellings. */
export function isSameDish(
  dish: Dish,
  name: { readonly en: string; readonly hi: string },
): boolean {
  const en = fold(name.en);
  const hi = fold(name.hi);
  return dish.folded.some((alias) => alias !== '' && (en.includes(alias) || hi.includes(alias)));
}

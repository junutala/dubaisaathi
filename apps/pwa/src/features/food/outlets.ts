import {
  FOOD_TAGS,
  KITCHEN_KINDS,
  type FoodTag,
  type KitchenKind,
  type Restaurant,
} from '@saathi/shared';
import pack from '../../../../../data/restaurants/restaurants.dev.json';

/**
 * The outlets, as they sit on disk.
 *
 * Imported rather than loaded into IndexedDB, unlike the phrase and transport packs, because
 * this is a **development fixture and not collected content** — see the `warning` in the file
 * and `docs/field-app-plan.md`. When collectors start filling it, it becomes a versioned pack
 * like the others and this import goes.
 */

interface RawOutlet {
  readonly id: string;
  readonly name: { readonly en: string; readonly hi: string };
  readonly location: { readonly lat: number; readonly lng: number };
  readonly areaId?: string;
  readonly kitchen: string;
  readonly tags: readonly string[];
  readonly approxCostAed?: number;
  readonly phone?: string;
  readonly delivers?: string;
}

function isKitchen(value: string): value is KitchenKind {
  return (KITCHEN_KINDS as readonly string[]).includes(value);
}

function isFoodTag(value: string): value is FoodTag {
  return (FOOD_TAGS as readonly string[]).includes(value);
}

/**
 * The pack is JSON, so its types are not checked at build time. This narrows it once, at the
 * boundary, and throws on a malformed row rather than leaving a card with a blank tag on it.
 * `aliases` is empty here: an outlet's spellings come from collection, not from us guessing.
 */
export function parseOutletPack(raw: unknown): readonly Restaurant[] {
  const rows = (raw as { readonly restaurants: readonly RawOutlet[] }).restaurants;
  return rows.map((row) => {
    if (!isKitchen(row.kitchen))
      throw new Error(`${row.id} has an unknown kitchen: ${row.kitchen}`);
    const bad = row.tags.find((tag) => !isFoodTag(tag));
    if (bad !== undefined) throw new Error(`${row.id} has an unknown tag: ${bad}`);
    if (row.delivers !== undefined && row.delivers !== 'yes' && row.delivers !== 'no') {
      throw new Error(`${row.id} has an unreadable delivery answer: ${row.delivers}`);
    }
    return {
      id: row.id,
      name: { en: row.name.en, hi: row.name.hi, aliases: [] },
      location: row.location,
      kitchen: row.kitchen,
      tags: row.tags.filter(isFoodTag),
      ...(row.areaId === undefined ? {} : { areaId: row.areaId }),
      ...(row.approxCostAed === undefined ? {} : { approxCostAed: row.approxCostAed }),
      ...(row.phone === undefined ? {} : { phone: row.phone }),
      ...(row.delivers === undefined ? {} : { delivers: row.delivers }),
    };
  });
}

export const outlets: readonly Restaurant[] = parseOutletPack(pack);

/** True while the list is fixture data, so a screen can say so rather than implying we know. */
export const OUTLETS_ARE_FIXTURE = pack.status === 'development-fixture';

/**
 * The tags that say whether a traveller can eat here at all, as opposed to what they fancy.
 * The split matters: a constraint filters, a cuisine only narrows. Mixing them is how an app
 * asks someone to choose between being Jain and wanting a dosa.
 */
const DIET_TAGS: readonly FoodTag[] = [
  'vegetarian',
  'jain',
  'sattvik',
  'no-onion',
  'no-garlic',
  'eggless',
  'vrat',
  'indian-vegetarian',
];

export function isDietTag(tag: FoodTag): boolean {
  return DIET_TAGS.includes(tag);
}

import {
  FOOD_TAGS,
  KITCHEN_KINDS,
  type FoodTag,
  type KitchenKind,
  type Restaurant,
} from '@saathi/shared';
import fixture from '../../../../../data/restaurants/restaurants.dev.json';
import collected from '../../../../../data/restaurants/restaurants.v1.json';

/**
 * The outlets, as they sit on disk.
 *
 * Two files, and the collected one wins the moment it has anything in it. `restaurants.v1.json`
 * is written by `@saathi/content-tools` from approved `field_reports` — the step that turns a
 * collector's visit into something a traveller can see. Until a collector has been anywhere it
 * is empty, and खाना falls back to the development fixture so the screen can still be built and
 * tested, saying plainly that nobody has visited these places.
 *
 * The switch is on content rather than on a build flag on purpose: publishing a real outlet is
 * what promotes the app off fixture data, with nothing to remember to turn on.
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
  /** What a person answered, per question. A missing key means nobody asked — never a no. */
  readonly dietary?: Readonly<Record<string, string>>;
  readonly confirmedDishes?: readonly {
    readonly name: { readonly en: string; readonly hi: string };
    readonly tags?: readonly string[];
    readonly priceAed?: number;
  }[];
  readonly hours?: {
    readonly everyDay?: { readonly opens: string; readonly closes: string };
    readonly openLate?: boolean;
    readonly open24?: boolean;
  };
  readonly hoursConfirmedAt?: string;
  readonly spokeTo?: string;
}

/** The three answers a card can show. Anything else in the file is ignored rather than trusted. */
function isAnswer(value: string): value is 'yes' | 'on-request' | 'no' {
  return value === 'yes' || value === 'on-request' || value === 'no';
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
      ...(row.dietary === undefined
        ? {}
        : {
            dietary: Object.fromEntries(
              Object.entries(row.dietary).filter(([, answer]) => isAnswer(answer)),
            ) as Readonly<Record<string, 'yes' | 'on-request' | 'no'>>,
          }),
      ...(row.confirmedDishes === undefined
        ? {}
        : {
            confirmedDishes: row.confirmedDishes.map((dish) => ({
              name: { en: dish.name.en, hi: dish.name.hi, aliases: [] },
              tags: (dish.tags ?? []).filter(isFoodTag),
              ...(dish.priceAed === undefined ? {} : { priceAed: dish.priceAed }),
            })),
          }),
      ...(row.hours === undefined ? {} : { hours: row.hours }),
      ...(row.hoursConfirmedAt === undefined ? {} : { hoursConfirmedAt: row.hoursConfirmedAt }),
      ...(row.spokeTo === undefined ? {} : { spokeTo: row.spokeTo }),
    };
  });
}

/** Collected content the moment there is any; the fixture only while there is none. */
const pack = collected.restaurants.length > 0 ? collected : fixture;

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

export function outletById(id: string): Restaurant | undefined {
  return outlets.find((outlet) => outlet.id === id);
}

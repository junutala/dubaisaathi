import type { ConfirmedDish, FoodTag, KitchenKind, OpeningHours, Restaurant } from '@saathi/shared';
import { FOOD_TAGS, KITCHEN_KINDS } from '@saathi/shared';

/**
 * A `field_reports` row, exactly as Postgres returns it.
 *
 * Snake case and nullable, because that is what is actually on the wire. Converting it to
 * something tidier before this point would only hide the two things that matter: which columns
 * can be null, and that a collector may have skipped any of them.
 */
export interface ReportRow {
  readonly id: string;
  readonly name: string;
  readonly name_hi: string | null;
  readonly kind: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly kitchen: string | null;
  readonly dietary: Readonly<Record<string, unknown>> | null;
  readonly confirmed_dishes: readonly unknown[] | null;
  readonly hours: Readonly<Record<string, unknown>> | null;
  readonly hours_confirmed_at: string | null;
  readonly delivers: string | null;
  readonly delivery_phone: string | null;
  readonly price_for_one_aed: number | null;
  readonly spoke_to: string | null;
  readonly status: string;
}

/**
 * The dietary questions, in the order a collector is asked to put them, mapped to the tags खाना
 * filters on. `noOnionGarlic` is one question to a shopkeeper and two tags to a traveller, which
 * is the right way round: nobody in a kitchen distinguishes them, and a Jain traveller needs
 * both to be true.
 */
const DIET_TAGS: Readonly<Record<string, readonly FoodTag[]>> = {
  jain: ['jain'],
  vrat: ['vrat'],
  sattvik: ['sattvik'],
  eggless: ['eggless'],
  noOnionGarlic: ['no-onion', 'no-garlic'],
};

function isKitchen(value: unknown): value is KitchenKind {
  return typeof value === 'string' && (KITCHEN_KINDS as readonly string[]).includes(value);
}

function isFoodTag(value: unknown): value is FoodTag {
  return typeof value === 'string' && (FOOD_TAGS as readonly string[]).includes(value);
}

/**
 * The dietary answers, normalised to the three the app understands.
 *
 * The phone sends `true`/`false` for the plain answers and the string `'on-request'` for the
 * middle one, so both shapes arrive. A missing key stays missing and is never turned into a
 * `no`: "nobody asked" and "they said no" are different facts, and खाना shows the first as
 * पूछिए. Inventing a `no` here would tell a Jain traveller a kitchen cannot feed them on the
 * strength of nobody having asked.
 */
export function readDietary(
  raw: Readonly<Record<string, unknown>> | null,
): Readonly<Record<string, 'yes' | 'on-request' | 'no'>> | undefined {
  if (raw === null) return undefined;
  const out: Record<string, 'yes' | 'on-request' | 'no'> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === true) out[key] = 'yes';
    else if (value === false) out[key] = 'no';
    else if (value === 'on-request') out[key] = 'on-request';
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Tags a traveller can filter on, derived from what was actually asked.
 *
 * Only a hard `yes` becomes a tag. `on-request` is real and worth showing on the card, but it is
 * not something to filter a list by: a traveller who asked for जैन and was handed a kitchen that
 * *might* do it on a good day has been misled by us, not by the kitchen.
 *
 * `pure-veg` earns `vegetarian` on its own — that is what the kitchen kind means.
 */
export function tagsFor(row: ReportRow): readonly FoodTag[] {
  const tags = new Set<FoodTag>();
  if (row.kitchen === 'pure-veg') tags.add('vegetarian');
  const dietary = readDietary(row.dietary);
  if (dietary) {
    for (const [question, answer] of Object.entries(dietary)) {
      if (answer !== 'yes') continue;
      for (const tag of DIET_TAGS[question] ?? []) tags.add(tag);
    }
  }
  return [...tags];
}

/** Dishes, keeping only rows that actually carry a name. */
export function readDishes(raw: readonly unknown[] | null): readonly ConfirmedDish[] | undefined {
  if (raw === null) return undefined;
  const dishes: ConfirmedDish[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const dish = item as {
      name?: { en?: unknown; hi?: unknown };
      tags?: unknown;
      priceAed?: unknown;
    };
    const en = typeof dish.name?.en === 'string' ? dish.name.en : undefined;
    if (en === undefined || en.trim() === '') continue;
    const hi = typeof dish.name?.hi === 'string' && dish.name.hi.trim() !== '' ? dish.name.hi : en;
    const tags = Array.isArray(dish.tags) ? dish.tags.filter(isFoodTag) : [];
    // The price the collector read off the menu, when there was one: it is what makes 1.4 a
    // menu rather than a list of names.
    const priceAed =
      typeof dish.priceAed === 'number' && Number.isFinite(dish.priceAed)
        ? dish.priceAed
        : undefined;
    dishes.push({
      name: { en, hi, aliases: [] },
      tags,
      ...(priceAed === undefined ? {} : { priceAed }),
    });
  }
  return dishes.length > 0 ? dishes : undefined;
}

/** Opening hours, narrowed from JSON to the shape the card reads. */
export function readHours(raw: Readonly<Record<string, unknown>> | null): OpeningHours | undefined {
  if (raw === null) return undefined;
  const day = (value: unknown): { opens: string; closes: string } | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const it = value as { opens?: unknown; closes?: unknown };
    if (typeof it.opens !== 'string' || typeof it.closes !== 'string') return undefined;
    return { opens: it.opens, closes: it.closes };
  };
  const everyDay = day(raw.everyDay);
  const open24 = raw.open24 === true;
  if (everyDay === undefined && !open24) return undefined;
  return {
    ...(everyDay === undefined ? {} : { everyDay }),
    ...(raw.openLate === true ? { openLate: true } : {}),
    ...(open24 ? { open24: true } : {}),
  };
}

/**
 * One visit, as the traveller's pack will carry it.
 *
 * Returns `null` for a report that cannot honestly become a card — no kitchen kind means the
 * first line of the card would be a guess, and the whole point of asking a person is that we
 * are not guessing. It is dropped from the pack and stays in Postgres for somebody to finish.
 */
export function toRestaurant(row: ReportRow): Restaurant | null {
  if (!isKitchen(row.kitchen)) return null;
  if (row.name.trim() === '') return null;

  const dietary = readDietary(row.dietary);
  const dishes = readDishes(row.confirmed_dishes);
  const hours = readHours(row.hours);
  const delivers = row.delivers === 'yes' || row.delivers === 'no' ? row.delivers : undefined;

  return {
    id: row.id,
    // The board outside is the name; a Hindi name only when a collector wrote one, never
    // transliterated by us. Guessing Devanagari for a shop sign is how "Burjuman" became
    // "Dubai Mall" on a driver's screen.
    name: { en: row.name, hi: row.name_hi ?? row.name, aliases: [] },
    location: { lat: row.lat, lng: row.lng },
    kitchen: row.kitchen,
    tags: tagsFor(row),
    ...(row.price_for_one_aed === null ? {} : { approxCostAed: row.price_for_one_aed }),
    ...(row.delivery_phone === null ? {} : { phone: row.delivery_phone }),
    ...(delivers === undefined ? {} : { delivers }),
    ...(dietary === undefined ? {} : { dietary }),
    ...(dishes === undefined ? {} : { confirmedDishes: dishes }),
    ...(hours === undefined ? {} : { hours }),
    ...(row.hours_confirmed_at === null ? {} : { hoursConfirmedAt: row.hours_confirmed_at }),
    ...(row.spoke_to === null ? {} : { spokeTo: row.spoke_to }),
  };
}

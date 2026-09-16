import { fold, intentCorpus } from '../ask/index.js';
import pack from '../../../../../data/places/attractions.v1.json';

/**
 * जानना — the places of Dubai, with what a traveller wants to know before going: what it is,
 * when it opens, what it costs, how long it takes, whom to ring. Content, not code: every row
 * points at a place in the parser's pack, so the same place is one thing across all three
 * pillars, and every row carries the date its facts were last checked.
 */
export const CATEGORIES = ['landmark', 'mall', 'souk', 'beach', 'park'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Attraction {
  readonly placeId: string;
  readonly category: Category;
  readonly blurb: { readonly hi: string; readonly en: string };
  readonly hoursText: { readonly hi: string; readonly en: string };
  /** 0 means free. */
  readonly ticketAed: number;
  readonly ticketNote?: { readonly hi: string; readonly en: string };
  readonly phone?: string;
  readonly durationHours?: number;
  /** A photograph we hold the rights to show, as a path under the pack. None yet: the frame is drawn only when one exists. */
  readonly photo?: string;
  readonly checkedAt: string;
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export const attractions: readonly Attraction[] = (
  pack.attractions as readonly (Omit<Attraction, 'category'> & { readonly category: string })[]
).map((row) => {
  if (!isCategory(row.category))
    throw new Error(`${row.placeId} has an unknown category: ${row.category}`);
  if (!intentCorpus.places.has(row.placeId))
    throw new Error(`${row.placeId} is not a place the pack knows`);
  return { ...row, category: row.category };
});

export function attractionById(placeId: string): Attraction | undefined {
  return attractions.find((row) => row.placeId === placeId);
}

/** The rows whose place is named by what was typed, in either script, by any alias. */
export function searchAttractions(
  typed: string,
  category: Category | 'all',
): readonly Attraction[] {
  const needle = fold(typed.trim());
  return attractions.filter((row) => {
    if (category !== 'all' && row.category !== category) return false;
    if (needle === '') return true;
    const place = intentCorpus.places.get(row.placeId);
    if (!place) return false;
    return [place.name.en, place.name.hi, ...place.name.aliases].some((name) =>
      fold(name).includes(needle),
    );
  });
}

import { fold, intentCorpus } from '../ask/index.js';
import bundled from '../../../../../data/places/attractions.v1.json';
import { packBody } from '../content/index.js';

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
  /** The attraction's own website, where it has one. No photographs: the owner's call, and the site has them. */
  readonly website?: string;
  readonly checkedAt: string;
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

type RawAttraction = Omit<Attraction, 'category'> & { readonly category: string };

/**
 * The downloaded pack first, the copy in this build second (decision 030). Read on first use
 * rather than at import, because the phone loads its packs from IndexedDB at boot and a module
 * evaluated before that would hold the old answer for the life of the tab.
 *
 * A row the app cannot read is dropped and the rest are kept: an unknown category or a place the
 * matcher has never heard of is a mistake in one row, and losing जानना altogether over it would
 * be a worse answer than showing the twenty rows that are fine.
 */
function rowsOf(raw: unknown): readonly unknown[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const rows: unknown = (raw as Record<string, unknown>).attractions;
  return Array.isArray(rows) ? (rows as readonly unknown[]) : [];
}

function isRaw(value: unknown): value is RawAttraction {
  const row = value as Partial<RawAttraction> | null;
  return typeof row?.placeId === 'string' && typeof row.category === 'string';
}

function parse(raw: unknown): readonly Attraction[] {
  const kept: Attraction[] = [];
  for (const row of rowsOf(raw)) {
    if (!isRaw(row)) continue;
    if (!isCategory(row.category)) continue;
    if (!intentCorpus.places.has(row.placeId)) continue;
    kept.push({ ...row, category: row.category });
  }
  return kept;
}

let held: readonly Attraction[] | null = null;

export function attractions(): readonly Attraction[] {
  if (held === null) {
    const downloaded = parse(packBody('attractions'));
    held = downloaded.length > 0 ? downloaded : parse(bundled);
  }
  return held;
}

/** For tests, and for the launch at which a newly downloaded pack is taken up. */
export function forgetAttractions(): void {
  held = null;
}

export function attractionById(placeId: string): Attraction | undefined {
  return attractions().find((row) => row.placeId === placeId);
}

/** The rows whose place is named by what was typed, in either script, by any alias. */
export function searchAttractions(
  typed: string,
  category: Category | 'all',
): readonly Attraction[] {
  const needle = fold(typed.trim());
  return attractions().filter((row) => {
    if (category !== 'all' && row.category !== category) return false;
    if (needle === '') return true;
    const place = intentCorpus.places.get(row.placeId);
    if (!place) return false;
    return [place.name.en, place.name.hi, ...place.name.aliases].some((name) =>
      fold(name).includes(needle),
    );
  });
}

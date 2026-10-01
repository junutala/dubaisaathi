import type { DubaiPlace, LatLng, LocalisedName, TransportMode } from '@saathi/shared';

/**
 * Every metro station, tram stop and bus stop in the RTA's network, as somewhere a traveller can
 * type and go (the owner, 1 October: "We have the data and it's a crime not to use them").
 *
 * Until now जाना's box knew twenty-eight curated places while the planner could already route to
 * 2,727 stops: "healthcare city" came back as a place we do not know, from a phone, although
 * Dubai Healthcare City is a metro station in the pack.
 *
 * Two tiers, because the two halves of the network are not the same kind of name:
 *
 * - **Named** — the metro and tram stations. A few dozen, hand-named in Devanagari
 *   (`data/transport/stations.v1.json`), said aloud by travellers. They are matched the way the
 *   curated places are, near spellings included.
 * - **Exact** — the bus stops. Two and a half thousand English names, many of them a street and a
 *   building. A near match over that many names would answer ordinary sentences with a random
 *   stop, so a bus stop is reached only by its own name, typed out.
 *
 * Bays are one destination: "Gold Souq Bus Station 4", "… 5" and "… 7" are where a bus pulls in,
 * not where a traveller is going. They are folded into one place at the middle of the bays, and
 * the planner walks from there to whichever bay the route uses.
 */

interface NetworkNode {
  readonly id: string;
  readonly name: LocalisedName;
  readonly location: LatLng;
  readonly modes: readonly TransportMode[];
}

export interface TransitPlace {
  readonly place: DubaiPlace;
  /**
   * The name with the bay and the "Bus Station" taken off — what decides whether this is simply a
   * curated place under another name ("BurJuman Metro Bus Stop" is BurJuman).
   */
  readonly core: string;
  /** A metro or tram station: matched like a curated place, near spellings included. */
  readonly named: boolean;
}

/** "… 4", "… 12-1", "Civil Defence1": a bay, not a place. */
function withoutBay(name: string): string {
  return name
    .replace(/-\d+$/, '')
    .replace(/\s?\d+$/, '')
    .trim();
}

/** What says the kind of stop rather than which one. */
const STOP_WORDS =
  /\s*\b(metro\s+bus\s+stop|metro\s+station|bus\s+station|bus\s+stop|metro|station|stop)$/i;

function core(name: string): string {
  return name.replace(STOP_WORDS, '').trim();
}

/** The specific part of "International City, Dragon Mart": the last one, after the area. */
function lastPart(name: string): string | undefined {
  const parts = name.split(',').map((part) => part.trim());
  return parts.length > 1 ? parts.at(-1) : undefined;
}

function aliasesOf(name: string): string[] {
  const out = new Set<string>([name]);
  const bare = core(name);
  if (bare !== '' && bare !== name) out.add(bare);
  for (const form of [...out]) {
    // "Dubai Healthcare City" is "Healthcare City" to everyone standing in Dubai.
    const local = form.replace(/^dubai\s+/i, '');
    if (local !== form && local.split(' ').length >= 2) out.add(local);
  }
  const last = lastPart(bare);
  if (last !== undefined) out.add(last);
  // The RTA writes "Al Nahda" and "Al Rashidiya"; in Dubai's own speech it is Nahda and
  // Rashidiya (the owner, 1 October). Either is the same place, whichever way it is written.
  for (const form of [...out]) {
    const plain = form.replace(/^al[\s-]+/i, '');
    if (plain !== form && plain.length >= 5) out.add(plain);
  }
  return [...out];
}

/** Words that say what kind of place it is, never which one. A stop named only these is no name. */
const GENERIC = new Set([
  'al',
  'the',
  'of',
  'and',
  'city',
  'mall',
  'park',
  'school',
  'masjid',
  'mosque',
  'hospital',
  'tower',
  'towers',
  'building',
  'street',
  'road',
  'gate',
  'entrance',
  'ent',
  'centre',
  'center',
  'hotel',
  'village',
  'garden',
  'gardens',
  'beach',
  'souq',
  'souk',
  'market',
  'area',
  'bus',
  'metro',
  'station',
  'stop',
  'clinic',
  'office',
  'bank',
  'roundabout',
  'signal',
  'junction',
]);

/** True for an alias that is only kind-words and numbers: "Bus Station", "Street 5", "Mall". */
export function isGeneric(alias: string): boolean {
  const words = alias
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');
  return words.every((word) => GENERIC.has(word) || /^\d+$/.test(word));
}

function middle(points: readonly LatLng[]): LatLng {
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function transitPlaces(rawNetwork: unknown): readonly TransitPlace[] {
  const nodes = (rawNetwork as { readonly nodes?: readonly NetworkNode[] }).nodes ?? [];
  const out: TransitPlace[] = [];

  for (const node of nodes) {
    if (!node.modes.includes('metro') && !node.modes.includes('tram')) continue;
    out.push({
      place: {
        id: `stop:${node.id}`,
        name: {
          en: node.name.en,
          hi: node.name.hi,
          aliases: [...new Set([...aliasesOf(node.name.en), ...node.name.aliases])],
        },
        kind: 'transport',
        location: node.location,
      },
      core: core(node.name.en),
      named: true,
    });
  }

  const bays = new Map<string, NetworkNode[]>();
  for (const node of nodes) {
    if (node.modes.length !== 1 || node.modes[0] !== 'bus') continue;
    const name = withoutBay(node.name.en);
    if (name === '') continue;
    const group = bays.get(name) ?? [];
    group.push(node);
    bays.set(name, group);
  }
  for (const [name, group] of bays) {
    const first = group[0];
    if (first === undefined) continue;
    out.push({
      place: {
        id: `stop:${slug(name)}`,
        // A stop the RTA names only in English keeps that name in both interfaces: the name we
        // ship, never a guess at how its letters would be written (owner, 16 September).
        name: {
          en: name,
          hi: group.length === 1 && first.name.hi !== first.name.en ? first.name.hi : name,
          aliases: aliasesOf(name),
        },
        kind: 'transport',
        location: middle(group.map((node) => node.location)),
      },
      core: core(name),
      named: false,
    });
  }
  return out;
}

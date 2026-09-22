import type { DubaiPlace, LatLng, Route, RouteLeg, TransportMode } from '@saathi/shared';
import { metresBetween, type TransportNetwork } from './network.js';
import type { FarePack } from './fares.js';
import { meteredMetres, taxiFareBand } from './taxiFare.js';

/**
 * How a traveller gets from where they are standing to where they said they want to go —
 * computed on the phone, from the pack, with the radio off (CLAUDE.md rule 1, non-negotiable).
 *
 * There is no routing API call here and there never will be. The network is the RTA's whole
 * one — 2,500 stops, 6,400 hops — and Dijkstra over it with a heap and a spatial index still
 * costs less than a frame, so the honest thing is to do the work locally and say plainly that
 * the numbers are estimates, rather than to promise live times this product cannot deliver in
 * a metro tunnel.
 */

/** The two ends of the journey are places, not stations, so they join the graph as nodes. */
export const ORIGIN_NODE_ID = 'origin';
export const DESTINATION_NODE_ID = 'destination';

/** As far as we will ask anyone to walk to reach a station or a stop. */
const ACCESS_METRES = 1500;
/** Two stops close enough to change between on foot — a metro station and its bus bay. */
const TRANSFER_METRES = 400;
/** Beyond this, "just walk" stops being an answer: Dubai is 40°C for half the year. */
const DIRECT_WALK_METRES = 2000;
/**
 * The pack covers Dubai. A traveller testing the app in Pune is not a traveller we can route,
 * and inventing a 1,900 km taxi fare would be worse than saying so (CLAUDE.md: never tell a
 * traveller something we have not checked).
 */
const SERVICE_AREA_METRES = 60_000;

export type RouteBadge = 'easiest' | 'fastest' | 'cheapest';

/** A leg, plus the things the screen has to say about it that a bare leg cannot. */
export interface PlannedLeg extends RouteLeg {
  /** Stations or stops passed, so 2.2 can say "रेड लाइन · 4 स्टेशन". */
  readonly stops: number;
  readonly distanceM: number;
  /** Which way the vehicle is headed, for "Expo की ओर" (`TransportLine.towards`). */
  readonly direction?: 0 | 1;
  /** First and last departure from the boarding stop on this line, weekday, Dubai clock. */
  readonly firstDeparture?: string;
  readonly lastDeparture?: string;
}

export interface PlannedRoute extends Omit<Route, 'legs'> {
  readonly legs: readonly PlannedLeg[];
}

export type RouteOptionId = 'metro' | 'bus' | 'walk' | 'taxi';

export interface RouteOption {
  readonly id: RouteOptionId;
  /** The mode the card is named after — the one the traveller would describe the trip by. */
  readonly mode: TransportMode;
  readonly route: PlannedRoute;
  /** A meter is a range, not a number. For everything else the two are equal. */
  readonly fareAedMin: number;
  readonly fareAedMax: number;
  readonly distanceM: number;
  readonly badges: readonly RouteBadge[];
}

interface Link {
  readonly to: string;
  readonly seconds: number;
  readonly mode: TransportMode;
  readonly line: string | undefined;
  readonly distanceM: number;
  readonly direction?: 0 | 1;
  readonly firstDeparture?: string;
  readonly lastDeparture?: string;
}

type Graph = ReadonlyMap<string, readonly Link[]>;

function walkSeconds(network: TransportNetwork, metres: number): number {
  return Math.max(60, Math.round((metres / network.walkingMetresPerMinute) * 60));
}

function push(graph: Map<string, Link[]>, from: string, link: Link): void {
  const links = graph.get(from);
  if (links) links.push(link);
  else graph.set(from, [link]);
}

/**
 * Stops bucketed onto a grid about 400 m square, so finding the stops near a point reads nine
 * cells instead of all 2,500 rows. One degree of latitude is 111 km; at Dubai's latitude a
 * degree of longitude is about 100 km, which the same cell size covers with room to spare.
 */
const CELL_DEGREES = 0.0036;

class StopIndex {
  private readonly cells = new Map<string, TransportNetwork['nodes'][number][]>();

  constructor(private readonly network: TransportNetwork) {
    for (const node of network.nodes) {
      const key = StopIndex.key(node.location);
      const cell = this.cells.get(key);
      if (cell) cell.push(node);
      else this.cells.set(key, [node]);
    }
  }

  private static key(at: LatLng): string {
    return `${String(Math.floor(at.lat / CELL_DEGREES))}:${String(Math.floor(at.lng / CELL_DEGREES))}`;
  }

  /** Every stop within `metres` of a point, with its distance. */
  within(
    at: LatLng,
    metres: number,
  ): readonly { readonly node: TransportNetwork['nodes'][number]; readonly metres: number }[] {
    const reach = Math.ceil(metres / (CELL_DEGREES * 100_000));
    const latCell = Math.floor(at.lat / CELL_DEGREES);
    const lngCell = Math.floor(at.lng / CELL_DEGREES);
    const found: { node: TransportNetwork['nodes'][number]; metres: number }[] = [];
    for (let dLat = -reach; dLat <= reach; dLat++) {
      for (let dLng = -reach; dLng <= reach; dLng++) {
        for (const node of this.cells.get(`${String(latCell + dLat)}:${String(lngCell + dLng)}`) ??
          []) {
          const distance = metresBetween(at, node.location);
          if (distance <= metres) found.push({ node, metres: distance });
        }
      }
    }
    return found;
  }

  nearestMetres(at: LatLng): number {
    let best = Infinity;
    for (const node of this.network.nodes) best = Math.min(best, metresBetween(at, node.location));
    return best;
  }
}

interface Prepared {
  readonly graph: Graph;
  readonly index: StopIndex;
  readonly headway: ReadonlyMap<string, number>;
}

/**
 * The timetable as a graph: every hop of every line in the direction it runs, plus the short
 * walks between stops that are near enough to change at. Built once per pack and kept, because
 * the pack does not change between screens and the transfer walks are the expensive part.
 */
const prepared = new WeakMap<TransportNetwork, Prepared>();

function prepare(network: TransportNetwork): Prepared {
  const cached = prepared.get(network);
  if (cached) return cached;

  const graph = new Map<string, Link[]>();
  const byId = new Map(network.nodes.map((node) => [node.id, node]));
  const index = new StopIndex(network);

  for (const edge of network.edges) {
    const from = byId.get(edge.fromNodeId);
    const to = byId.get(edge.toNodeId);
    if (!from || !to) continue;
    push(graph, edge.fromNodeId, {
      to: edge.toNodeId,
      seconds: edge.durationSeconds,
      mode: edge.mode,
      line: edge.line,
      distanceM: metresBetween(from.location, to.location),
      ...(edge.direction === undefined ? {} : { direction: edge.direction }),
      ...(edge.firstDeparture === undefined ? {} : { firstDeparture: edge.firstDeparture }),
      ...(edge.lastDeparture === undefined ? {} : { lastDeparture: edge.lastDeparture }),
    });
  }

  for (const a of network.nodes) {
    for (const { node: b, metres } of index.within(a.location, TRANSFER_METRES)) {
      if (a.id === b.id) continue;
      push(graph, a.id, {
        to: b.id,
        seconds: walkSeconds(network, metres),
        mode: 'walk',
        line: undefined,
        distanceM: metres,
      });
    }
  }

  const headway = new Map<string, number>();
  for (const line of network.lines) {
    if (line.headwaySeconds !== undefined) headway.set(line.id, line.headwaySeconds);
  }

  const result = { graph, index, headway };
  prepared.set(network, result);
  return result;
}

interface Step {
  readonly link: Link;
  readonly from: string;
}

/** A binary heap of search states, smallest cost first. */
class Heap {
  private readonly items: { key: string; cost: number }[] = [];

  push(key: string, cost: number): void {
    const items = this.items;
    items.push({ key, cost });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const child = items[i];
      const above = items[parent];
      if (!child || !above || above.cost <= child.cost) break;
      items[i] = above;
      items[parent] = child;
      i = parent;
    }
  }

  pop(): { key: string; cost: number } | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (top === undefined || last === undefined) return top;
    if (items.length === 0) return top;
    items[0] = last;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      const l = items[left];
      const r = items[right];
      const s = items[smallest];
      if (l && s && l.cost < s.cost) smallest = left;
      const s2 = items[smallest];
      if (r && s2 && r.cost < s2.cost) smallest = right;
      if (smallest === i) break;
      const a = items[i];
      const b = items[smallest];
      if (!a || !b) break;
      items[i] = b;
      items[smallest] = a;
      i = smallest;
    }
    return top;
  }

  get size(): number {
    return this.items.length;
  }
}

/**
 * Dijkstra, with the line a traveller is already sitting on as part of the state. Without it
 * the search cannot tell "stay on the Red Line" from "get off and wait for it again", and the
 * wait it charges for changing would be charged on every station.
 */
function search(
  network: TransportNetwork,
  ready: Prepared,
  graph: Graph,
  allowed: ReadonlySet<TransportMode>,
): readonly Step[] | null {
  const startKey = `${ORIGIN_NODE_ID}|||`;
  const best = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, { readonly key: string; readonly step: Step }>();
  const heap = new Heap();
  heap.push(startKey, 0);
  const settled = new Set<string>();
  let endKey: string | null = null;

  while (heap.size > 0) {
    const top = heap.pop();
    if (!top) break;
    const { key, cost } = top;
    if (settled.has(key)) continue;
    settled.add(key);

    const [node, line, boarded, walked] = key.split('|');
    if (node === undefined) continue;
    // Only a journey that boarded something counts. Without this the metro search happily
    // returns the walk that happens to be quicker, the card is dropped for having no train in
    // it, and a traveller who asked how to get somewhere is shown a taxi and nothing else.
    if (node === DESTINATION_NODE_ID && boarded === 'on') {
      endKey = key;
      break;
    }

    for (const link of graph.get(node) ?? []) {
      if (!allowed.has(link.mode)) continue;
      // A walk never follows a walk: the short transfers between neighbouring stops would
      // otherwise chain into a two-kilometre hike that no card should be offering.
      if (link.mode === 'walk' && walked === 'w') continue;
      // Boarding costs what standing on the platform costs: half the line's measured headway
      // when the feed gave one, the mode's usual wait when it did not. Staying aboard is free.
      const boarding =
        link.mode !== 'walk' && link.line !== line ? waitFor(network, ready, link) : 0;
      const seconds = link.seconds + boarding;
      // Walking resets the line: once you are off the train, the next one has to be waited for.
      const nextLine = link.mode === 'walk' ? '' : (link.line ?? '');
      const nextKey = `${link.to}|${nextLine}|${link.mode === 'walk' ? (boarded ?? '') : 'on'}|${link.mode === 'walk' ? 'w' : ''}`;
      const next = cost + seconds;
      if (next >= (best.get(nextKey) ?? Infinity)) continue;
      best.set(nextKey, next);
      cameFrom.set(nextKey, { key, step: { link: { ...link, seconds }, from: node } });
      heap.push(nextKey, next);
    }
  }

  if (endKey === null) return null;
  const steps: Step[] = [];
  let key = endKey;
  for (;;) {
    const previous = cameFrom.get(key);
    if (!previous) break;
    steps.unshift(previous.step);
    key = previous.key;
  }
  return steps.length > 0 ? steps : null;
}

function waitFor(network: TransportNetwork, ready: Prepared, link: Link): number {
  const headway = link.line === undefined ? undefined : ready.headway.get(link.line);
  if (headway !== undefined) return Math.max(60, Math.round(headway / 2));
  return network.waitSeconds[link.mode === 'metro' || link.mode === 'tram' ? 'metro' : 'bus'];
}

/** Consecutive steps on the same line are one leg — that is how a traveller reads a journey. */
function toLegs(steps: readonly Step[]): readonly PlannedLeg[] {
  const legs: PlannedLeg[] = [];
  for (const step of steps) {
    const last = legs.at(-1);
    if (last?.mode === step.link.mode && last.line === step.link.line) {
      legs[legs.length - 1] = {
        ...last,
        toNodeId: step.link.to,
        durationSeconds: last.durationSeconds + step.link.seconds,
        stops: last.stops + 1,
        distanceM: last.distanceM + step.link.distanceM,
      };
      continue;
    }
    const { link } = step;
    legs.push({
      mode: link.mode,
      fromNodeId: step.from,
      toNodeId: link.to,
      durationSeconds: link.seconds,
      stops: 1,
      distanceM: link.distanceM,
      ...(link.line === undefined ? {} : { line: link.line }),
      ...(link.direction === undefined ? {} : { direction: link.direction }),
      ...(link.firstDeparture === undefined ? {} : { firstDeparture: link.firstDeparture }),
      ...(link.lastDeparture === undefined ? {} : { lastDeparture: link.lastDeparture }),
    });
  }
  return legs;
}

function fareForDistance(fares: FarePack, metres: number): number {
  const km = metres / 1000;
  for (const band of fares.transitBandsAed) {
    if (km <= band.maxKm) return band.aed;
  }
  return fares.transitBandsAed.at(-1)?.aed ?? 0;
}

function assemble(id: RouteOptionId, legs: readonly PlannedLeg[], fare: number): RouteOption {
  const transit = legs.filter((leg) => leg.mode !== 'walk');
  const totalDurationSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);
  const walkingSeconds = legs
    .filter((leg) => leg.mode === 'walk')
    .reduce((sum, leg) => sum + leg.durationSeconds, 0);
  return {
    id,
    mode: transit[0]?.mode ?? 'walk',
    route: {
      id,
      legs,
      totalDurationSeconds,
      totalFareAed: fare,
      walkingSeconds,
      interchangeCount: Math.max(0, transit.length - 1),
    },
    fareAedMin: fare,
    fareAedMax: fare,
    distanceM: legs.reduce((sum, leg) => sum + leg.distanceM, 0),
    badges: [],
  };
}

/** The modes each card may ride. The tram is part of the metro answer: it is Nol, rail and a change at DMCC. */
const RIDES: Readonly<Record<'metro' | 'bus', readonly TransportMode[]>> = {
  metro: ['metro', 'tram'],
  bus: ['bus'],
};

/**
 * Every way a traveller could make this journey, best first, with the badge that says why each
 * one is on the list. Returns an empty list rather than a guess when the traveller is outside
 * the area the pack covers — the screen then says so instead of showing a fare it invented.
 */
export function planRoutes(
  network: TransportNetwork,
  origin: LatLng,
  destination: DubaiPlace,
  fares: FarePack,
): readonly RouteOption[] {
  const ready = prepare(network);
  const nearest = ready.index.nearestMetres(origin);
  if (!Number.isFinite(nearest) || nearest > SERVICE_AREA_METRES) return [];

  const directM = metresBetween(origin, destination.location);
  // The journey's own ends join a copy of the graph, so the shared one stays clean.
  const graph = new Map<string, Link[]>();
  for (const [from, links] of ready.graph) graph.set(from, [...links]);

  for (const { node, metres } of ready.index.within(origin, ACCESS_METRES)) {
    push(graph, ORIGIN_NODE_ID, {
      to: node.id,
      seconds: walkSeconds(network, metres),
      mode: 'walk',
      line: undefined,
      distanceM: metres,
    });
  }
  for (const { node, metres } of ready.index.within(destination.location, ACCESS_METRES)) {
    push(graph, node.id, {
      to: DESTINATION_NODE_ID,
      seconds: walkSeconds(network, metres),
      mode: 'walk',
      line: undefined,
      distanceM: metres,
    });
  }

  const candidates: RouteOption[] = [];

  for (const id of ['metro', 'bus'] as const) {
    const rides = RIDES[id];
    const steps = search(network, ready, graph, new Set<TransportMode>(['walk', ...rides]));
    if (steps === null) continue;
    const legs = toLegs(steps);
    // A path that never boards anything is a walk, not a metro journey. Offering it as one
    // would put "मेट्रो" on a card with no train in it.
    const ridden = legs.filter((leg) => rides.includes(leg.mode));
    if (ridden.length === 0) continue;
    const riddenM = ridden.reduce((sum, leg) => sum + leg.distanceM, 0);
    candidates.push(assemble(id, legs, fareForDistance(fares, riddenM)));
  }

  if (directM <= DIRECT_WALK_METRES) {
    candidates.push(
      assemble(
        'walk',
        [
          {
            mode: 'walk',
            fromNodeId: ORIGIN_NODE_ID,
            toNodeId: DESTINATION_NODE_ID,
            durationSeconds: walkSeconds(network, directM),
            stops: 1,
            distanceM: directM,
          },
        ],
        0,
      ),
    );
  }

  // The taxi is always there, and it is the reason this screen can never be empty inside Dubai.
  const fare = taxiFareBand(fares.taxi, directM);
  const taxiOption = assemble(
    'taxi',
    [
      {
        mode: 'taxi',
        fromNodeId: ORIGIN_NODE_ID,
        toNodeId: DESTINATION_NODE_ID,
        // 32 km/h is what Dubai traffic actually averages across a day, over the distance the
        // road covers rather than the straight line between the pins.
        durationSeconds: Math.max(300, Math.round((meteredMetres(directM) / 1000 / 32) * 3600)),
        stops: 1,
        distanceM: directM,
      },
    ],
    fare.likely,
  );

  const quickest = [...candidates].sort(
    (a, b) => a.route.totalDurationSeconds - b.route.totalDurationSeconds,
  );
  const options = [
    ...quickest.slice(0, 2),
    { ...taxiOption, fareAedMin: fare.min, fareAedMax: fare.max },
  ];
  return withBadges(options);
}

/**
 * A badge is awarded only where it is true. If one option is both the fastest and the cheapest
 * it carries both, and another carries none — better a card with no label than a label that
 * calls the slower journey "सबसे तेज़".
 */
function withBadges(options: readonly RouteOption[]): readonly RouteOption[] {
  if (options.length === 0) return options;

  const pick = (better: (a: RouteOption, b: RouteOption) => boolean): RouteOption =>
    options.reduce((best, option) => (better(option, best) ? option : best));

  const fastest = pick((a, b) => a.route.totalDurationSeconds < b.route.totalDurationSeconds);
  const cheapest = pick((a, b) => a.fareAedMax < b.fareAedMax);
  // "Easiest" is the one with the least to go wrong: fewest legs, then fewest changes, then
  // the least walking. A traveller with a suitcase reads the card in that order.
  const easiest = pick((a, b) =>
    lexLess(
      [a.route.legs.length, a.route.interchangeCount, a.route.walkingSeconds],
      [b.route.legs.length, b.route.interchangeCount, b.route.walkingSeconds],
    ),
  );

  return options.map((option) => {
    const badges: RouteBadge[] = [];
    // A taxi is almost always both, and saying so twice on one card tells a traveller nothing
    // the second label did not already say. The stronger, more concrete claim wins.
    if (option === easiest && option !== fastest) badges.push('easiest');
    if (option === fastest) badges.push('fastest');
    if (option === cheapest) badges.push('cheapest');
    return { ...option, badges };
  });
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left < right;
  }
  return false;
}

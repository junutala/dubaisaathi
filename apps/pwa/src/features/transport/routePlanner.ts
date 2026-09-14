import type { DubaiPlace, LatLng, Route, RouteLeg, TransportMode } from '@saathi/shared';
import { metresBetween, type TransportNetwork } from './network.js';

/**
 * How a traveller gets from where they are standing to where they said they want to go —
 * computed on the phone, from the pack, with the radio off (CLAUDE.md rule 1, non-negotiable).
 *
 * There is no routing API call here and there never will be. The network is small enough that
 * Dijkstra over it costs less than a frame, so the honest thing is to do the work locally and
 * say plainly that the numbers are estimates, rather than to promise live times this product
 * cannot deliver in a metro tunnel.
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

/** A leg, plus the two things the screen has to say about it that a bare leg cannot. */
export interface PlannedLeg extends RouteLeg {
  /** Stations or stops passed, so 1.3 can say "रेड लाइन · 4 स्टेशन". */
  readonly stops: number;
  readonly distanceM: number;
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
 * The timetable as a graph: every line in both directions, plus the short walks between stops
 * that are near enough to change at. Built once per plan — the whole network is sixty edges.
 */
function buildGraph(network: TransportNetwork): Map<string, Link[]> {
  const graph = new Map<string, Link[]>();
  const byId = new Map(network.nodes.map((node) => [node.id, node]));

  for (const edge of network.edges) {
    const from = byId.get(edge.fromNodeId);
    const to = byId.get(edge.toNodeId);
    if (!from || !to) continue;
    const distanceM = metresBetween(from.location, to.location);
    const both = { seconds: edge.durationSeconds, mode: edge.mode, line: edge.line, distanceM };
    push(graph, edge.fromNodeId, { ...both, to: edge.toNodeId });
    push(graph, edge.toNodeId, { ...both, to: edge.fromNodeId });
  }

  for (const a of network.nodes) {
    for (const b of network.nodes) {
      if (a.id === b.id) continue;
      const metres = metresBetween(a.location, b.location);
      if (metres > TRANSFER_METRES) continue;
      push(graph, a.id, {
        to: b.id,
        seconds: walkSeconds(network, metres),
        mode: 'walk',
        line: undefined,
        distanceM: metres,
      });
    }
  }
  return graph;
}

interface Step {
  readonly link: Link;
  readonly from: string;
}

/**
 * Dijkstra, with the line a traveller is already sitting on as part of the state. Without it
 * the search cannot tell "stay on the Red Line" from "get off and wait for it again", and the
 * wait it charges for changing would be charged on every station.
 */
function search(
  network: TransportNetwork,
  graph: Graph,
  allowed: ReadonlySet<TransportMode>,
): readonly Step[] | null {
  const startKey = `${ORIGIN_NODE_ID}||`;
  const best = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, { readonly key: string; readonly step: Step }>();
  const open = new Set<string>([startKey]);
  let endKey: string | null = null;

  while (open.size > 0) {
    let key: string | null = null;
    let cost = Infinity;
    for (const candidate of open) {
      const seen = best.get(candidate) ?? Infinity;
      if (seen < cost) {
        cost = seen;
        key = candidate;
      }
    }
    if (key === null) break;
    open.delete(key);

    const [node, line, boarded] = key.split('|');
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
      // Boarding costs what standing on the platform costs. Staying aboard costs nothing.
      const boarding =
        link.mode !== 'walk' && link.line !== line
          ? network.waitSeconds[link.mode === 'metro' ? 'metro' : 'bus']
          : 0;
      const seconds = link.seconds + boarding;
      // Walking resets the line: once you are off the train, the next one has to be waited for.
      const nextLine = link.mode === 'walk' ? '' : (link.line ?? '');
      const nextKey = `${link.to}|${nextLine}|${link.mode === 'walk' ? (boarded ?? '') : 'on'}`;
      const next = cost + seconds;
      if (next >= (best.get(nextKey) ?? Infinity)) continue;
      best.set(nextKey, next);
      cameFrom.set(nextKey, { key, step: { link: { ...link, seconds }, from: node } });
      open.add(nextKey);
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
    legs.push({
      mode: step.link.mode,
      fromNodeId: step.from,
      toNodeId: step.link.to,
      durationSeconds: step.link.seconds,
      stops: 1,
      distanceM: step.link.distanceM,
      ...(step.link.line === undefined ? {} : { line: step.link.line }),
    });
  }
  return legs;
}

function fareForDistance(network: TransportNetwork, metres: number): number {
  const km = metres / 1000;
  for (const band of network.fares.transitBandsAed) {
    if (km <= band.maxKm) return band.aed;
  }
  return network.fares.transitBandsAed.at(-1)?.aed ?? 0;
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

/** Fares are read off a card, not a receipt: whole dirhams is the honest precision here. */
function roundFare(aed: number): number {
  return Math.round(aed);
}

/**
 * Every way a traveller could make this journey, best first, with the badge that says why each
 * one is on the list. Returns an empty list rather than a guess when the traveller is outside
 * the area the pack covers — the screen then says so instead of showing a fare it invented.
 */
export function planRoutes(
  network: TransportNetwork,
  origin: LatLng,
  destination: DubaiPlace,
): readonly RouteOption[] {
  const nearest = Math.min(...network.nodes.map((node) => metresBetween(origin, node.location)));
  if (!Number.isFinite(nearest) || nearest > SERVICE_AREA_METRES) return [];

  const directM = metresBetween(origin, destination.location);
  const graph = buildGraph(network);

  for (const node of network.nodes) {
    const fromOrigin = metresBetween(origin, node.location);
    if (fromOrigin <= ACCESS_METRES) {
      push(graph, ORIGIN_NODE_ID, {
        to: node.id,
        seconds: walkSeconds(network, fromOrigin),
        mode: 'walk',
        line: undefined,
        distanceM: fromOrigin,
      });
    }
    const toDestination = metresBetween(destination.location, node.location);
    if (toDestination <= ACCESS_METRES) {
      push(graph, node.id, {
        to: DESTINATION_NODE_ID,
        seconds: walkSeconds(network, toDestination),
        mode: 'walk',
        line: undefined,
        distanceM: toDestination,
      });
    }
  }

  const candidates: RouteOption[] = [];

  for (const [id, mode] of [
    ['metro', 'metro'],
    ['bus', 'bus'],
  ] as const) {
    const steps = search(network, graph, new Set<TransportMode>(['walk', mode]));
    if (steps === null) continue;
    const legs = toLegs(steps);
    // A path that never boards anything is a walk, not a metro journey. Offering it as one
    // would put "मेट्रो" on a card with no train in it.
    const ridden = legs.filter((leg) => leg.mode === mode);
    if (ridden.length === 0) continue;
    const riddenM = ridden.reduce((sum, leg) => sum + leg.distanceM, 0);
    candidates.push(assemble(id, legs, fareForDistance(network, riddenM)));
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
  const { taxi } = network.fares;
  const taxiFare = Math.max(taxi.minimumAed, taxi.flagFallAed + (directM / 1000) * taxi.perKmAed);
  const spread = taxiFare * (taxi.spreadPercent / 100);
  const taxiOption = assemble(
    'taxi',
    [
      {
        mode: 'taxi',
        fromNodeId: ORIGIN_NODE_ID,
        toNodeId: DESTINATION_NODE_ID,
        // Roads are not straight: a meter runs about a fifth longer than the crow flies, and
        // 32 km/h is what Dubai traffic actually averages across a day.
        durationSeconds: Math.max(300, Math.round(((directM * 1.2) / 1000 / 32) * 3600)),
        stops: 1,
        distanceM: directM,
      },
    ],
    roundFare(taxiFare),
  );

  const quickest = [...candidates].sort(
    (a, b) => a.route.totalDurationSeconds - b.route.totalDurationSeconds,
  );
  const options = [
    ...quickest.slice(0, 2),
    {
      ...taxiOption,
      fareAedMin: roundFare(taxiFare - spread),
      fareAedMax: roundFare(taxiFare + spread),
    },
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

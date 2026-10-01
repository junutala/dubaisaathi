import type { LatLng, LocalisedName, TransportMode, TransportNetwork } from '@saathi/shared';
import { metresBetween } from './network.js';

/**
 * "I'm on this bus" (Sprint 2, the owner's): a countdown of the stops left to the one the
 * traveller gets off at, with a buzz one stop before.
 *
 * It rests on one fact the owner gave on 1 October: **no bus or metro in Dubai skips a stop.**
 * Even with nobody waiting, the doors open and close. So the ride is the line's own stop
 * sequence, and the only question is how far along it the vehicle is. Three things answer it,
 * in this order of trust:
 *
 * 1. **The traveller.** A stop they tap is where they are. A screen that cannot be corrected is
 *    a way out, not a way through.
 * 2. **GPS.** A fix close to one of the next few stops moves the count there. Never backwards:
 *    a fix that drifts behind is the GPS, not the bus.
 * 3. **The timetable.** Underground, or whenever no fix has come for a minute, the RTA's own
 *    running times between stops carry the count on from the last stop anyone was sure of.
 *
 * Pure, so the rules are tested rather than hoped for; the screen only feeds it fixes and ticks.
 */

export interface RideStop {
  readonly id: string;
  readonly name: LocalisedName;
  readonly location: LatLng;
  /** Seconds from the boarding stop to this one, by the RTA's running times. */
  readonly secondsFromStart: number;
}

export interface Ride {
  readonly mode: TransportMode;
  readonly line: string;
  /** Boarding stop first, alighting stop last. */
  readonly stops: readonly RideStop[];
}

/**
 * The stops of one line in one direction, from the boarding stop to the alighting one. A breadth-
 * first walk rather than "follow the next hop", because a few bus lines branch (29 points in the
 * August 2025 feed) and the first hop out of a branch is not always the one the traveller is on.
 */
export function rideOf(
  network: TransportNetwork,
  line: string,
  direction: 0 | 1 | undefined,
  fromNodeId: string,
  toNodeId: string,
): Ride | null {
  const hops = network.edges.filter(
    (edge) =>
      edge.line === line &&
      (direction === undefined || edge.direction === direction) &&
      edge.mode !== 'walk',
  );
  const out = new Map<string, typeof hops>();
  for (const hop of hops) out.set(hop.fromNodeId, [...(out.get(hop.fromNodeId) ?? []), hop]);

  const came = new Map<string, { readonly from: string; readonly seconds: number } | null>([
    [fromNodeId, null],
  ]);
  const queue = [fromNodeId];
  for (let next = 0; next < queue.length && !came.has(toNodeId); next++) {
    const at = queue[next];
    for (const hop of out.get(at ?? '') ?? []) {
      if (came.has(hop.toNodeId)) continue;
      came.set(hop.toNodeId, { from: at ?? '', seconds: hop.durationSeconds });
      queue.push(hop.toNodeId);
    }
  }
  if (!came.has(toNodeId)) return null;

  const ids: string[] = [];
  const legs: number[] = [];
  let id = toNodeId;
  for (;;) {
    ids.unshift(id);
    const step = came.get(id);
    if (!step) break;
    legs.unshift(step.seconds);
    id = step.from;
  }
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  let seconds = 0;
  const stops: RideStop[] = [];
  for (const [index, id] of ids.entries()) {
    const node = nodes.get(id);
    if (!node) return null;
    if (index > 0) seconds += legs[index - 1] ?? 0;
    stops.push({ id, name: node.name, location: node.location, secondsFromStart: seconds });
  }
  const mode = hops[0]?.mode ?? 'bus';
  return stops.length >= 2 ? { mode, line, stops } : null;
}

export type RideHow = 'start' | 'gps' | 'timetable' | 'tapped';

export interface RideProgress {
  /** Index of the stop the vehicle is at, or has most recently passed. */
  readonly at: number;
  /** The last stop someone was sure of, and when: where the timetable counts on from. */
  readonly sureAt: number;
  readonly sureSince: number;
  /** When the last usable fix came, so the timetable only takes over when GPS has gone quiet. */
  readonly lastFix: number;
  readonly how: RideHow;
}

/** How close a fix must be to call a stop reached. Metro platforms sit under long roofs. */
export function reachRadius(mode: TransportMode): number {
  return mode === 'metro' ? 250 : 120;
}

/** A fix worse than this says nothing about which of two neighbouring stops the bus is at. */
export const WORST_USABLE_ACCURACY_M = 300;

/** No fix for this long and the timetable carries the count. */
export const GPS_QUIET_MS = 60_000;

/** How far ahead a fix may jump the count: a gap in fixes can hide a stop or two, not ten. */
const LOOK_AHEAD = 4;

export function startRide(now: number): RideProgress {
  return { at: 0, sureAt: 0, sureSince: now, lastFix: now, how: 'start' };
}

export function onFix(
  progress: RideProgress,
  ride: Ride,
  fix: { readonly at: LatLng; readonly accuracyM: number },
  now: number,
): RideProgress {
  if (fix.accuracyM > WORST_USABLE_ACCURACY_M) return progress;
  const last = ride.stops.length - 1;
  let best = -1;
  let bestM = Infinity;
  for (let index = progress.at; index <= Math.min(last, progress.at + LOOK_AHEAD); index++) {
    const stop = ride.stops[index];
    if (!stop) continue;
    const metres = metresBetween(fix.at, stop.location);
    if (metres < bestM) {
      bestM = metres;
      best = index;
    }
  }
  const heard = { ...progress, lastFix: now };
  if (best < 0 || bestM > reachRadius(ride.mode)) return heard;
  // Standing at a stop keeps it sure for as long as the vehicle waits there.
  return { at: best, sureAt: best, sureSince: now, lastFix: now, how: 'gps' };
}

export function onTick(progress: RideProgress, ride: Ride, now: number): RideProgress {
  if (now - progress.lastFix < GPS_QUIET_MS) return progress;
  const last = ride.stops.length - 1;
  const from = ride.stops[progress.sureAt];
  if (!from) return progress;
  const elapsed = (now - progress.sureSince) / 1000;
  let at = progress.sureAt;
  while (at < last) {
    const next = ride.stops[at + 1];
    if (!next || next.secondsFromStart - from.secondsFromStart > elapsed) break;
    at += 1;
  }
  if (at <= progress.at) return progress;
  return { ...progress, at, how: 'timetable' };
}

/** The traveller's word is the best fix there is. */
export function tapStop(progress: RideProgress, index: number, now: number): RideProgress {
  return { ...progress, at: index, sureAt: index, sureSince: now, how: 'tapped' };
}

export function stopsLeft(progress: RideProgress, ride: Ride): number {
  return Math.max(0, ride.stops.length - 1 - progress.at);
}

/**
 * What the phone should do as the count changes: buzz once when the next stop is theirs, and
 * again when they are there. Never twice for the same moment.
 */
export type RideAlert = 'next-is-yours' | 'you-are-here';

export function alertFor(before: number, after: number): RideAlert | null {
  if (after === before) return null;
  if (after === 0) return 'you-are-here';
  if (after === 1 && before > 1) return 'next-is-yours';
  return null;
}

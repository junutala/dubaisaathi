import { describe, expect, it } from 'vitest';
import type { TransportNetwork } from '@saathi/shared';
import network from '../../../../../data/transport/network.v1.json';
import { parseTransportPack } from './network.js';
import {
  GPS_QUIET_MS,
  alertFor,
  onFix,
  onTick,
  rideOf,
  startRide,
  stopsLeft,
  tapStop,
} from './rideProgress.js';

/**
 * The countdown's rules, on the RTA's own Red Line and on a line drawn for the test. The owner's
 * fact underneath all of it: no bus or metro in Dubai skips a stop.
 */
const rta = parseTransportPack(network);

describe('a ride is the line’s own stops', () => {
  it('runs BurJuman to Burj Khalifa on the Red Line through every station between', () => {
    const ride = rideOf(rta, 'red', 0, 'burjuman', 'burj-khalifa-dubai-mall');
    expect(ride?.stops.map((stop) => stop.id)).toEqual([
      'burjuman',
      'adcb',
      'al-jafiliya',
      'world-trade-centre',
      'emirates-towers',
      'financial-centre',
      'burj-khalifa-dubai-mall',
    ]);
    // The RTA's running times, added up: 138 + 130 + 132 + 113 + 104 + 136.
    expect(ride?.stops.at(-1)?.secondsFromStart).toBe(753);
    expect(ride?.mode).toBe('metro');
  });

  it('refuses a ride the line does not make in that direction', () => {
    expect(rideOf(rta, 'red', 1, 'burjuman', 'burj-khalifa-dubai-mall')).toBeNull();
  });
});

/** Five stops a kilometre apart along a straight road, two minutes each. */
const line: TransportNetwork = {
  ...rta,
  nodes: [0, 1, 2, 3, 4].map((i) => ({
    id: `s${String(i)}`,
    name: { en: `Stop ${String(i)}`, hi: `स्टॉप ${String(i)}`, aliases: [] },
    location: { lat: 25.2, lng: 55.3 + i * 0.01 },
    modes: ['bus'],
  })),
  edges: [0, 1, 2, 3].map((i) => ({
    id: `x:s${String(i)}`,
    fromNodeId: `s${String(i)}`,
    toNodeId: `s${String(i + 1)}`,
    mode: 'bus',
    durationSeconds: 120,
    line: 'X',
    direction: 0,
  })),
};
const ride = rideOf(line, 'X', 0, 's0', 's4')!;
const near = (i: number) => ({ at: { lat: 25.2, lng: 55.3 + i * 0.01 + 0.0002 }, accuracyM: 20 });
const T = 1_000_000;

describe('the count', () => {
  it('starts at the boarding stop with every stop still to go', () => {
    expect(stopsLeft(startRide(T), ride)).toBe(4);
  });

  it('moves to the stop a good fix is beside', () => {
    const p = onFix(startRide(T), ride, near(2), T + 5000);
    expect(p).toMatchObject({ at: 2, how: 'gps' });
    expect(stopsLeft(p, ride)).toBe(2);
  });

  it('never goes backwards on a fix that drifts behind', () => {
    const at3 = onFix(startRide(T), ride, near(3), T);
    expect(onFix(at3, ride, near(1), T + 1000).at).toBe(3);
  });

  it('ignores a fix too vague to tell neighbouring stops apart', () => {
    const vague = { ...near(2), accuracyM: 900 };
    expect(onFix(startRide(T), ride, vague, T).at).toBe(0);
  });

  it('counts on by the timetable once GPS has gone quiet, as underground', () => {
    const start = startRide(T);
    // Live GPS: the timetable waits.
    expect(onTick(start, ride, T + 30_000).at).toBe(0);
    // A minute of silence and 4½ minutes gone: two stops at two minutes each.
    const later = onTick(start, ride, T + Math.max(GPS_QUIET_MS, 270_000));
    expect(later).toMatchObject({ at: 2, how: 'timetable' });
  });

  it('takes the traveller’s tap over anything', () => {
    const tapped = tapStop(onFix(startRide(T), ride, near(3), T), 1, T + 1000);
    expect(tapped).toMatchObject({ at: 1, how: 'tapped' });
    // And the timetable counts on from the tapped stop, not from the boarding one.
    expect(onTick(tapped, ride, T + 1000 + GPS_QUIET_MS + 130_000).at).toBe(2);
  });
});

describe('the buzz', () => {
  it('comes once when the next stop is theirs, and once when they are there', () => {
    expect(alertFor(3, 2)).toBeNull();
    expect(alertFor(2, 1)).toBe('next-is-yours');
    expect(alertFor(1, 1)).toBeNull();
    expect(alertFor(1, 0)).toBe('you-are-here');
  });

  it('still says "you are here" when a gap in fixes skipped the stop before', () => {
    expect(alertFor(2, 0)).toBe('you-are-here');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DubaiPlace, LatLng } from '@saathi/shared';
import { parseTransportPack } from './network.js';
import { planRoutes } from './routePlanner.js';
import { BUNDLED_FARES } from './fares.js';
import { placeById } from './destinations.js';
import { taxiFareBand } from './taxiFare.js';
import network from '../../../../../data/transport/network.v1.json';

/**
 * The promise, under test.
 *
 * A traveller lands in Dubai with no SIM, no roaming and mobile data off, and asks how to get
 * somewhere. Everything else in this product is negotiable; this is not. Nothing else in the
 * suite fails if somebody adds a `fetch` to the planner — so this does.
 *
 * The network is not mocked away, it is made hostile: every way out of the process throws. A
 * journey that quietly depended on one would fail here rather than in a hotel room in Bur Dubai.
 */

const pack = parseTransportPack(network);

/** A hotel room in Bur Dubai — where most of this product's travellers actually wake up. */
const BUR_DUBAI: LatLng = { lat: 25.2637, lng: 55.2972 };

function place(id: string): DubaiPlace {
  const found = placeById(id);
  if (!found) throw new Error(`the place pack has no ${id}`);
  return found;
}

/** Every door out of the process, nailed shut. */
const EXITS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon'] as const;

describe('जाना with the radio off', () => {
  const reached: string[] = [];
  /** Doors jsdom does not have but a real phone does: added so they can be shut, then removed. */
  const fitted: string[] = [];

  beforeEach(() => {
    reached.length = 0;
    fitted.length = 0;
    for (const exit of EXITS) {
      const shut = (...args: unknown[]) => {
        reached.push(typeof args[0] === 'string' ? `${exit}(${args[0]})` : exit);
        throw new Error(`the network was used: ${exit}`);
      };
      if (exit === 'sendBeacon') {
        if (typeof navigator.sendBeacon === 'function') {
          vi.spyOn(navigator, 'sendBeacon').mockImplementation(shut as never);
        } else {
          Object.defineProperty(navigator, 'sendBeacon', { value: shut, configurable: true });
          fitted.push('sendBeacon');
        }
        continue;
      }
      vi.stubGlobal(exit, shut);
    }
    // A phone in aeroplane mode says so, and nothing may wait on it changing.
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const door of fitted) {
      Reflect.deleteProperty(navigator, door);
    }
  });

  it('plans a journey to every place in the pack without one request', () => {
    const ids = ['karama', 'dubai-mall', 'mall-of-emirates', 'dubai-marina', 'gold-souk'];
    for (const id of ids) {
      const options = planRoutes(pack, BUR_DUBAI, place(id), BUNDLED_FARES);
      expect(options.length, id).toBeGreaterThan(0);
      for (const option of options) {
        expect(option.route.totalDurationSeconds, `${id} ${option.id}`).toBeGreaterThan(0);
        // Walking is the one answer that is free, and it must be allowed to say so.
        const floor = option.id === 'walk' ? 0 : 1;
        expect(option.fareAedMax, `${id} ${option.id}`).toBeGreaterThanOrEqual(floor);
      }
    }
    expect(reached).toEqual([]);
  });

  it('compares metro, bus and taxi offline — the three cards the screen shows', () => {
    const options = planRoutes(pack, BUR_DUBAI, place('mall-of-emirates'), BUNDLED_FARES);
    const byId = new Map(options.map((option) => [option.id, option]));
    expect(byId.has('taxi')).toBe(true);
    expect([...byId.keys()].some((id) => id === 'metro' || id === 'bus')).toBe(true);
    for (const option of options) {
      expect(option.fareAedMin).toBeLessThanOrEqual(option.fareAedMax);
    }
    expect(reached).toEqual([]);
  });

  it('quotes a taxi offline, which is the one card that needs no graph at all', () => {
    const band = taxiFareBand(BUNDLED_FARES.taxi, 18_300);
    expect(band.likely).toBeGreaterThan(BUNDLED_FARES.taxi.minimumAed);
    expect(reached).toEqual([]);
  });

  it('names the stops and lines of a journey offline', () => {
    const options = planRoutes(pack, BUR_DUBAI, place('dubai-mall'), BUNDLED_FARES);
    const ride = options.find((option) => option.id === 'metro' || option.id === 'bus');
    expect(ride).toBeDefined();
    // The walking legs at each end join the journey to the traveller and to the door, so they
    // carry the journey's own ends rather than stations. Every ridden leg is a real stop pair.
    const ids = new Set(pack.nodes.map((node) => node.id));
    const ridden = (ride?.route.legs ?? []).filter((leg) => leg.mode !== 'walk');
    expect(ridden.length).toBeGreaterThan(0);
    for (const leg of ridden) {
      expect(ids.has(leg.fromNodeId), leg.fromNodeId).toBe(true);
      expect(ids.has(leg.toNodeId), leg.toNodeId).toBe(true);
    }
    expect(reached).toEqual([]);
  });

  /**
   * The test that proves the others mean something. If the doors were not really shut, every
   * assertion above would pass on a machine with a network and tell us nothing.
   */
  it('really has the network shut — this test fails if the trap is not armed', () => {
    expect(() => globalThis.fetch('https://example.com')).toThrow(/the network was used/);
    expect(reached.length).toBe(1);
    expect(navigator.onLine).toBe(false);
  });
});

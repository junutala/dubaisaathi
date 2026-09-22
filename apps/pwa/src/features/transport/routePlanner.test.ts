import { describe, expect, it } from 'vitest';
import type { DubaiPlace, LatLng } from '@saathi/shared';
import { parseTransportPack } from './network.js';
import { planRoutes } from './routePlanner.js';
import { placeById, placeFromText } from './destinations.js';
import { BUNDLED_FARES } from './fares.js';
import raw from '../../../../../data/transport/network.v1.json';

/**
 * What would actually go wrong for a traveller, rather than what the design says (CLAUDE.md, 13
 * September: two harnesses were built that day and every defect was still found by a person
 * holding a phone, because the harnesses asserted properties that were true while the product
 * was broken).
 *
 * So: a route comes back with the radio off, it is made of legs that join up, the fare is a
 * number a traveller could hand over, and the same place typed two ways plans the same journey.
 */

const network = parseTransportPack(raw);

/** A hotel room in Bur Dubai — where most of this product's travellers actually wake up. */
const BUR_DUBAI: LatLng = { lat: 25.2637, lng: 55.2972 };

function place(id: string): DubaiPlace {
  const found = placeById(id);
  if (!found) throw new Error(`the test fixture expects ${id} to be in the place pack`);
  return found;
}

describe('planning a journey on the device', () => {
  it('answers with the network off — nothing here can reach a server', () => {
    // If any of this needed a network it would need to be async, and it is not: the whole
    // journey is a synchronous function of the pack (rule 1, non-negotiable).
    const options = planRoutes(network, BUR_DUBAI, place('karama'), BUNDLED_FARES);
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((option) => option.route.totalDurationSeconds > 0)).toBe(true);
  });

  it('offers the metro, a bus and a taxi from a hotel in Bur Dubai to Karama', () => {
    const ids = planRoutes(network, BUR_DUBAI, place('karama'), BUNDLED_FARES).map(
      (option) => option.id,
    );
    expect(ids).toContain('taxi');
    expect(ids.length).toBe(3);
  });

  it('gives every leg a start, an end and a time, so the steps screen cannot go blank', () => {
    for (const option of planRoutes(network, BUR_DUBAI, place('dubai-mall'), BUNDLED_FARES)) {
      expect(option.route.legs.length, option.id).toBeGreaterThan(0);
      for (const leg of option.route.legs) {
        expect(leg.fromNodeId, option.id).not.toBe('');
        expect(leg.toNodeId, option.id).not.toBe('');
        expect(leg.durationSeconds, `${option.id}/${leg.mode}`).toBeGreaterThan(0);
      }
    }
  });

  it('joins the legs up: each one starts where the last one ended', () => {
    for (const option of planRoutes(network, BUR_DUBAI, place('mall-of-emirates'), BUNDLED_FARES)) {
      const legs = option.route.legs;
      expect(legs[0]?.fromNodeId, option.id).toBe('origin');
      expect(legs.at(-1)?.toNodeId, option.id).toBe('destination');
      for (let i = 1; i < legs.length; i++) {
        expect(legs[i]?.fromNodeId, `${option.id} leg ${String(i)}`).toBe(legs[i - 1]?.toNodeId);
      }
    }
  });

  it('quotes a fare a traveller could hand over, and a range for the meter', () => {
    const options = planRoutes(network, BUR_DUBAI, place('karama'), BUNDLED_FARES);
    const taxi = options.find((option) => option.id === 'taxi');
    expect(taxi?.fareAedMin).toBeGreaterThan(0);
    expect(taxi?.fareAedMax).toBeGreaterThan(taxi?.fareAedMin ?? 0);
    const metro = options.find((option) => option.id === 'metro');
    if (metro) {
      expect(metro.fareAedMin).toBe(metro.fareAedMax);
      expect(metro.fareAedMin).toBeGreaterThan(0);
      expect(metro.fareAedMin).toBeLessThanOrEqual(10);
    }
  });

  it('never puts a mode on a card the journey does not use', () => {
    for (const option of planRoutes(network, BUR_DUBAI, place('dubai-marina'), BUNDLED_FARES)) {
      if (option.id === 'metro') {
        expect(
          option.route.legs.some((leg) => leg.mode === 'metro' || leg.mode === 'tram'),
          option.id,
        ).toBe(true);
      }
      if (option.id === 'bus') {
        expect(
          option.route.legs.some((leg) => leg.mode === 'bus'),
          option.id,
        ).toBe(true);
      }
    }
  });

  /** Every badge on the screen has to be true, or the screen is lying about the trade-off. */
  it('awards each badge to the option that actually wins it', () => {
    const options = planRoutes(network, BUR_DUBAI, place('mall-of-emirates'), BUNDLED_FARES);
    const fastest = Math.min(...options.map((o) => o.route.totalDurationSeconds));
    const cheapest = Math.min(...options.map((o) => o.fareAedMax));
    for (const option of options) {
      if (option.badges.includes('fastest')) {
        expect(option.route.totalDurationSeconds, option.id).toBe(fastest);
      }
      if (option.badges.includes('cheapest')) expect(option.fareAedMax, option.id).toBe(cheapest);
    }
    expect(options.filter((o) => o.badges.includes('fastest')).length).toBe(1);
    expect(options.filter((o) => o.badges.includes('cheapest')).length).toBe(1);
  });

  /**
   * Jumeirah has no metro station and Global Village has none within twelve kilometres. A
   * traveller must still be told how to get there, because the alternative is a blank screen
   * for two of the twelve places we ship.
   */
  it.each([['jumeirah'], ['global-village']])(
    'still answers for %s, which no metro line reaches',
    (id) => {
      expect(planRoutes(network, BUR_DUBAI, place(id), BUNDLED_FARES).length).toBeGreaterThan(0);
    },
  );

  it('answers for all twelve places in the pack, from a hotel in Bur Dubai', () => {
    for (const id of [
      'karama',
      'bur-dubai',
      'deira',
      'dubai-mall',
      'marina-mall',
      'mall-of-emirates',
      'dubai-marina',
      'burj-khalifa',
      'jumeirah',
      'global-village',
      'dxb-airport',
      'gold-souk',
    ]) {
      expect(planRoutes(network, BUR_DUBAI, place(id), BUNDLED_FARES).length, id).toBeGreaterThan(
        0,
      );
    }
  });

  /**
   * The product is usable in India before the trip (CLAUDE.md, entitlement). A traveller trying
   * it in Pune must not be quoted a 1,900 km taxi fare — an empty list is what lets 1.3 say it
   * could not work the journey out and offer the Arabic instead.
   */
  it('says nothing rather than inventing a journey from outside Dubai', () => {
    expect(
      planRoutes(network, { lat: 18.5204, lng: 73.8567 }, place('karama'), BUNDLED_FARES),
    ).toEqual([]);
  });

  /** Rule 4: the same place typed either way is the same journey, not a near miss. */
  it('plans the same journey from Devanagari and from Hinglish', () => {
    const devanagari = placeFromText('मुझे मॉल ऑफ़ द एमिरेट्स जाना है');
    const roman = placeFromText('mall of emirates jaana hai');
    expect(devanagari?.id).toBe('mall-of-emirates');
    expect(roman?.id).toBe(devanagari?.id);

    const a = planRoutes(network, BUR_DUBAI, devanagari!, BUNDLED_FARES);
    const b = planRoutes(network, BUR_DUBAI, roman!, BUNDLED_FARES);
    expect(a.map((o) => [o.id, o.route.totalDurationSeconds, o.fareAedMax])).toEqual(
      b.map((o) => [o.id, o.route.totalDurationSeconds, o.fareAedMax]),
    );
  });
});

describe('the transport pack', () => {
  it('refuses a pack whose edge points at a station that is not in it', () => {
    expect(() =>
      parseTransportPack({
        ...raw,
        edges: [
          {
            id: 'bad',
            fromNodeId: 'union',
            toNodeId: 'atlantis',
            mode: 'metro',
            durationSeconds: 120,
            line: 'red',
          },
        ],
      }),
    ).toThrow(/atlantis|not in it/);
  });

  it('carries both scripts for every station, because both appear on a screen', () => {
    for (const node of network.nodes) {
      expect(node.name.en.trim(), node.id).not.toBe('');
      expect(node.name.hi.trim(), node.id).not.toBe('');
    }
  });
});

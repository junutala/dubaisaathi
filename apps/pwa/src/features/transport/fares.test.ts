import { describe, expect, it } from 'vitest';
import { BUNDLED_FARES, nolFareAed, parseFarePack, rupees } from './fares.js';
import shipped from '../../../../../data/transport/fares.v1.json';
import network from '../../../../../data/transport/network.v1.json';

/**
 * The tariff is its own pack so that correcting a fare does not republish the graph, and it is
 * charged by zones because that is what the RTA charges by. These pin both.
 */

describe('the fare pack', () => {
  it('carries every tariff the RTA publishes, and quotes Silver', () => {
    expect(BUNDLED_FARES.currency).toBe('AED');
    expect(BUNDLED_FARES.quote).toBe('silver');
    // Transcribed from rta.ae on 22 September 2026. If the RTA moves these, this test is the
    // thing that should be updated first, and deliberately.
    expect(BUNDLED_FARES.nol.silver).toEqual({ oneZone: 3, twoZones: 5, moreZones: 7.5 });
    expect(BUNDLED_FARES.nol.gold).toEqual({ oneZone: 6, twoZones: 10, moreZones: 15 });
    expect(BUNDLED_FARES.nol.redTicket).toEqual({ oneZone: 4, twoZones: 6, moreZones: 8.5 });
    expect(BUNDLED_FARES.nol.redTicketGold).toEqual({ oneZone: 8, twoZones: 12, moreZones: 17 });
    expect(BUNDLED_FARES.journeyRules).toEqual({
      maxTransfers: 3,
      maxJourneyMinutes: 180,
      modeChangeMinutes: 30,
    });
  });

  it('prices by the zones passed, not by how far the journey went', () => {
    expect(nolFareAed(BUNDLED_FARES, 1)).toBe(3);
    expect(nolFareAed(BUNDLED_FARES, 2)).toBe(5);
    expect(nolFareAed(BUNDLED_FARES, 3)).toBe(7.5);
    // Dubai has seven zones and the top band is a ceiling, not a step.
    expect(nolFareAed(BUNDLED_FARES, 7)).toBe(7.5);
    expect(nolFareAed(BUNDLED_FARES, 0)).toBeUndefined();
  });

  it('is small enough that correcting a fare is not a release', () => {
    // The whole point of the split. The RTA re-sets the taxi per-km rate monthly against fuel,
    // and that correction must not cost every phone a megabyte of stations it already has.
    const tariff = JSON.stringify(shipped).length;
    const graph = JSON.stringify(network).length;
    expect(tariff).toBeLessThan(4_000);
    expect(graph / tariff).toBeGreaterThan(100);
  });

  it('is no longer inside the network pack', () => {
    expect(network).not.toHaveProperty('fares');
  });

  it('refuses a tariff that would price a journey wrongly', () => {
    expect(() => parseFarePack({ ...shipped, fareVersion: 0 })).toThrow(/fareVersion/);
    expect(() => parseFarePack({ ...shipped, quote: 'platinum' })).toThrow(/quote/);
    expect(() => parseFarePack({ ...shipped, nol: {} })).toThrow(/silver tariff/);
    expect(() => parseFarePack({ ...shipped, journeyRules: {} })).toThrow(/maxTransfers/);
  });

  /**
   * Two columns transposed is the quietest way to get a tariff wrong: every fare is a real
   * published number, so nothing looks odd, and most journeys are priced incorrectly.
   */
  it('refuses a tariff that charges less for more zones', () => {
    const swapped = { ...shipped.nol.silver, oneZone: 7.5, moreZones: 3 };
    expect(() => parseFarePack({ ...shipped, nol: { ...shipped.nol, silver: swapped } })).toThrow(
      /charges less/,
    );
  });

  /**
   * The defect that put AED 12 in the flag-fall field for a week. AED 12 is the minimum fare;
   * the flag fall is AED 5. Entering one as the other is silent — the totals stay plausible —
   * so the pack refuses it rather than waiting for somebody to notice on a meter.
   */
  it('refuses the minimum fare entered as the flag fall', () => {
    expect(() =>
      parseFarePack({ ...shipped, taxi: { ...shipped.taxi, flagFallAed: 12, minimumAed: 12 } }),
    ).toThrow(/not above the flag fall/);
    expect(() => parseFarePack(shipped)).not.toThrow();
  });
});

describe('rupees beside dirhams (the owner, 25 September)', () => {
  const at = (rate: number) => ({ ...BUNDLED_FARES, inrPerAed: rate });

  it('rounds to the nearest ten rupees, grouped the Indian way', () => {
    expect(rupees(5, at(26))).toBe('130');
    expect(rupees(6, at(26))).toBe('160');
    expect(rupees(38, at(26))).toBe('990');
    expect(rupees(50, at(26))).toBe('1,300');
    expect(rupees(1.5, at(26))).toBe('40');
  });

  it('never calls a price that is not free ≈ ₹0', () => {
    expect(rupees(0.1, at(26))).toBe('10');
    expect(rupees(0, at(26))).toBe('0');
  });

  it('shows nothing rather than a guess when the pack has no rate', () => {
    const { inrPerAed, ...noRate } = BUNDLED_FARES;
    expect(inrPerAed).toBeDefined();
    expect(rupees(5, noRate)).toBeUndefined();
  });

  it('ships the fixed rate, with the day it was fixed', () => {
    expect(BUNDLED_FARES.inrPerAed).toBe(26);
    expect(BUNDLED_FARES.inrRateOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

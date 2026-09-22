import { describe, expect, it } from 'vitest';
import { BUNDLED_FARES, parseFarePack } from './fares.js';
import shipped from '../../../../../data/transport/fares.v1.json';
import network from '../../../../../data/transport/network.v1.json';

/**
 * The tariff is its own pack so that correcting a fare does not republish the graph. These pin
 * both halves of that: the pack the build ships is a real tariff, and the network has stopped
 * carrying one.
 */

describe('the fare pack', () => {
  it('is a tariff, and the build ships a valid one', () => {
    expect(BUNDLED_FARES.currency).toBe('AED');
    expect(BUNDLED_FARES.fareVersion).toBeGreaterThan(0);
    expect(BUNDLED_FARES.transitBandsAed.length).toBeGreaterThan(0);
    expect(BUNDLED_FARES.taxi.minimumAed).toBeGreaterThanOrEqual(BUNDLED_FARES.taxi.flagFallAed);
    expect(Date.parse(BUNDLED_FARES.effectiveFrom)).not.toBeNaN();
  });

  it('is small enough that correcting a fare is not a release', () => {
    // The whole point of the split. The RTA re-sets the per-km rate monthly against fuel, and
    // that correction must not cost every phone a megabyte of stations it already has.
    const tariff = JSON.stringify(shipped).length;
    const graph = JSON.stringify(network).length;
    expect(tariff).toBeLessThan(4_000);
    expect(graph / tariff).toBeGreaterThan(100);
  });

  it('is no longer inside the network pack', () => {
    expect(network).not.toHaveProperty('fares');
  });

  it('refuses a tariff that would price a journey at nothing', () => {
    expect(() => parseFarePack({ ...shipped, transitBandsAed: [] })).toThrow(/Nol bands/);
    expect(() => parseFarePack({ ...shipped, fareVersion: 0 })).toThrow(/fareVersion/);
    expect(() => parseFarePack({ ...shipped, taxi: { ...shipped.taxi, perKmAed: -1 } })).toThrow(
      /perKmAed/,
    );
  });

  /**
   * The defect that put AED 12 in the flag-fall field for a week. AED 12 is the minimum fare;
   * the flag fall is AED 5. Entering one as the other is silent — the totals stay plausible —
   * so the pack refuses it rather than waiting for somebody to notice on a meter.
   */
  it('refuses the minimum fare entered as the flag fall', () => {
    // The exact shape of the live defect: AED 12, the minimum, sitting in both fields.
    expect(() =>
      parseFarePack({ ...shipped, taxi: { ...shipped.taxi, flagFallAed: 12, minimumAed: 12 } }),
    ).toThrow(/not above the flag fall/);
    expect(() =>
      parseFarePack({ ...shipped, taxi: { ...shipped.taxi, flagFallAed: 20, minimumAed: 12 } }),
    ).toThrow(/not above the flag fall/);
    expect(() => parseFarePack(shipped)).not.toThrow();
  });
});

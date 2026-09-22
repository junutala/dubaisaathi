import { describe, expect, it } from 'vitest';
import type { TaxiFare } from '@saathi/shared';
import { ROAD_FACTOR, meteredMetres, taxiFareBand } from './taxiFare.js';

/** The RTA's street-hail tariff as the pack carries it. */
const RTA: TaxiFare = { flagFallAed: 5, perKmAed: 2.2, minimumAed: 12, spreadPercent: 15 };

describe('taxiFareBand', () => {
  it('charges the flag fall plus the road distance, not the straight line', () => {
    // 10 km as the crow flies is 12 km on a meter: 5 + 12 × 2.2 = 31.4.
    expect(taxiFareBand(RTA, 10_000).likely).toBe(31);
    expect(meteredMetres(10_000)).toBe(10_000 * ROAD_FACTOR);
  });

  it('never quotes less than the minimum, at either end of the range', () => {
    // A 500 m hop meters at 6.32, which the floor lifts to 12 — and the spread must not take
    // the bottom of the range back under it. Quoting AED 10 would be quoting a fare that the
    // tariff does not allow to happen.
    const band = taxiFareBand(RTA, 500);
    expect(band.likely).toBe(12);
    expect(band.min).toBe(12);
    expect(band.max).toBe(14);
  });

  it('widens the range as the fare grows, and keeps it the right way round', () => {
    for (const metres of [800, 5_000, 18_000, 40_000]) {
      const band = taxiFareBand(RTA, metres);
      expect(band.min, `${String(metres)} m`).toBeLessThanOrEqual(band.likely);
      expect(band.max, `${String(metres)} m`).toBeGreaterThanOrEqual(band.likely);
    }
    expect(taxiFareBand(RTA, 40_000).max - taxiFareBand(RTA, 40_000).min).toBeGreaterThan(
      taxiFareBand(RTA, 5_000).max - taxiFareBand(RTA, 5_000).min,
    );
  });

  /**
   * The defect this file exists to prevent. 2.3 and 2.4 each worked the fare out for themselves,
   * and disagreed: one allowed for roads not being straight and the other did not. The same
   * journey read AED 45–60 on the options card and AED 50–70 on the taxi card one tap later.
   * There is one function now, so the only way they can differ again is by not calling it.
   */
  it('gives one answer for one journey', () => {
    const optionsCard = taxiFareBand(RTA, 18_300);
    const taxiCard = taxiFareBand(RTA, 18_300);
    expect(optionsCard).toEqual(taxiCard);
    expect(optionsCard.likely).toBe(53);
  });
});

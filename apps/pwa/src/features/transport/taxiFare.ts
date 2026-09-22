import type { TaxiFare } from '@saathi/shared';

/**
 * What a taxi will cost — the one answer, for every screen that quotes one.
 *
 * It lived twice before: the options card on 2.3 and the taxi card on 2.4 each worked it out,
 * and they disagreed. 2.4 allowed for roads not being straight and 2.3 did not, and they rounded
 * to different things, so the same journey read AED 45–60 on the card and AED 50–70 one tap
 * later. A traveller who sees two prices for one trip believes neither, and the second one is
 * the screen they show the driver.
 */

/**
 * Roads are not straight. Every distance this app holds is a straight line between two pins,
 * and a meter runs about a fifth further than that.
 */
export const ROAD_FACTOR = 1.2;

/** The distance a meter will actually count, from the straight line we measured. */
export function meteredMetres(directMetres: number): number {
  return directMetres * ROAD_FACTOR;
}

export interface FareRange {
  /** The middle of the range — what the meter is most likely to read. */
  readonly likely: number;
  readonly min: number;
  readonly max: number;
}

/**
 * A meter is not a timetable, so the answer is a range rather than a number.
 *
 * The RTA's street-hail tariff is a flag fall, a rate per kilometre, and a floor the fare cannot
 * go under however short the trip. The floor binds the bottom of the range too: quoting less than
 * the minimum would be quoting a fare that cannot happen.
 *
 * What is not in here: Salik. A toll gate adds AED 4 off-peak and AED 6 in the peak, and the
 * pack does not know where the gates are or which one a road crosses, so a Sheikh Zayed Road
 * journey is quoted low by that much. Saying so here is better than a number that pretends.
 */
export function taxiFareBand(taxi: TaxiFare, directMetres: number): FareRange {
  const metered = meteredMetres(directMetres) / 1000;
  const likely = Math.max(taxi.minimumAed, taxi.flagFallAed + metered * taxi.perKmAed);
  const spread = likely * (taxi.spreadPercent / 100);
  return {
    likely: Math.round(likely),
    min: Math.round(Math.max(taxi.minimumAed, likely - spread)),
    max: Math.round(likely + spread),
  };
}

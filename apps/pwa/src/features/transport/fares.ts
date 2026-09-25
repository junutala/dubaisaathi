import { NOL_CLASSES, PASS_LENGTHS, type FarePack } from '@saathi/shared';
import { packBody } from '../content/index.js';
import shipped from '../../../../../data/transport/fares.v1.json';

/**
 * What a journey costs, as its own pack (`data/transport/fares.v1.json`).
 *
 * Fares used to ride inside the transport network, so correcting a flag fall republished 1.7 MB
 * of stations to change four numbers. The RTA re-sets the taxi per-km rate every month against
 * fuel; split out, that monthly correction is under a kilobyte and reaches a phone without
 * touching the graph it plans journeys on.
 *
 * It is read here and nowhere else. The planner and the taxi card are handed a pack rather than
 * reaching for one, so a journey and the price on it can never come from different versions —
 * and a test can price a journey against a tariff that is not today's.
 */

export type { FarePack, NolClass, PassLength, ZoneFare } from '@saathi/shared';
export { PASS_LENGTHS } from '@saathi/shared';

/** A price that must be a real amount when it is there at all. */
function checkAmount(value: unknown, what: string): void {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) {
    throw new Error(`fare pack: ${what} is not an amount`);
  }
}

/** Three bands that are all amounts and never fall as the zones rise. */
function checkBands(value: unknown, what: string): void {
  if (typeof value !== 'object' || value === null) throw new Error(`fare pack: no ${what}`);
  const bands = value as Record<string, unknown>;
  let last = 0;
  for (const band of ['oneZone', 'twoZones', 'moreZones'] as const) {
    const aed = bands[band];
    checkAmount(aed, `${what} ${band}`);
    if (typeof aed !== 'number') throw new Error(`fare pack: no ${what} ${band}`);
    if (aed < last) throw new Error(`fare pack: ${what} charges less for ${band}`);
    last = aed;
  }
}

export const FARES_PACK_ID = 'fares';

/**
 * The pack ships as JSON, so nothing about it is checked at build time. A fare that will not
 * parse is worse than a stale one: it prices a real journey at NaN on a screen a traveller is
 * about to show a driver. So the shape is narrowed once, here, and a bad pack is refused.
 */
export function parseFarePack(raw: unknown): FarePack {
  if (typeof raw !== 'object' || raw === null) throw new Error('fare pack: not an object');
  const pack = raw as Record<string, unknown>;

  const fareVersion = pack.fareVersion;
  if (typeof fareVersion !== 'number' || fareVersion <= 0) {
    throw new Error('fare pack: no fareVersion');
  }

  const nol = pack.nol;
  if (typeof nol !== 'object' || nol === null) throw new Error('fare pack: no Nol tariff');
  const classes = nol as Record<string, unknown>;
  for (const name of NOL_CLASSES) {
    const tariff = classes[name];
    if (typeof tariff !== 'object' || tariff === null) {
      throw new Error(`fare pack: no ${name} tariff`);
    }
    const bands = tariff as Record<string, unknown>;
    let last = 0;
    for (const band of ['oneZone', 'twoZones', 'moreZones'] as const) {
      const aed = bands[band];
      if (typeof aed !== 'number' || !(aed > 0)) {
        throw new Error(`fare pack: ${name} ${band} is not a fare`);
      }
      if (aed < last) {
        // Every published tariff charges more for more zones. One that does not has had two
        // columns transposed, which is silent and prices most journeys wrong.
        throw new Error(`fare pack: ${name} charges less for ${band} than for fewer zones`);
      }
      last = aed;
    }
  }

  const quote = pack.quote;
  if (typeof quote !== 'string' || !(NOL_CLASSES as readonly string[]).includes(quote)) {
    throw new Error('fare pack: quote must name one of the Nol classes');
  }

  const rules = pack.journeyRules;
  if (typeof rules !== 'object' || rules === null) throw new Error('fare pack: no journeyRules');
  const limits = rules as Record<string, unknown>;
  for (const field of ['maxTransfers', 'maxJourneyMinutes', 'modeChangeMinutes'] as const) {
    const limit = limits[field];
    if (typeof limit !== 'number' || !(limit > 0)) {
      throw new Error(`fare pack: journeyRules ${field} is not a limit`);
    }
  }

  const taxi: unknown = pack.taxi;
  if (typeof taxi !== 'object' || taxi === null) throw new Error('fare pack: no taxi tariff');
  const tariff = taxi as Record<string, unknown>;
  for (const [field, value] of Object.entries(tariff)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`fare pack: taxi ${field} is not a fare`);
    }
  }

  const minimum = tariff.minimumAed;
  const flagFall = tariff.flagFallAed;
  if (typeof minimum !== 'number' || typeof flagFall !== 'number') {
    throw new Error('fare pack: the taxi tariff has no flag fall or no minimum');
  }
  if (minimum <= flagFall) {
    /**
     * A minimum fare exists because the flag fall plus a short ride comes to less than the
     * tariff will accept. One that is not above the flag fall is not doing anything — which is
     * exactly what AED 12 in both fields looked like for a week, quietly adding AED 7 to every
     * quote. The totals stayed plausible, so nothing but this check would have caught it.
     */
    throw new Error('fare pack: the minimum is not above the flag fall — one of them is the other');
  }

  // What 3.4 · Nol कार्ड shows. Each is optional; one that is there must be right, because the
  // screen prints it as a price a traveller will be asked for at the machine.
  checkAmount(pack.redTicketIssueAed, 'red ticket issue charge');
  checkAmount(pack.minimumBalanceAed, 'minimum balance');
  checkAmount(pack.oneZoneWithinKm, 'one-zone distance');
  checkAmount(pack.inrPerAed, 'rupee rate');
  const day = pack.dayTicket;
  if (day !== undefined) {
    if (typeof day !== 'object' || day === null) throw new Error('fare pack: day ticket');
    const fares = day as Record<string, unknown>;
    checkAmount(fares.regular ?? 0, 'day ticket');
    checkAmount(fares.gold ?? 0, 'gold day ticket');
  }
  const passes = pack.passes;
  if (passes !== undefined) {
    if (typeof passes !== 'object' || passes === null) throw new Error('fare pack: passes');
    for (const cls of ['regular', 'gold'] as const) {
      const lengths = (passes as Record<string, unknown>)[cls];
      if (typeof lengths !== 'object' || lengths === null) {
        throw new Error(`fare pack: no ${cls} passes`);
      }
      for (const length of PASS_LENGTHS) {
        checkBands((lengths as Record<string, unknown>)[length], `${cls} ${length} pass`);
      }
    }
  }
  const children = pack.childrenFree;
  if (children !== undefined) {
    if (typeof children !== 'object' || children === null) throw new Error('fare pack: children');
    const rule = children as Record<string, unknown>;
    checkAmount(rule.underYears ?? 0, 'children age');
    checkAmount(rule.underCm ?? 0, 'children height');
  }

  return raw as FarePack;
}

/**
 * What Nol charges for a journey that passes through `zones` of them, on the class we quote.
 *
 * `undefined` where the journey leaves the Nol zones altogether — a bus to Sharjah, Ajman or
 * Fujairah, or a marine crossing. Those run on a different tariff that this pack does not hold,
 * and a Dubai fare printed on one would be a number the traveller is never charged.
 */
export function nolFareAed(fares: FarePack, zones: number): number | undefined {
  if (!Number.isFinite(zones) || zones < 1) return undefined;
  const tariff = fares.nol[fares.quote];
  if (zones === 1) return tariff.oneZone;
  if (zones === 2) return tariff.twoZones;
  return tariff.moreZones;
}

/**
 * What `aed` is in rupees, to the nearest ten (the owner, 25 September: "no need to be
 * mathematically correct"), grouped the Indian way ("1,250"). A price that is not free never
 * reads ≈ ₹0. Undefined when the pack carries no rate, and the screen then shows dirhams alone.
 */
export function rupees(aed: number, fares: FarePack = currentFares()): string | undefined {
  const rate = fares.inrPerAed;
  if (rate === undefined || !Number.isFinite(aed) || aed < 0) return undefined;
  const tens = Math.round((aed * rate) / 10) * 10;
  return (aed > 0 ? Math.max(10, tens) : 0).toLocaleString('en-IN');
}

/** The copy compiled into this build: the floor a first launch falls back to. */
export const BUNDLED_FARES: FarePack = parseFarePack(shipped);

/**
 * The newest tariff this phone holds. A pack downloaded since the build wins; otherwise the
 * bundled copy answers, which is what makes a first launch with the radio off still quote a
 * price. A downloaded pack that will not parse is ignored rather than allowed to break a screen.
 */
export function currentFares(): FarePack {
  const downloaded = packBody(FARES_PACK_ID);
  if (downloaded === undefined) return BUNDLED_FARES;
  try {
    const parsed = parseFarePack(downloaded);
    return parsed.fareVersion >= BUNDLED_FARES.fareVersion ? parsed : BUNDLED_FARES;
  } catch {
    return BUNDLED_FARES;
  }
}

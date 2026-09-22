import type { FarePack } from '@saathi/shared';
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

export type { FarePack } from '@saathi/shared';

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

  const bands: unknown = pack.transitBandsAed;
  if (!Array.isArray(bands) || bands.length === 0) throw new Error('fare pack: no Nol bands');
  for (const [at, entry] of (bands as unknown[]).entries()) {
    const band = entry as Record<string, unknown>;
    const maxKm = band.maxKm;
    const aed = band.aed;
    if (typeof maxKm !== 'number' || maxKm <= 0 || typeof aed !== 'number' || aed <= 0) {
      throw new Error(`fare pack: Nol band ${String(at + 1)} is not a fare`);
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

  return raw as FarePack;
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

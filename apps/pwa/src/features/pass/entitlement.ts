import type { LatLng } from '@saathi/shared';
import { CONFIRMATIONS_NEEDED, DEPARTURES_NEEDED, readingSaysDubai } from './dubai.js';
import { verifyPass, type SignedPass } from './signedPass.js';

/**
 * The Counter Off Time — the one number entitlement runs on (decision 006).
 *
 * The rule, as the owner stated it:
 *
 * - **Nothing counts while the traveller is in India.** The app is free there so it can be tried
 *   before the trip; a pass bought in India waits for the plane.
 * - **Landing in Dubai starts 24 hours.** That is the free day.
 * - **Paying adds 14 days — 336 hours — from landing, not from payment.** Whether they paid in
 *   Dubai or had already paid in India, the counter is the same one and it starts on arrival.
 * - **A group subscription shares one cut-off.** Every device on a family pass ends at the
 *   master's time, carried on the pass itself rather than recomputed per phone.
 * - **Paid once, never gated.** The owner's rule of 16 September: a traveller who has paid is
 *   never thrown out of the app because the fourteen days ran out. The counter still shows, and
 *   the next trip is a new purchase, but nothing closes.
 *
 * It lives in localStorage rather than IndexedDB because the status strip reads it on every
 * screen, synchronously, before anything has had a chance to open a database.
 */

const KEY = 'saathi.entitlement';

/**
 * Whether there is any way to buy a pass yet, and therefore whether the gate may close.
 *
 * It is a build switch rather than a constant because that is what it actually is: the gate
 * opens the day the order endpoint and the aggregator key exist, and not before. Turning it on
 * today would close रास्ता and खाना to every traveller 24 hours after they land with no way on —
 * a gate in front of a door nobody has built. `VITE_PURCHASE_LIVE=true` at build time.
 */
export const PURCHASE_IS_LIVE = import.meta.env.VITE_PURCHASE_LIVE === 'true';

export const TRIAL_HOURS = 24;
export const PAID_HOURS = 336;

const HOUR = 3600_000;

export interface Entitlement {
  /** First open. Kept for "free in India for a year", which is a fact about this install. */
  readonly installedAt: string;
  /** Confirmed arrival. Absent until enough readings agree — never set on one fix. */
  readonly landedAt?: string;
  /** Readings that have said Dubai so far. Reset to nothing once landing is recorded. */
  readonly sightings?: number;
  /** A pass has been paid for. It may have been bought in India, before landing. */
  readonly paid?: boolean;
  /**
   * A group pass carries the master's cut-off, so four phones end together even though they
   * landed at different times. When set it wins over everything computed here.
   */
  readonly groupEndsAt?: string;
  /** True when the traveller asked to try the app as though they were in Dubai. */
  readonly pretendingDubai?: boolean;
  /**
   * Confirmed departure. A paid pass runs until this, however long ago its hours ran out — the
   * owner's rule: nobody who has paid is ever locked out mid-trip. It is what makes the next
   * trip a new purchase rather than the pass being a lifetime licence by accident.
   */
  readonly leftAt?: string;
  /** Readings that have said "not Dubai" since landing. */
  readonly departures?: number;
  /** The signed pass this device is running on, so a sync can reconcile it against its slot. */
  readonly passId?: string;
  readonly slot?: number;
}

function read(): Entitlement {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) return JSON.parse(raw) as Entitlement;
  } catch {
    // Private mode, or something that is not ours. A fresh install is the safe reading.
  }
  const fresh: Entitlement = { installedAt: new Date().toISOString() };
  write(fresh);
  return fresh;
}

function write(next: Entitlement): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* nothing we can do, and nothing a traveller should see */
  }
}

export function entitlement(): Entitlement {
  return read();
}

export function updateEntitlement(patch: Partial<Entitlement>): Entitlement {
  const next = { ...read(), ...patch };
  write(next);
  return next;
}

/** For tests and for a traveller who wants to start again. */
export function forgetEntitlement(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
}

/**
 * One reading of where the phone is. Called wherever the app already has a fix, and on boot.
 * Returns the entitlement as it now stands, so a caller can see whether this reading landed.
 */
export function noteLocationReading(at: LatLng | undefined): Entitlement {
  const current = read();
  const here = readingSaysDubai(at);

  if (current.landedAt === undefined) {
    if (!here) return current;
    const sightings = (current.sightings ?? 0) + 1;
    if (sightings < CONFIRMATIONS_NEEDED) return updateEntitlement({ sightings });
    // Confirmed. This is the moment the counter starts, and it never restarts.
    return updateEntitlement({ landedAt: new Date().toISOString(), sightings: 0 });
  }

  // Landed already. Now the only question is whether they have gone home, which ends a paid
  // pass — so it takes more agreeing readings than arriving did, and any reading that says
  // "still here" wipes the count. A traveller in a basement with no fix is still in Dubai.
  if (current.pretendingDubai === true) return current;
  if (here) {
    return current.departures === undefined ? current : updateEntitlement({ departures: 0 });
  }
  const departures = (current.departures ?? 0) + 1;
  if (departures < DEPARTURES_NEEDED) return updateEntitlement({ departures });
  return updateEntitlement({ leftAt: new Date().toISOString(), departures: 0 });
}

/**
 * Whether the app is closed to this traveller.
 *
 * Only a trial that has run out closes anything, and only when there is a way to buy. A paying
 * customer is never gated, on this trip or after it — the owner's rule: _"we will NOT THROW HIM
 * AWAY just because his 14 day pass has expired."_ The documents and the hotel are never gated
 * by this or anything else: they are on the device and nothing about them reads a pass.
 */
export function isGated(now: Date = new Date(), state: Entitlement = read()): boolean {
  if (!PURCHASE_IS_LIVE) return false;
  if (state.paid === true) return false;
  return validity(now, state).state === 'expired';
}

/**
 * From the twentieth hour of the Dubai day, every open of घर nudges the traveller toward a pass
 * (owner, 16 September). Never for a traveller who has paid, and never before landing.
 */
export const NUDGE_FROM_HOURS_LEFT = 4;

export function needsNudge(now: Date = new Date(), state: Entitlement = read()): boolean {
  if (state.paid === true) return false;
  const now_ = validity(now, state);
  if (now_.state === 'expired') return true;
  return now_.state === 'trial' && (now_.hours ?? 0) <= NUDGE_FROM_HOURS_LEFT;
}

/** Whether the bar carries पास लें: while the counter is a trial, in India or in Dubai. */
export function canBuy(state: Entitlement = read()): boolean {
  return state.paid !== true;
}

/** Testing from India: the counter behaves exactly as it would on arrival. */
export function pretendLanded(): Entitlement {
  return updateEntitlement({ pretendingDubai: true, landedAt: new Date().toISOString() });
}

export function stopPretending(): Entitlement {
  // The pretend landing goes with it: the traveller is back in India and the clock stops. Built
  // field by field rather than by deleting one, so a future field cannot ride along by accident.
  const current = read();
  const next: Entitlement = {
    installedAt: current.installedAt,
    sightings: 0,
    pretendingDubai: false,
    ...(current.paid === undefined ? {} : { paid: current.paid }),
    ...(current.groupEndsAt === undefined ? {} : { groupEndsAt: current.groupEndsAt }),
  };
  write(next);
  return next;
}

/** Paying. The hours are added to the landing, never to the moment money changed hands. */
export function recordPayment(groupEndsAt?: string): Entitlement {
  return updateEntitlement({ paid: true, ...(groupEndsAt === undefined ? {} : { groupEndsAt }) });
}

/**
 * Installing a pass the server signed — the buyer's own, or one scanned from a family QR with no
 * connection at all (decision 005).
 *
 * `counterOffAt` is the master's cut-off and is carried only when the buyer had already landed.
 * A pass bought in India arrives without one, and then this phone's own landing starts the
 * clock — which is the rule that keeps a pass from being spent on the flight.
 */
export async function installPass(pass: SignedPass): Promise<boolean> {
  if (!(await verifyPass(pass))) return false;
  updateEntitlement({
    paid: true,
    passId: pass.claims.passId,
    slot: pass.claims.slot,
    ...(pass.claims.counterOffAt === undefined ? {} : { groupEndsAt: pass.claims.counterOffAt }),
  });
  return true;
}

/** When the counter runs out, or `null` while the traveller has not landed. */
export function endsAt(state: Entitlement = read()): Date | null {
  if (state.groupEndsAt !== undefined) return new Date(state.groupEndsAt);
  if (state.landedAt === undefined) return null;
  const hours = state.paid === true ? PAID_HOURS : TRIAL_HOURS;
  return new Date(new Date(state.landedAt).getTime() + hours * HOUR);
}

/** What the strip's dot and घर.4 show. */
export interface Validity {
  readonly state: 'before' | 'trial' | 'pass' | 'expired';
  /** 0–100; how much of the counter is left. */
  readonly percent: number;
  readonly hours?: number;
  readonly days?: number;
}

/**
 * What the strip shows. Before landing there is nothing to deplete, so the counter is full and
 * says so.
 */
export function validity(now: Date = new Date(), state: Entitlement = read()): Validity {
  const end = endsAt(state);
  if (end === null) return { state: 'before', percent: 100 };

  const total = (state.paid === true ? PAID_HOURS : TRIAL_HOURS) * HOUR;
  const left = end.getTime() - now.getTime();
  if (left <= 0) return { state: 'expired', percent: 0 };

  const percent = Math.max(0, Math.min(100, Math.round((left / total) * 100)));
  if (state.paid === true || state.groupEndsAt !== undefined) {
    // Days, rounded up: "1 day left" must not appear while there are still twenty hours of it.
    return { state: 'pass', percent, days: Math.ceil(left / (24 * HOUR)) };
  }
  return { state: 'trial', percent, hours: Math.ceil(left / HOUR) };
}

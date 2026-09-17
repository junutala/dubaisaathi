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
 * Whether a traveller can buy a pass — the buy buttons on घर.4, and nothing else.
 *
 * It is a build switch rather than a constant because that is what it actually is: buying opens
 * the day the order endpoint and the aggregator key exist, and not before. `VITE_PURCHASE_LIVE=true`
 * at build time.
 */
export const PURCHASE_IS_LIVE = import.meta.env.VITE_PURCHASE_LIVE === 'true';

/**
 * Whether the gate may close — and it is a separate switch on purpose (decision 019).
 *
 * These were one switch, and one switch cannot express the state the product is actually in:
 * the owner needs to buy a real pass on the live build, with a real card, weeks before any
 * traveller is ever turned away from रास्ता or खाना. Turning buying on used to turn the gate on
 * with it, so testing a purchase meant shutting the app on everyone whose free day had run out.
 *
 * So `VITE_GATE_LIVE=true` is the only thing that closes anything, it defaults to off, and it is
 * the owner's decision on its own — made once the purchase path has taken real money and given
 * back a real pass. Everything else about the counter is unchanged.
 */
const GATE_IS_LIVE = import.meta.env.VITE_GATE_LIVE === 'true';

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
  /**
   * The pass घर.4 has already welcomed (decision 022). The arrival of a pass is the best moment
   * this product has, and it is shown once: the id is written the moment the traveller closes
   * the welcome, so a reload does not replay it, and a later, different pass — a second trip, a
   * QR from a friend — gets its own because the id it carries is not this one.
   */
  readonly welcomedPassId?: string;
  /** The pass itself, so `bind` can send exactly what was signed (decision 005). */
  readonly pass?: SignedPass;
  /** How many phones the pass covers. Slots 2–4 are the QR codes on घर.4. */
  readonly slots?: number;
  /**
   * The passes for slots 2–4, kept on the buyer's phone only, so the QR codes survive a reload
   * and a fortnight. Whoever scans one gets it; nobody else ever sees these.
   */
  readonly familyPasses?: readonly SignedPass[];
  /** When `bind` last confirmed this phone's slot — asked at most once a day (decision 005). */
  readonly bindCheckedAt?: string;
  /**
   * Why a pass this phone held was cleared: the slot was reported by another phone first, or
   * the buyer removed it. घर.4 says so in one line until the next pass is installed.
   */
  readonly passLost?: 'taken' | 'revoked';
}

function read(): Entitlement {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) return JSON.parse(raw) as Entitlement;
  } catch {
    // Private mode, or something that is not ours. A fresh install is the safe reading.
  }
  const fresh: Entitlement = { installedAt: new Date().toISOString() };
  store(fresh);
  return fresh;
}

/**
 * Every change is announced, so the screens that show the pass — घर's tile, घर.4, the bar —
 * re-read it without polling, whichever module made the change (a scan, a code, a sync).
 */
const CHANGED = 'saathi:entitlement';

function store(next: Entitlement): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* nothing we can do, and nothing a traveller should see */
  }
}

/** A change worth telling the screens about. A first read's fresh record is not one. */
function write(next: Entitlement): void {
  store(next);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

export function watchEntitlement(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
  };
}

export function entitlement(): Entitlement {
  return read();
}

/** The record without some fields — the only way to drop one, since none may be `undefined`. */
function omit<K extends keyof Entitlement>(
  state: Entitlement,
  keys: readonly K[],
): Omit<Entitlement, K> {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (!(keys as readonly string[]).includes(key)) kept[key] = value;
  }
  return kept as Omit<Entitlement, K>;
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
 * Only a trial that has run out closes anything, and only when the gate has been turned on
 * deliberately — `VITE_GATE_LIVE`, which buying being live no longer implies (decision 019). A
 * paying customer is never gated, on this trip or after it — the owner's rule: _"we will NOT
 * THROW HIM AWAY just because his 14 day pass has expired."_ The documents and the hotel are
 * never gated by this or anything else: they are on the device and nothing reads a pass.
 */
export function isGated(now: Date = new Date(), state: Entitlement = read()): boolean {
  if (!GATE_IS_LIVE) return false;
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
    ...(current.passId === undefined ? {} : { passId: current.passId }),
    ...(current.welcomedPassId === undefined ? {} : { welcomedPassId: current.welcomedPassId }),
    ...(current.slot === undefined ? {} : { slot: current.slot }),
    ...(current.pass === undefined ? {} : { pass: current.pass }),
    ...(current.slots === undefined ? {} : { slots: current.slots }),
    ...(current.familyPasses === undefined ? {} : { familyPasses: current.familyPasses }),
    ...(current.bindCheckedAt === undefined ? {} : { bindCheckedAt: current.bindCheckedAt }),
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
  write({
    ...omit(read(), ['passLost', 'bindCheckedAt', 'groupEndsAt']),
    paid: true,
    passId: pass.claims.passId,
    slot: pass.claims.slot,
    pass,
    ...(pass.claims.counterOffAt === undefined ? {} : { groupEndsAt: pass.claims.counterOffAt }),
  });
  return true;
}

/**
 * The pass this phone holds and has not yet been welcomed for, or `null` when there is nothing
 * to celebrate — which is the ordinary case, on every open after the first.
 *
 * All three ways a pass lands end in `installPass`: a family QR scanned on a second phone, a
 * code redeemed to zero, and a purchase settling (decision 022). So there is one place to ask
 * the question, and घर.4 asks it on every render.
 */
export function unwelcomedPass(state: Entitlement = read()): string | null {
  if (state.paid !== true) return null;
  const { passId } = state;
  if (passId === undefined) return null;
  return state.welcomedPassId === passId ? null : passId;
}

/** The traveller has read the welcome. It is not shown again for this pass. */
export function markWelcomed(passId: string): Entitlement {
  return updateEntitlement({ welcomedPassId: passId });
}

/**
 * The buyer's phone keeps slots 2–4 so घर.4 can show their QR codes for the whole trip. Only
 * the phone that redeemed or paid ever holds these; a scanned pass carries just its own slot.
 */
export function keepFamilyPasses(slots: number, passes: readonly SignedPass[]): Entitlement {
  return updateEntitlement({ slots, familyPasses: passes });
}

export function noteBindChecked(): Entitlement {
  return updateEntitlement({ bindCheckedAt: new Date().toISOString() });
}

/**
 * The server said this slot is not this phone's — another phone reported it first, or the
 * buyer removed it (decision 005). The pass goes, `paid` with it, and one line on घर.4 says
 * why. The trial and the landing are untouched: they were never the pass's to give or take.
 */
export function clearPass(reason: 'taken' | 'revoked'): Entitlement {
  const next: Entitlement = {
    ...omit(read(), [
      'passId',
      'slot',
      'pass',
      'slots',
      'familyPasses',
      'groupEndsAt',
      'bindCheckedAt',
    ]),
    paid: false,
    passLost: reason,
  };
  write(next);
  return next;
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

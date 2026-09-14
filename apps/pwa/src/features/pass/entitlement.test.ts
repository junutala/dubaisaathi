import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIRMATIONS_NEEDED } from './dubai.js';
import {
  endsAt,
  entitlement,
  forgetEntitlement,
  noteLocationReading,
  PAID_HOURS,
  pretendLanded,
  recordPayment,
  stopPretending,
  TRIAL_HOURS,
  updateEntitlement,
  validity,
} from './entitlement.js';

/**
 * The counter, tested as the two ways it can rob somebody.
 *
 * Starting it in India steals a day the traveller paid for and will never get back. Failing to
 * start it in Dubai gives the product away. Both are silent — nobody reports a counter that is
 * wrong by a day until it has already expired on them — so the rules are asserted here rather
 * than trusted to a reading of the code.
 */

const HOUR = 3600_000;
const MUMBAI = { lat: 19.076, lng: 72.8777 };
const KARAMA = { lat: 25.2451, lng: 55.3047 };

/** jsdom runs in UTC, so the clock signal is off unless a test turns it on. */
function phoneClock(offsetMinutes: number) {
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(offsetMinutes);
}

beforeEach(() => {
  localStorage.clear();
  forgetEntitlement();
  vi.restoreAllMocks();
  phoneClock(-330); // India, UTC+5:30
});

describe('nothing counts in India', () => {
  it('does not start on a fresh install', () => {
    expect(entitlement().landedAt).toBeUndefined();
    expect(endsAt()).toBeNull();
    expect(validity().state).toBe('before');
  });

  it('does not start however many readings come from Mumbai', () => {
    for (let i = 0; i < 10; i += 1) noteLocationReading(MUMBAI);
    expect(entitlement().landedAt).toBeUndefined();
    expect(validity().state).toBe('before');
  });

  /** A pass bought in India waits for the plane — the counter never starts outside Dubai. */
  it('does not start because they paid', () => {
    recordPayment();
    expect(endsAt()).toBeNull();
    expect(validity().state).toBe('before');
  });
});

describe('landing in Dubai', () => {
  it('needs more than one reading before the clock starts', () => {
    for (let i = 0; i < CONFIRMATIONS_NEEDED - 1; i += 1) noteLocationReading(KARAMA);
    expect(entitlement().landedAt).toBeUndefined();

    noteLocationReading(KARAMA);
    expect(entitlement().landedAt).toBeDefined();
  });

  it('can be told by the phone clock alone, with no location permission at all', () => {
    phoneClock(-240); // Gulf Standard Time
    for (let i = 0; i < CONFIRMATIONS_NEEDED; i += 1) noteLocationReading(undefined);
    expect(validity().state).toBe('trial');
  });

  it('gives 24 free hours from the moment of landing', () => {
    const landedAt = new Date('2026-09-20T10:00:00Z');
    updateEntitlement({ landedAt: landedAt.toISOString() });
    expect(endsAt()?.getTime()).toBe(landedAt.getTime() + TRIAL_HOURS * HOUR);

    const twoHoursIn = new Date(landedAt.getTime() + 2 * HOUR);
    expect(validity(twoHoursIn)).toMatchObject({ state: 'trial', hours: 22 });
  });

  it('never restarts once it has started', () => {
    const landedAt = new Date('2026-09-20T10:00:00Z').toISOString();
    updateEntitlement({ landedAt });
    for (let i = 0; i < 5; i += 1) noteLocationReading(KARAMA);
    expect(entitlement().landedAt).toBe(landedAt);
  });
});

describe('paying', () => {
  const landedAt = new Date('2026-09-20T10:00:00Z');

  it('gives 336 hours from landing, not from payment', () => {
    updateEntitlement({ landedAt: landedAt.toISOString() });
    // Paid two days into the trip; the counter still runs from the plane.
    recordPayment();
    expect(endsAt()?.getTime()).toBe(landedAt.getTime() + PAID_HOURS * HOUR);
  });

  it('gives the same 336 hours whether they paid in India or in Dubai', () => {
    recordPayment(); // in India, before landing
    updateEntitlement({ landedAt: landedAt.toISOString() });
    expect(endsAt()?.getTime()).toBe(landedAt.getTime() + PAID_HOURS * HOUR);
  });

  it('reads as a pass in days, rounded up', () => {
    updateEntitlement({ landedAt: landedAt.toISOString(), paid: true });
    const halfwayThroughDayOne = new Date(landedAt.getTime() + 12 * HOUR);
    expect(validity(halfwayThroughDayOne)).toMatchObject({ state: 'pass', days: 14 });
  });

  /** A group pass ends when the master's does, whenever each phone happened to land. */
  it('cuts a group subscription off at the master time', () => {
    const groupEndsAt = new Date('2026-10-01T06:00:00Z');
    updateEntitlement({
      // This phone landed a day later than the buyer's.
      landedAt: new Date('2026-09-21T10:00:00Z').toISOString(),
      paid: true,
      groupEndsAt: groupEndsAt.toISOString(),
    });
    expect(endsAt()?.getTime()).toBe(groupEndsAt.getTime());
  });
});

describe('running out', () => {
  it('expires the moment the hours are gone', () => {
    const landedAt = new Date('2026-09-20T10:00:00Z');
    updateEntitlement({ landedAt: landedAt.toISOString() });
    const aMinuteLate = new Date(landedAt.getTime() + TRIAL_HOURS * HOUR + 60_000);
    expect(validity(aMinuteLate)).toEqual({ state: 'expired', percent: 0 });
  });
});

describe('trying it from India', () => {
  it('behaves exactly as landing does', () => {
    pretendLanded();
    expect(validity().state).toBe('trial');
    expect(endsAt()).not.toBeNull();
  });

  it('puts the traveller back where they were when the test is turned off', () => {
    pretendLanded();
    stopPretending();
    expect(entitlement().landedAt).toBeUndefined();
    expect(validity().state).toBe('before');
  });
});

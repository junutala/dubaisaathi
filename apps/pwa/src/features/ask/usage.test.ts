import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema.js';
import { arrivalSource, dubaiDay, isStaffLink, noteLanding, startUsageRecording } from './usage.js';

/**
 * The owner's count of how Saathi is used — never shown to the traveller. These pin what it
 * records and, as much, what it does not: one "opened" per Dubai day however often the app is
 * brought back, and an arrival recorded once, ever.
 */

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
});

async function usageRows() {
  const rows = await db.voiceEvents.toArray();
  return rows.filter((row) => row.sttEngine === 'usage');
}

describe('usage, recorded for the owner', () => {
  it('reads how a phone came to us, and keeps nothing but a short tag', () => {
    expect(arrivalSource(new URL('https://dubai.saafarsaathi.in/?via=site'))).toBe('site');
    expect(arrivalSource(new URL('https://dubai.saafarsaathi.in/?via=Counter-0034'))).toBe(
      'counter-0034',
    );
    expect(arrivalSource(new URL('https://dubai.saafarsaathi.in/#/pass/abc'))).toBe('family-pass');
    expect(arrivalSource(new URL('https://dubai.saafarsaathi.in/?via=<script>'))).toBe('direct');
  });

  it("reads an ad's utm tags as one short tag, so each town's ad set is its own row", () => {
    const ad = new URL(
      'https://dubai.saafarsaathi.in/?utm_source=Meta&utm_medium=paid&utm_campaign=khaana1&utm_content=Surat#/',
    );
    expect(arrivalSource(ad)).toBe('meta-khaana1-surat');
    // `via` wins when both are there; anything outside letters, digits and hyphens is dropped.
    expect(arrivalSource(new URL('https://dubai.saafarsaathi.in/?via=site&utm_source=meta'))).toBe(
      'site',
    );
    expect(
      arrivalSource(new URL('https://dubai.saafarsaathi.in/?utm_source=meta&utm_content=<b>x</b>')),
    ).toBe('meta-b-x-b');
    expect(
      arrivalSource(new URL(`https://dubai.saafarsaathi.in/?utm_source=${'a'.repeat(60)}`)),
    ).toBe('a'.repeat(40));
  });

  it('counts a day in Dubai time, not the phone clock', () => {
    // 16:00 UTC is 20:00 in Dubai on the 25th; 21:00 UTC is already 01:00 on the 26th there.
    expect(dubaiDay(new Date(Date.UTC(2026, 8, 25, 16, 0)))).toBe('2026-09-25');
    expect(dubaiDay(new Date(Date.UTC(2026, 8, 25, 21, 0)))).toBe('2026-09-26');
  });

  it('records one arrival ever and one open per day, however often the app returns', async () => {
    const stop = startUsageRecording();
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    stop();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const rows = await usageRows();
    expect(rows.map((row) => row.landedOn).sort()).toEqual(['arrived', 'opened']);
    // Every row says whether there was a signal: the offline share is the promise, measured.
    expect(rows.every((row) => typeof row.online === 'boolean')).toBe(true);
  });

  it('marks our own phone once from the staff link, and nothing else does', async () => {
    expect(isStaffLink(new URL('https://dubai.saafarsaathi.in/?staff=saathi'))).toBe(true);
    expect(isStaffLink(new URL('https://dubai.saafarsaathi.in/?staff=1'))).toBe(false);
    expect(isStaffLink(new URL('https://dubai.saafarsaathi.in/?via=site'))).toBe(false);

    window.history.replaceState(null, '', '/?staff=saathi');
    startUsageRecording()();
    startUsageRecording()();
    window.history.replaceState(null, '', '/');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const staff = (await usageRows()).filter((row) => row.landedOn === 'staff');
    // One row however often the link is opened: the server needs to hear it once.
    expect(staff).toHaveLength(1);
  });

  it('tells the server once that the phone landed in Dubai, with the day and nothing finer', async () => {
    noteLanding(undefined);
    noteLanding('2026-11-07T09:30:00.000Z');
    noteLanding('2026-11-07T09:30:00.000Z');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const landed = (await usageRows()).filter((row) => row.landedOn === 'landed');
    expect(landed).toHaveLength(1);
    expect(landed[0]?.transcript).toBe('2026-11-07');
    expect(landed[0]?.region).toBe('dubai');
  });
});

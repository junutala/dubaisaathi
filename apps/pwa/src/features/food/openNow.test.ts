import { describe, expect, it } from 'vitest';
import { isOpenNow, openState } from './openNow.js';

/** An instant that reads as hh:mm on a clock in Dubai, whatever clock this machine keeps. */
const dubai = (hh: number, mm = 0) => new Date(Date.UTC(2026, 8, 15, hh - 4, mm));
const LATE = { everyDay: { opens: '06:00', closes: '02:00' }, openLate: true };
const DAY = { everyDay: { opens: '09:00', closes: '22:00' } };

describe('is it open now, in Dubai', () => {
  it('answers for an ordinary day', () => {
    expect(isOpenNow(DAY, dubai(12))).toBe(true);
    expect(isOpenNow(DAY, dubai(23))).toBe(false);
    expect(isOpenNow(DAY, dubai(8, 59))).toBe(false);
  });

  it('keeps a past-midnight kitchen open at 1am', () => {
    // The whole reason the owner insisted on structured hours. 06:00–02:00 must be open at 01:00.
    expect(isOpenNow(LATE, dubai(1))).toBe(true);
    expect(isOpenNow(LATE, dubai(23))).toBe(true);
    expect(isOpenNow(LATE, dubai(3))).toBe(false);
  });

  it('closes exactly on the closing minute, not after it', () => {
    expect(isOpenNow(LATE, dubai(2))).toBe(false);
    expect(isOpenNow(DAY, dubai(22))).toBe(false);
  });

  it('reads the clock in Dubai, not where the phone is', () => {
    // 20:30 in Delhi is 19:00 in Dubai: a kitchen closing at 19:30 is still open there.
    const delhiEvening = new Date(Date.UTC(2026, 8, 15, 15, 0));
    expect(isOpenNow({ everyDay: { opens: '09:00', closes: '19:30' } }, delhiEvening)).toBe(true);
  });

  it('says when it closes while open, and when it opens while closed', () => {
    expect(openState(DAY, dubai(12))).toEqual({ open: true, next: '22:00' });
    expect(openState(DAY, dubai(7))).toEqual({ open: false, next: '09:00' });
    expect(openState({ open24: true }, dubai(4))).toEqual({ open: true });
  });

  it('says nothing rather than guessing when nobody asked', () => {
    expect(isOpenNow(undefined)).toBeUndefined();
    expect(isOpenNow({ openLate: true })).toBeUndefined();
  });
});

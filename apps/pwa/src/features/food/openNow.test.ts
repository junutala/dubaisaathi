import { describe, expect, it } from 'vitest';
import { isOpenNow } from './openNow.js';

const at = (hh: number, mm = 0) => new Date(2026, 8, 15, hh, mm);
const LATE = { everyDay: { opens: '06:00', closes: '02:00' }, openLate: true };
const DAY = { everyDay: { opens: '09:00', closes: '22:00' } };

describe('is it open now', () => {
  it('answers for an ordinary day', () => {
    expect(isOpenNow(DAY, at(12))).toBe(true);
    expect(isOpenNow(DAY, at(23))).toBe(false);
    expect(isOpenNow(DAY, at(8, 59))).toBe(false);
  });

  it('keeps a past-midnight kitchen open at 1am', () => {
    // The whole reason the owner insisted on structured hours. 06:00–02:00 must be open at 01:00.
    expect(isOpenNow(LATE, at(1))).toBe(true);
    expect(isOpenNow(LATE, at(23))).toBe(true);
    expect(isOpenNow(LATE, at(3))).toBe(false);
  });

  it('closes exactly on the closing minute, not after it', () => {
    expect(isOpenNow(LATE, at(2))).toBe(false);
    expect(isOpenNow(DAY, at(22))).toBe(false);
  });

  it('is open all day when the collector said so', () => {
    expect(isOpenNow({ open24: true }, at(4))).toBe(true);
  });

  it('says nothing rather than guessing when nobody asked', () => {
    expect(isOpenNow(undefined)).toBeUndefined();
    expect(isOpenNow({ openLate: true })).toBeUndefined();
  });
});

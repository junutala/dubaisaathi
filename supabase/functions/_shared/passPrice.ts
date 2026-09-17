/**
 * The price of a pass, and the shape of a coupon code — one definition for the app (घर.4), the
 * `redeem` edge function and the `coupons` command, so the three can never disagree about what
 * a traveller owes (decision 018).
 *
 * This file has no imports on purpose. The edge functions run on Deno and cannot reach into a
 * workspace package, so `supabase/functions/_shared/passPrice.ts` is a byte-for-byte mirror of
 * it, and `packages/content-tools/src/makeCoupons.test.ts` fails when the two drift.
 */

/** ₹199 for one phone, ₹100 for each extra phone, 14 days from landing (decision 006). */
export const LIST_PRICE_INR = 199;
export const EXTRA_PHONE_INR = 100;

/** `family` sells 1–4 phones on one code; `single` locks the code to one phone. */
export type CouponKind = 'family' | 'single';

/** The prefix is a human convention; the app reads `kind`. The generator sets both. */
export const COUPON_PREFIX: Record<CouponKind, string> = { family: 'SS', single: 'OP' };

/** What a coupon changes about the price. A flat price, when set, wins over the percentage. */
export interface CouponTerms {
  readonly discountPercent: number;
  readonly priceOverrideInr?: number | null;
}

/** The list price for `slots` phones, before any code. */
export function listPriceInr(slots: number): number {
  return LIST_PRICE_INR + EXTRA_PHONE_INR * (Math.min(4, Math.max(1, Math.trunc(slots))) - 1);
}

/**
 * What is actually payable, in whole rupees, never below zero. A percentage rounds to the
 * traveller's advantage: ₹299 at 50% is ₹149, not ₹150.
 */
export function passPriceInr(slots: number, coupon?: CouponTerms | null): number {
  const list = listPriceInr(slots);
  if (coupon === undefined || coupon === null) return list;
  if (typeof coupon.priceOverrideInr === 'number') {
    return Math.max(0, Math.trunc(coupon.priceOverrideInr));
  }
  const percent = Math.min(100, Math.max(0, coupon.discountPercent));
  return Math.max(0, Math.floor(list * (1 - percent / 100)));
}

/**
 * No 0/O, no 1/I: a code is read out over a phone and typed from an advertisement, and the
 * four characters people confuse are simply not in it.
 */
export const COUPON_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const COUPON_BODY_LENGTH = 6;

const CODE = /^[A-Z]{2}[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * `SSW9VASX`, `OP4HXR9B`: two letters and six characters of the alphabet above, eight in all,
 * letters and digits and nothing else.
 *
 * The dash went on 17 September. A code is typed by someone standing in an airport with a bag
 * in the other hand, and on every phone keyboard a dash is behind the `?123` key: the separator
 * cost a flip out of the letters and a flip back, twice the taps of the character it separated.
 * It bought nothing — the prefix is two letters and the body is six, and the eye finds that
 * break without a mark.
 */
export function isCouponCode(value: string): boolean {
  return CODE.test(value);
}

/**
 * What a traveller typed, made into a code: upper-cased, with everything that is not a letter
 * or a digit dropped. `ss7k3m2x`, `SS 7K3M 2X` and `SS-7K3M2X` off an old advertisement are all
 * the same code — the dash is gone from what we print, never from what we accept.
 */
export function normaliseCouponCode(typed: string): string {
  return typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * One code from random bytes: the prefix for the kind, then six characters chosen by the
 * bytes, with no separator between them. Given bytes rather than drawing them so the caller
 * decides the source of randomness and a test can pin the output.
 */
export function couponCode(kind: CouponKind, random: Uint8Array): string {
  if (random.length < COUPON_BODY_LENGTH) throw new Error('need six random bytes for a code');
  let body = '';
  for (let i = 0; i < COUPON_BODY_LENGTH; i += 1) {
    body += COUPON_ALPHABET.charAt((random[i] ?? 0) % COUPON_ALPHABET.length);
  }
  return `${COUPON_PREFIX[kind]}${body}`;
}

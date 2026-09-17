import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COUPON_ALPHABET,
  couponCode,
  isCouponCode,
  listPriceInr,
  normaliseCouponCode,
  passPriceInr,
} from '@saathi/shared';
import { batchSlug, couponRows, parseCouponArgs, uptakeTable } from './couponBatch.ts';

/**
 * The code and the price, tested as the two ways they go wrong in the field: a code that
 * cannot be read back off an advertisement, and a price the app, the function and the CLI
 * disagree about. The last test is the one that keeps the Deno mirror honest.
 */

const here = dirname(fileURLToPath(import.meta.url));

describe('a coupon code', () => {
  it('never contains 0, O, 1 or I', () => {
    expect(COUPON_ALPHABET).not.toMatch(/[0O1I]/);
    expect(COUPON_ALPHABET).toHaveLength(32);
    for (let byte = 0; byte < 256; byte += 1) {
      const code = couponCode('family', new Uint8Array(6).fill(byte));
      expect(code).toMatch(/^SS[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('carries the prefix of its kind', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
    expect(couponCode('family', bytes)).toBe('SSABCDEF');
    expect(couponCode('single', bytes)).toBe('OPABCDEF');
  });

  it('reads what a traveller typed, however they typed it', () => {
    expect(normaliseCouponCode(' ss7k3m2x ')).toBe('SS7K3M2X');
    expect(normaliseCouponCode('SS 7K3M 2X')).toBe('SS7K3M2X');
    // The dash went in 0009, but an advertisement already printed with one still resolves.
    expect(normaliseCouponCode('ss-7k3m2x')).toBe('SS7K3M2X');
    expect(isCouponCode('SS7K3M2X')).toBe(true);
    expect(isCouponCode('SS7K3M2O')).toBe(false);
    expect(isCouponCode('SS-7K3M2X')).toBe(false);
    expect(isCouponCode('SS7K3M2')).toBe(false);
  });
});

describe('the price', () => {
  it('is ₹199 plus ₹100 a phone', () => {
    expect([1, 2, 3, 4].map(listPriceInr)).toEqual([199, 299, 399, 499]);
    expect(passPriceInr(2)).toBe(299);
    expect(passPriceInr(2, null)).toBe(299);
  });

  it('takes a percentage off, rounding in the traveller’s favour', () => {
    expect(passPriceInr(1, { discountPercent: 100 })).toBe(0);
    expect(passPriceInr(4, { discountPercent: 100 })).toBe(0);
    expect(passPriceInr(2, { discountPercent: 50 })).toBe(149);
    expect(passPriceInr(1, { discountPercent: 0 })).toBe(199);
  });

  it('lets a flat price win over the percentage', () => {
    expect(passPriceInr(3, { discountPercent: 10, priceOverrideInr: 99 })).toBe(99);
    expect(passPriceInr(1, { discountPercent: 0, priceOverrideInr: 0 })).toBe(0);
    expect(passPriceInr(1, { discountPercent: 10, priceOverrideInr: null })).toBe(179);
  });

  it('never goes below zero or above the list', () => {
    expect(passPriceInr(1, { discountPercent: 150 })).toBe(0);
    expect(passPriceInr(1, { discountPercent: -20 })).toBe(199);
    expect(passPriceInr(9)).toBe(499);
    expect(passPriceInr(0)).toBe(199);
  });

  /**
   * The edge functions run on Deno and cannot import the workspace, so the rule is mirrored.
   * One definition means the mirror is a copy, not a rewrite: this fails on the first byte of
   * difference.
   */
  it('is one definition: the Deno mirror is byte for byte the shared file', async () => {
    const shared = await readFile(resolve(here, '..', '..', 'shared', 'src', 'coupon.ts'), 'utf8');
    const mirror = await readFile(
      resolve(here, '..', '..', '..', 'supabase', 'functions', '_shared', 'passPrice.ts'),
      'utf8',
    );
    expect(mirror).toBe(shared);
  });
});

describe('the batch', () => {
  const argv = [
    '--kind',
    'family',
    '--discount',
    '100',
    '--count',
    '3',
    '--redemptions',
    '1',
    '--until',
    '2026-10-31',
    '--batch',
    'Meta launch',
  ];

  it('reads its arguments', () => {
    expect(parseCouponArgs(argv)).toEqual({
      kind: 'family',
      discount: 100,
      count: 3,
      redemptions: 1,
      until: '2026-10-31',
      batch: 'Meta launch',
    });
    expect(parseCouponArgs([...argv, '--price', '99', '--note', 'ad']).price).toBe(99);
  });

  it('refuses what the table would refuse, before the network', () => {
    expect(() => parseCouponArgs(['--kind', 'corporate', '--count', '1', '--batch', 'x'])).toThrow(
      /family or single/,
    );
    expect(() =>
      parseCouponArgs(['--kind', 'family', '--discount', '101', '--count', '1', '--batch', 'x']),
    ).toThrow(/0 to 100/);
    expect(() => parseCouponArgs(['--kind', 'family', '--count', '1'])).toThrow(/--batch/);
    expect(() =>
      parseCouponArgs(['--kind', 'family', '--count', '1', '--batch', 'x', '--until', 'soon']),
    ).toThrow(/date/);
  });

  it('makes distinct rows that end at the close of the Dubai day', () => {
    let n = 0;
    const rows = couponRows(parseCouponArgs(argv), (bytes) => {
      n += 1;
      return bytes.fill(n);
    });
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.code)).size).toBe(3);
    expect(rows[0]).toMatchObject({
      kind: 'family',
      discount_percent: 100,
      price_override_inr: null,
      max_redemptions: 1,
      batch: 'Meta launch',
      note: null,
      valid_until: '2026-10-31T19:59:59.000Z',
    });
  });

  it('draws again on a collision', () => {
    const draws = [1, 1, 2];
    const rows = couponRows(
      parseCouponArgs(['--kind', 'single', '--count', '2', '--batch', 'x']),
      (bytes) => bytes.fill(draws.shift() ?? 9),
    );
    expect(rows.map((row) => row.code)).toEqual(['OPBBBBBB', 'OPCCCCCC']);
  });

  it('names the file after the batch', () => {
    expect(batchSlug('Meta launch')).toBe('meta-launch');
    expect(batchSlug("Ravi's counter!")).toBe('ravi-s-counter');
    expect(batchSlug('***')).toBe('batch');
  });

  it('lays the report out one code per line', () => {
    const table = uptakeTable([
      {
        code: 'SSW9VASX',
        batch: 'Meta launch',
        kind: 'family',
        discount: 100,
        price_override_inr: null,
        max_redemptions: 2,
        redeemed: 2,
        devices: 2,
        slots_issued: 5,
        last_redeemed_at: '2026-09-17T04:25:08.077Z',
        valid_until: null,
        status: 'exhausted',
      },
    ]);
    expect(table.split('\n')).toHaveLength(2);
    expect(table).toContain('SSW9VASX  Meta launch  family  100%  2/2');
    expect(table).toContain('2026-09-17  exhausted');
  });
});

/**
 * The pure part of `npm run coupons`: reading the arguments, making the rows, laying out the
 * report. `makeCoupons.ts` is the thin runner around it that talks to Supabase and the disk,
 * so this half can be tested without either.
 */
import { couponCode, isCouponCode, type CouponKind } from '@saathi/shared';

export interface CouponBatchArgs {
  readonly kind: CouponKind;
  readonly discount: number;
  readonly price?: number;
  readonly count: number;
  readonly redemptions: number;
  readonly until?: string;
  readonly batch: string;
  readonly note?: string;
}

/** A row exactly as `coupons` takes it. */
export interface CouponRow {
  readonly code: string;
  readonly kind: CouponKind;
  readonly discount_percent: number;
  readonly price_override_inr: number | null;
  readonly max_redemptions: number;
  readonly valid_until: string | null;
  readonly batch: string;
  readonly note: string | null;
}

function value(argv: readonly string[], name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const next = argv[at + 1];
  if (next === undefined || next.startsWith('--')) throw new Error(`--${name} needs a value`);
  return next;
}

function whole(argv: readonly string[], name: string, fallback?: number): number {
  const raw = value(argv, name);
  if (raw === undefined) {
    if (fallback === undefined) throw new Error(`--${name} is required`);
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a whole number`);
  return n;
}

/**
 *   --kind family|single --discount 100 [--price 99] --count 30 --redemptions 1
 *   --until 2026-10-31 --batch "Meta launch" [--note …]
 */
export function parseCouponArgs(argv: readonly string[]): CouponBatchArgs {
  const kind = value(argv, 'kind');
  if (kind !== 'family' && kind !== 'single') throw new Error('--kind must be family or single');
  const discount = whole(argv, 'discount', 0);
  if (discount > 100) throw new Error('--discount is a percentage, 0 to 100');
  const price = value(argv, 'price') === undefined ? undefined : whole(argv, 'price');
  const count = whole(argv, 'count');
  if (count < 1 || count > 1000) throw new Error('--count is 1 to 1000');
  const redemptions = whole(argv, 'redemptions', 1);
  if (redemptions < 1) throw new Error('--redemptions is at least 1');
  const until = value(argv, 'until');
  if (until !== undefined && Number.isNaN(new Date(until).getTime())) {
    throw new Error('--until must be a date, e.g. 2026-10-31');
  }
  const batch = value(argv, 'batch');
  if (batch === undefined || batch.trim() === '') throw new Error('--batch is required');
  const note = value(argv, 'note');
  return {
    kind,
    discount,
    ...(price === undefined ? {} : { price }),
    count,
    redemptions,
    ...(until === undefined ? {} : { until }),
    batch: batch.trim(),
    ...(note === undefined ? {} : { note }),
  };
}

/**
 * `count` distinct codes. The random source is a parameter so a test can pin the output; the
 * runner passes `crypto.getRandomValues`. A collision within a batch is drawn again.
 */
export function couponRows(
  args: CouponBatchArgs,
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array,
): readonly CouponRow[] {
  const codes = new Set<string>();
  while (codes.size < args.count) {
    const code = couponCode(args.kind, random(new Uint8Array(6)));
    if (!isCouponCode(code)) throw new Error(`generator produced a bad code: ${code}`);
    codes.add(code);
  }
  // The end of the day named, in Dubai: an ad that says "till 31 October" means the whole day.
  const until =
    args.until === undefined ? null : new Date(`${args.until.slice(0, 10)}T23:59:59+04:00`);
  return [...codes].map((code) => ({
    code,
    kind: args.kind,
    discount_percent: args.discount,
    price_override_inr: args.price ?? null,
    max_redemptions: args.redemptions,
    valid_until: until === null ? null : until.toISOString(),
    batch: args.batch,
    note: args.note ?? null,
  }));
}

/** "Meta launch" → `meta-launch`, for the file name. */
export function batchSlug(batch: string): string {
  return (
    batch
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'batch'
  );
}

export interface UptakeRow {
  readonly code: string;
  readonly batch: string;
  readonly kind: string;
  readonly discount: number;
  readonly price_override_inr: number | null;
  readonly max_redemptions: number;
  readonly redeemed: number;
  readonly devices: number;
  readonly slots_issued: number;
  readonly last_redeemed_at: string | null;
  readonly valid_until: string | null;
  readonly status: string;
}

/** The `coupon_uptake` view as a fixed-width table, one code per line. */
export function uptakeTable(rows: readonly UptakeRow[]): string {
  const head = ['code', 'batch', 'kind', 'off', 'used/max', 'phones', 'slots', 'last', 'status'];
  const body = rows.map((row) => [
    row.code,
    row.batch,
    row.kind,
    row.price_override_inr === null
      ? `${String(row.discount)}%`
      : `₹${String(row.price_override_inr)}`,
    `${String(row.redeemed)}/${String(row.max_redemptions)}`,
    String(row.devices),
    String(row.slots_issued),
    row.last_redeemed_at === null ? '—' : row.last_redeemed_at.slice(0, 10),
    row.status,
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => (r[i] ?? '').length)));
  const line = (cells: readonly string[]) =>
    cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ');
  return [line(head), ...body.map(line)].join('\n');
}

/**
 * `order` — the money half of the pass (decision 019).
 *
 * Two actions on one function, because they are one conversation:
 *
 * - `create` prices the pass (the code, if there is one, through the same rule the app and
 *   `redeem` use), asks Razorpay for an order, writes our own `orders` row and hands the phone
 *   the publishable key and the aggregator's order id. Nothing is issued here: an order is a
 *   question, and only the webhook's answer makes it a pass.
 * - `status` is what the phone polls after Checkout closes. `paid` re-signs the family's passes
 *   from the `passes` rows and hands them back, exactly as `redeem`'s reissue does — the phone
 *   verifies every one of them offline before installing it (decision 005).
 *
 * A code that brings the price to ₹0 is refused with `free`: a free pass is issued by `redeem`
 * on the spot, and `orders.amount_inr` may not be zero. One way in per price, never two.
 *
 * Secrets it needs (set on the function, never in the repo):
 * - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — the aggregator. Only the id ever leaves here.
 * - `PASS_SIGNING_KEY` — base64 PKCS8, P-256. `npm run pass:key` prints a pair.
 * - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — provided by the platform.
 *
 * Rules it keeps, same as `redeem`:
 * - **No IP address, anywhere** (decision 011). `x-forwarded-for` is never read.
 * - **No account** (decision 001). The device id is the identity.
 * - **One origin** (decision 012). CORS is the app's own origin, never `*`.
 * - **A refusal is a `reason`, never a stack trace.** The app has one honest line per reason.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { importPrivateKey, signPass, type SignedPass } from '../_shared/sign.ts';
import {
  isCouponCode,
  listPriceInr,
  normaliseCouponCode,
  passPriceInr,
  type CouponKind,
} from '../_shared/passPrice.ts';

const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

/** Hours a paid pass is worth from landing — `PAID_HOURS` in the app (decision 006). */
const PAID_HOURS = 336;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RAZORPAY_ORDERS = 'https://api.razorpay.com/v1/orders';

/** The one-word refusals the app has a line for. */
type Reason =
  | 'unknown'
  | 'not-yet'
  | 'ended'
  | 'exhausted'
  | 'already-redeemed'
  | 'slots'
  | 'single'
  | 'free'
  | 'unsigned'
  | 'unconfigured'
  | 'aggregator';

const STATUS: Record<Reason, number> = {
  unknown: 404,
  'not-yet': 400,
  ended: 410,
  exhausted: 409,
  'already-redeemed': 409,
  slots: 400,
  single: 400,
  free: 409,
  unsigned: 503,
  unconfigured: 503,
  aggregator: 502,
};

interface CouponRow {
  code: string;
  kind: CouponKind;
  discount_percent: number;
  price_override_inr: number | null;
  max_redemptions: number;
  valid_from: string;
  valid_until: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

function refuse(reason: Reason): Response {
  return json({ reason }, STATUS[reason]);
}

/**
 * The family's passes, signed again over the same claims. This is what `status` hands back
 * once the webhook has settled the order, and it is the same helper `redeem` uses for a phone
 * that already redeemed: the signature is re-made rather than the stored one trusted, so a key
 * rotation reaches a traveller who paid before it.
 */
async function reissue(
  db: ReturnType<typeof createClient>,
  familyId: string,
  privateKey: CryptoKey,
): Promise<SignedPass[] | null> {
  const found = await db
    .from('passes')
    .select('id, family_id, slot, counter_off_at')
    .eq('family_id', familyId)
    .order('slot');
  if (found.error) return null;
  const rows = (found.data ?? []) as {
    id: string;
    family_id: string;
    slot: number;
    counter_off_at: string | null;
  }[];
  const passes: SignedPass[] = [];
  for (const row of rows) {
    const pass = await signPass(
      {
        passId: row.id,
        familyId: row.family_id,
        slot: row.slot,
        kind: 'paid',
        ...(row.counter_off_at === null
          ? {}
          : { counterOffAt: new Date(row.counter_off_at).toISOString() }),
        hours: PAID_HOURS,
      },
      privateKey,
    );
    const saved = await db.from('passes').update({ signature: pass.signature }).eq('id', row.id);
    if (saved.error) return null;
    passes.push(pass);
  }
  return passes;
}

/** The phone's own row, kept up to date on every contact exactly as `redeem` keeps it. */
async function seeDevice(
  db: ReturnType<typeof createClient>,
  deviceId: string,
  payload: { platform?: unknown; appVersion?: unknown; landedAt?: unknown },
): Promise<string | null> {
  const platform = ['android', 'ios', 'other'].includes(String(payload.platform))
    ? payload.platform
    : null;
  const landedAt =
    typeof payload.landedAt === 'string' && !Number.isNaN(new Date(payload.landedAt).getTime())
      ? payload.landedAt
      : null;
  const device = await db.from('devices').upsert(
    {
      id: deviceId,
      last_seen_at: new Date().toISOString(),
      ...(platform === null ? {} : { platform }),
      ...(typeof payload.appVersion === 'string' ? { app_version: payload.appVersion } : {}),
      ...(landedAt === null ? {} : { landed_at: landedAt }),
    },
    { onConflict: 'id' },
  );
  return device.error === null ? null : device.error.message;
}

/** What the traveller owes for `slots` phones after the code, or the refusal the code earns. */
async function priceWithCode(
  db: ReturnType<typeof createClient>,
  code: string,
  deviceId: string,
  slots: number,
): Promise<{ payable: number } | { reason: Reason }> {
  const found = await db.from('coupons').select('*').eq('code', code).maybeSingle();
  if (found.error) return { reason: 'unknown' };
  const coupon = found.data as CouponRow | null;
  if (coupon === null) return { reason: 'unknown' };

  const now = Date.now();
  if (now < new Date(coupon.valid_from).getTime()) return { reason: 'not-yet' };
  if (coupon.valid_until !== null && now >= new Date(coupon.valid_until).getTime()) {
    return { reason: 'ended' };
  }
  if (coupon.kind === 'single' && slots !== 1) return { reason: 'single' };

  const taken = await db.from('coupon_redemptions').select('device_id').eq('code', code);
  if (taken.error) return { reason: 'unknown' };
  const rows = (taken.data ?? []) as { device_id: string }[];
  if (rows.some((row) => row.device_id === deviceId)) return { reason: 'already-redeemed' };
  if (rows.length >= coupon.max_redemptions) return { reason: 'exhausted' };

  return {
    payable: passPriceInr(slots, {
      discountPercent: coupon.discount_percent,
      priceOverrideInr: coupon.price_override_inr,
    }),
  };
}

/** Razorpay's own order, against which Checkout collects. Its id is what the phone opens. */
async function razorpayOrder(
  keyId: string,
  keySecret: string,
  amountInr: number,
  receipt: string,
  notes: Record<string, string>,
): Promise<string | null> {
  try {
    const response = await fetch(RAZORPAY_ORDERS, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: amountInr * 100,
        currency: 'INR',
        receipt,
        notes,
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { id?: unknown };
    return typeof body.id === 'string' && body.id !== '' ? body.id : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let payload: {
    action?: unknown;
    deviceId?: unknown;
    orderId?: unknown;
    slots?: unknown;
    code?: unknown;
    platform?: unknown;
    appVersion?: unknown;
    landedAt?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'not JSON' }, 400);
  }

  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : '';
  if (!UUID.test(deviceId)) return json({ error: 'deviceId must be a uuid' }, 400);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  if (payload.action === 'status') {
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
    if (!UUID.test(orderId)) return json({ status: 'unknown' });
    // By id AND device: a phone may ask about its own order and nobody else's.
    const found = await db
      .from('orders')
      .select('id, status, family_id')
      .eq('id', orderId)
      .eq('device_id', deviceId)
      .maybeSingle();
    if (found.error) return json({ error: found.error.message }, 500);
    const order = found.data as { status: string; family_id: string | null } | null;
    if (order === null) return json({ status: 'unknown' });
    if (order.status !== 'paid' || order.family_id === null) return json({ status: order.status });

    const pkcs8 = Deno.env.get('PASS_SIGNING_KEY');
    if (pkcs8 === undefined || pkcs8 === '') return refuse('unsigned');
    const passes = await reissue(db, order.family_id, await importPrivateKey(pkcs8));
    if (passes === null || passes.length === 0) return json({ error: 'no passes' }, 500);
    return json({ status: 'paid', passes });
  }

  if (payload.action !== 'create') return json({ error: 'action must be create or status' }, 400);

  const slots = Number(payload.slots);
  if (!Number.isInteger(slots) || slots < 1 || slots > 4) return refuse('slots');

  const seen = await seeDevice(db, deviceId, payload);
  if (seen !== null) return json({ error: seen }, 500);

  let code: string | null = null;
  let amountInr = listPriceInr(slots);
  if (typeof payload.code === 'string' && payload.code.trim() !== '') {
    code = normaliseCouponCode(payload.code);
    if (!isCouponCode(code)) return refuse('unknown');
    const priced = await priceWithCode(db, code, deviceId, slots);
    if ('reason' in priced) return refuse(priced.reason);
    // A free code is issued by `redeem`, on the spot and with no money in it. An order of ₹0
    // is not a thing this product has: the column refuses it and so does this.
    if (priced.payable <= 0) return refuse('free');
    amountInr = priced.payable;
  }

  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (keyId === undefined || keyId === '' || keySecret === undefined || keySecret === '') {
    return refuse('unconfigured');
  }

  const orderId = crypto.randomUUID();
  const aggregatorOrderId = await razorpayOrder(keyId, keySecret, amountInr, orderId, {
    deviceId,
    slots: String(slots),
    ...(code === null ? {} : { code }),
  });
  if (aggregatorOrderId === null) return refuse('aggregator');

  const written = await db.from('orders').insert({
    id: orderId,
    device_id: deviceId,
    aggregator: 'razorpay',
    aggregator_order_id: aggregatorOrderId,
    amount_inr: amountInr,
    slots,
    status: 'created',
    ...(code === null ? {} : { coupon_code: code }),
  });
  if (written.error) return json({ error: written.error.message }, 500);

  // The publishable half only. The secret signs nothing outside this function.
  return json({
    orderId,
    aggregatorOrderId,
    keyId,
    amountInr,
    slots,
    ...(code === null ? {} : { code }),
  });
});

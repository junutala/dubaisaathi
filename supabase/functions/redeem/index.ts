/**
 * `redeem` — a coupon code meets the pass (decision 018).
 *
 * The phone sends the code it was given and how many phones it wants. This function says what
 * is payable after the code — and when that is ₹0, issues the pass on the spot: one family,
 * one signed pass per slot, slot 1 bound to the phone that asked, the whole thing in one
 * database transaction (`redeem_coupon` in migration 0007). A partial code issues nothing; the
 * app shows the balance and says it becomes payable when UPI opens.
 *
 * Secrets it needs (set on the function, never in the repo):
 * - `PASS_SIGNING_KEY` — base64 PKCS8, P-256. `npm run pass:key` prints a pair.
 * - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — provided by the platform.
 *
 * Rules it keeps, same as `collect`:
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
const HOUR = 3600_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The one-word refusals the app has a line for. */
type Reason =
  | 'unknown'
  | 'not-yet'
  | 'ended'
  | 'exhausted'
  | 'already-redeemed'
  | 'slots'
  | 'single'
  | 'unsigned';

const STATUS: Record<Reason, number> = {
  unknown: 404,
  'not-yet': 400,
  ended: 410,
  exhausted: 409,
  'already-redeemed': 409,
  slots: 400,
  single: 400,
  unsigned: 503,
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
 * The master cut-off, only when the phone reports a landing that could be real: a time in the
 * past, and not so far in the past that the fourteen days would already be over. Anything else
 * leaves the counter to start on the phone's own landing (decision 006).
 */
function counterOffAtFrom(landedAt: unknown): string | undefined {
  if (typeof landedAt !== 'string') return undefined;
  const at = new Date(landedAt).getTime();
  if (Number.isNaN(at)) return undefined;
  const now = Date.now();
  if (at > now + HOUR || at < now - PAID_HOURS * HOUR) return undefined;
  return new Date(at + PAID_HOURS * HOUR).toISOString();
}

/**
 * The same phone, the same code, again. The first time round the server did everything right
 * and the phone still did not end up with the pass — a build without the public key, a tab
 * closed mid-install, a phone that lost signal between the answer and the write. The redemption
 * is spent, slot 1 is this phone's, and refusing now would strand a traveller with a pass they
 * cannot see. So the family's passes are signed again over the same claims and handed back.
 * Nothing new is issued; a different phone is still refused.
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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let payload: {
    deviceId?: unknown;
    code?: unknown;
    slots?: unknown;
    quoteOnly?: unknown;
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
  const code = normaliseCouponCode(typeof payload.code === 'string' ? payload.code : '');
  if (!isCouponCode(code)) return refuse('unknown');
  const slots = Number(payload.slots);
  if (!Number.isInteger(slots) || slots < 1 || slots > 4) return refuse('slots');

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

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
  if (device.error) return json({ error: device.error.message }, 500);

  const found = await db.from('coupons').select('*').eq('code', code).maybeSingle();
  if (found.error) return json({ error: found.error.message }, 500);
  const coupon = found.data as CouponRow | null;
  if (coupon === null) return refuse('unknown');

  const now = Date.now();
  if (now < new Date(coupon.valid_from).getTime()) return refuse('not-yet');
  if (coupon.valid_until !== null && now >= new Date(coupon.valid_until).getTime()) {
    return refuse('ended');
  }
  if (coupon.kind === 'single' && slots !== 1) return refuse('single');

  const terms = {
    discountPercent: coupon.discount_percent,
    priceOverrideInr: coupon.price_override_inr,
  };
  const payable = passPriceInr(slots, terms);
  const quote = {
    code,
    kind: coupon.kind,
    listPrice: listPriceInr(slots),
    discount: terms,
  };

  const taken = await db
    .from('coupon_redemptions')
    .select('device_id, family_id, slots')
    .eq('code', code);
  if (taken.error) return json({ error: taken.error.message }, 500);
  const rows = (taken.data ?? []) as {
    device_id: string;
    family_id: string | null;
    slots: number;
  }[];
  const mine = rows.find((row) => row.device_id === deviceId);
  if (mine !== undefined) {
    if (mine.family_id === null) return refuse('already-redeemed');
    const pkcs8 = Deno.env.get('PASS_SIGNING_KEY');
    if (pkcs8 === undefined || pkcs8 === '') return refuse('unsigned');
    const passes = await reissue(db, mine.family_id, await importPrivateKey(pkcs8));
    if (passes === null || passes.length === 0) return refuse('already-redeemed');
    return json({
      ...quote,
      listPrice: listPriceInr(mine.slots),
      payable: 0,
      issued: true,
      passes,
    });
  }
  if (rows.length >= coupon.max_redemptions) return refuse('exhausted');
  // A balance is not ours to take yet: UPI is not live. The app says so and keeps the code.
  // And a quote is a quote: the field's लगाएँ asks what the code is worth, the button takes it.
  if (payable > 0 || payload.quoteOnly === true) return json({ ...quote, payable, issued: false });

  const pkcs8 = Deno.env.get('PASS_SIGNING_KEY');
  if (pkcs8 === undefined || pkcs8 === '') return refuse('unsigned');
  const privateKey = await importPrivateKey(pkcs8);

  const familyId = crypto.randomUUID();
  const counterOffAt = counterOffAtFrom(payload.landedAt);
  const passes: SignedPass[] = [];
  for (let slot = 1; slot <= slots; slot += 1) {
    passes.push(
      await signPass(
        {
          passId: crypto.randomUUID(),
          familyId,
          slot,
          kind: 'paid',
          ...(counterOffAt === undefined ? {} : { counterOffAt }),
          hours: PAID_HOURS,
        },
        privateKey,
      ),
    );
  }

  // One transaction: the family, every pass, slot 1 bound to this phone, the redemption row.
  // The function re-checks the cap under a lock, so a race for the last use loses cleanly.
  const issued = await db.rpc('redeem_coupon', {
    p_code: code,
    p_device_id: deviceId,
    p_family_id: familyId,
    p_slots: slots,
    p_counter_off_at: counterOffAt ?? null,
    p_pass_ids: passes.map((pass) => pass.claims.passId),
    p_signatures: passes.map((pass) => pass.signature),
  });
  if (issued.error) {
    const word = issued.error.message.trim();
    if (word in STATUS) return refuse(word as Reason);
    // The unique constraint, when two requests from one phone cross in flight.
    if (/one_redemption_per_device_per_code/.test(issued.error.message)) {
      return refuse('already-redeemed');
    }
    return json({ error: issued.error.message }, 500);
  }

  return json({ ...quote, payable: 0, issued: true, passes });
});

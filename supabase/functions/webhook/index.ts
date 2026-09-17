/**
 * `webhook` — Razorpay says the money arrived, and this is the only thing that believes it
 * (decision 019).
 *
 * The phone never tells us it paid. Checkout closing is not a payment, a `handler` callback is
 * script on a page anyone can edit, and a traveller on a metro platform loses signal between the
 * bank and the app. So the authority is this: a signed server-to-server delivery, verified
 * against a shared secret, which signs one pass per slot and settles the order in one
 * transaction (`settle_order` in migration 0008). The phone finds out by asking `order`
 * `status`, and verifies every pass offline before installing it (decision 005).
 *
 * Secrets it needs (set on the function, never in the repo):
 * - `RAZORPAY_WEBHOOK_SECRET` — the secret typed into Razorpay's own webhook screen. Missing is
 *   a 503 with a reason, never a crash: an unconfigured function must not eat a real payment.
 * - `PASS_SIGNING_KEY` — base64 PKCS8, P-256. `npm run pass:key` prints a pair.
 * - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — provided by the platform.
 *
 * Rules it keeps:
 * - **No IP address, anywhere** (decision 011). No forwarding header is read, here least of all.
 * - **No CORS.** Razorpay is a server, not a browser; there is no origin to allow.
 * - **Idempotent.** Razorpay retries anything it did not hear a 200 for, and a second
 *   settlement must never issue a second family.
 * - **A 500 is a request to try again.** Anything we could not finish gets one, so a payment is
 *   never lost to a moment's trouble; anything not ours gets a 200 so the retries stop.
 *
 * Verified with: `openssl dgst -sha256 -hmac "$SECRET" <body>` — the same hex this compares.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { importPrivateKey, signPass, type SignedPass } from '../_shared/sign.ts';

/** Hours a paid pass is worth from landing — `PAID_HOURS` in the app (decision 006). */
const PAID_HOURS = 336;
const HOUR = 3600_000;

/** The two Razorpay sends when a UPI collection succeeds. Everything else is not ours. */
const SETTLES = ['payment.captured', 'order.paid'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length first, then every character: never an early return on the first difference. */
function sameSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let differs = 0;
  for (let i = 0; i < a.length; i += 1) differs |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return differs === 0;
}

async function signedWith(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
}

/**
 * The master cut-off, only when the device reported a landing that could be real: a time in the
 * past, and not so far in the past that the fourteen days would already be over. Anything else
 * leaves the counter to start on the phone's own landing (decision 006). Same rule as `redeem`.
 */
function counterOffAtFrom(landedAt: string | null): string | undefined {
  if (landedAt === null) return undefined;
  const at = new Date(landedAt).getTime();
  if (Number.isNaN(at)) return undefined;
  const now = Date.now();
  if (at > now + HOUR || at < now - PAID_HOURS * HOUR) return undefined;
  return new Date(at + PAID_HOURS * HOUR).toISOString();
}

/** Razorpay puts our order id in different places depending on which event this is. */
function aggregatorOrderIdOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const payload = (body as { payload?: unknown }).payload;
  if (typeof payload !== 'object' || payload === null) return null;
  const entities = payload as {
    payment?: { entity?: { order_id?: unknown } };
    order?: { entity?: { id?: unknown } };
  };
  const fromPayment = entities.payment?.entity?.order_id;
  if (typeof fromPayment === 'string' && fromPayment !== '') return fromPayment;
  const fromOrder = entities.order?.entity?.id;
  return typeof fromOrder === 'string' && fromOrder !== '' ? fromOrder : null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (secret === undefined || secret === '') return json({ reason: 'unconfigured' }, 503);

  // The raw text first and parsed second: the signature is over the bytes Razorpay sent, and
  // a re-serialised object is a different set of bytes.
  const raw = await request.text();
  const sent = request.headers.get('x-razorpay-signature') ?? '';
  if (!sameSignature(sent, await signedWith(secret, raw))) {
    return json({ reason: 'signature' }, 400);
  }

  let body: { event?: unknown };
  try {
    body = JSON.parse(raw) as { event?: unknown };
  } catch {
    return json({ reason: 'not-json' }, 400);
  }

  // Anything else gets a 200 so Razorpay stops retrying: it is not a failure, it is not ours.
  if (typeof body.event !== 'string' || !SETTLES.includes(body.event)) {
    return json({ ignored: true });
  }
  const aggregatorOrderId = aggregatorOrderIdOf(body);
  if (aggregatorOrderId === null) return json({ ignored: true });

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const found = await db
    .from('orders')
    .select('id, device_id, slots, status')
    .eq('aggregator', 'razorpay')
    .eq('aggregator_order_id', aggregatorOrderId)
    .maybeSingle();
  if (found.error) return json({ error: found.error.message }, 500);
  const order = found.data as {
    id: string;
    device_id: string;
    slots: number;
    status: string;
  } | null;
  // An order we never made: another integration on the same account, or a test delivery.
  if (order === null) return json({ ignored: true });
  if (order.status === 'paid') return json({ ok: true, already: true });

  // The aggregator's own record of the payment, verbatim, for reconciling a dispute. Written
  // before the settlement so a settlement that fails still leaves the evidence behind.
  const kept = await db.from('orders').update({ webhook_payload: body }).eq('id', order.id);
  if (kept.error) return json({ error: kept.error.message }, 500);

  const pkcs8 = Deno.env.get('PASS_SIGNING_KEY');
  if (pkcs8 === undefined || pkcs8 === '') return json({ reason: 'unsigned' }, 503);
  const privateKey = await importPrivateKey(pkcs8);

  const device = await db
    .from('devices')
    .select('landed_at')
    .eq('id', order.device_id)
    .maybeSingle();
  if (device.error) return json({ error: device.error.message }, 500);
  const landedAt = (device.data as { landed_at: string | null } | null)?.landed_at ?? null;
  const counterOffAt = counterOffAtFrom(landedAt);

  const familyId = crypto.randomUUID();
  const passes: SignedPass[] = [];
  for (let slot = 1; slot <= order.slots; slot += 1) {
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

  // One transaction: the family, every pass, slot 1 bound to the buying phone, the coupon
  // burned, the order paid. The row lock inside it is what makes a retried delivery harmless.
  const settled = await db.rpc('settle_order', {
    p_order_id: order.id,
    p_family_id: familyId,
    p_slots: order.slots,
    p_counter_off_at: counterOffAt ?? null,
    p_pass_ids: passes.map((pass) => pass.claims.passId),
    p_signatures: passes.map((pass) => pass.signature),
  });
  if (settled.error) {
    // Two deliveries crossing in flight: the other one settled it. Nothing to retry.
    if (settled.error.message.trim() === 'already-settled')
      return json({ ok: true, already: true });
    return json({ error: settled.error.message }, 500);
  }

  return json({ ok: true });
});

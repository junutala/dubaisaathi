/**
 * `bind` — decision 005's reconciliation: "each phone reports its slot when next online, and a
 * second phone reporting an already-bound slot is rejected at its own next sync."
 *
 * The phone sends the pass it installed — the claims it verified offline and the signature —
 * and this function answers with the slot's state on the server:
 *
 * - `{ bound: true }` — the slot is this phone's (it just was, or it already was).
 * - `{ bound: false, reason: 'taken' }` — another phone reported it first. The app clears the
 *   pass on this phone and says so on घर.4 in one honest line.
 * - `{ bound: false, reason: 'revoked' }` — हटाएँ on the buyer's phone; same on the app.
 * - `{ bound: false, reason: 'unknown' }` — not ours, or not in the table. The app leaves the
 *   pass alone: an answer it does not understand is not a reason to take something away.
 *
 * It is called opportunistically and never in the traveller's way: after a scan when there is
 * signal, and at most once a day after that. Offline, nothing here matters, by design.
 *
 * Secrets: `PASS_SIGNING_KEY` (base64 PKCS8; the public half is derived from it) or, if the
 * private key should stay on `redeem` alone, `PASS_PUBLIC_KEY` (base64 SPKI). One of the two.
 * `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from the platform.
 *
 * Same rules as every function here: no IP read, no account, the app's origin only.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  importPrivateKey,
  importPublicKey,
  publicKeyOf,
  verifyPass,
  type PassClaims,
} from '../_shared/sign.ts';

const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

const PAID_HOURS = 336;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PassRow {
  id: string;
  family_id: string;
  slot: number;
  status: 'issued' | 'bound' | 'revoked';
  device_id: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

async function verifyingKey(): Promise<CryptoKey | null> {
  const spki = Deno.env.get('PASS_PUBLIC_KEY');
  if (spki !== undefined && spki !== '') return importPublicKey(spki);
  const pkcs8 = Deno.env.get('PASS_SIGNING_KEY');
  if (pkcs8 !== undefined && pkcs8 !== '') return publicKeyOf(await importPrivateKey(pkcs8));
  return null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let payload: {
    deviceId?: unknown;
    passId?: unknown;
    familyId?: unknown;
    slot?: unknown;
    counterOffAt?: unknown;
    hours?: unknown;
    signature?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'not JSON' }, 400);
  }

  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : '';
  if (!UUID.test(deviceId)) return json({ error: 'deviceId must be a uuid' }, 400);
  if (
    typeof payload.passId !== 'string' ||
    typeof payload.familyId !== 'string' ||
    typeof payload.signature !== 'string' ||
    !Number.isInteger(payload.slot)
  ) {
    return json({ error: 'a pass needs passId, familyId, slot and signature' }, 400);
  }

  // The claims exactly as the phone holds them, because the signature is over those bytes and
  // not over what this table would reconstruct (a timestamp read back is not the same string).
  const claims: PassClaims = {
    passId: payload.passId,
    familyId: payload.familyId,
    slot: payload.slot as number,
    kind: 'paid',
    ...(typeof payload.counterOffAt === 'string' ? { counterOffAt: payload.counterOffAt } : {}),
    hours: typeof payload.hours === 'number' ? payload.hours : PAID_HOURS,
  };

  const key = await verifyingKey();
  if (key === null) return json({ error: 'no verifying key configured' }, 503);
  if (!(await verifyPass({ claims, signature: payload.signature }, key))) {
    return json({ bound: false, reason: 'unknown' });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const seen = await db
    .from('devices')
    .upsert({ id: deviceId, last_seen_at: new Date().toISOString() }, { onConflict: 'id' });
  if (seen.error) return json({ error: seen.error.message }, 500);

  const found = await db
    .from('passes')
    .select('id, family_id, slot, status, device_id')
    .eq('id', claims.passId)
    .maybeSingle();
  if (found.error) return json({ error: found.error.message }, 500);
  const row = found.data as PassRow | null;
  if (row === null || row.family_id !== claims.familyId || row.slot !== claims.slot) {
    return json({ bound: false, reason: 'unknown' });
  }

  if (row.status === 'revoked') return json({ bound: false, reason: 'revoked' });
  if (row.status === 'bound') {
    return row.device_id === deviceId
      ? json({ bound: true })
      : json({ bound: false, reason: 'taken' });
  }

  // Issued and nobody's yet. The partial unique index in 0001 (one bound slot per device) is
  // the last word: a phone that already holds a slot cannot take a second, and two phones
  // reporting the same slot in the same second cannot both win.
  const bound = await db
    .from('passes')
    .update({ status: 'bound', device_id: deviceId, bound_at: new Date().toISOString() })
    .eq('id', claims.passId)
    .eq('status', 'issued')
    .select('id');
  if (bound.error) {
    if (/passes_one_slot_per_device/.test(bound.error.message)) {
      return json({ bound: false, reason: 'taken' });
    }
    return json({ error: bound.error.message }, 500);
  }
  if ((bound.data ?? []).length === 0) {
    // Somebody bound it between the read and the write.
    return json({ bound: false, reason: 'taken' });
  }
  return json({ bound: true });
});

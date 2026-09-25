/**
 * `admin` — the one door admin.saafarsaathi.in reads through (decision 040).
 *
 * It answers one question, "how is Saathi doing?", with one document of totals: how it is used,
 * what travellers asked for and did not get, how collection stands, the money and the website's
 * messages. It is the only caller of `admin_metrics()` (migration 0016), which no browser key can
 * run: the page never holds a database key, only the owner's passphrase.
 *
 * Rules it keeps:
 * - **The passphrase is never stored**, only its SHA-256 below. Twenty random characters from a
 *   31-letter alphabet (about 99 bits), so the fingerprint being readable is not a way in. A new
 *   passphrase is a new fingerprint and a redeploy.
 * - **Totals, not people.** Nothing here returns a device id, and nothing places anyone anywhere.
 * - **Its own origins only.** CORS names the admin app's addresses, never `*`.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PASS_SHA256 = '6f9d616517e970d80597f3079f255b850e2846533e91954929fc3adaf610a991';

const ORIGINS = ['https://admin.saafarsaathi.in', 'https://admin-production-976c.up.railway.app'];

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':
      origin !== null && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compared in constant time, so the answer's timing says nothing about how close a guess was. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request: Request): Promise<Response> => {
  const headers = cors(request.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store' },
    });

  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let pass = '';
  try {
    const body = (await request.json()) as { pass?: unknown };
    pass = typeof body.pass === 'string' ? body.pass.trim().toLowerCase() : '';
  } catch {
    return json({ error: 'not JSON' }, 400);
  }
  if (!same(await sha256(pass), PASS_SHA256)) return json({ error: 'wrong passphrase' }, 401);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const { data, error } = await db.rpc('admin_metrics');
  if (error) return json({ error: error.message }, 500);
  return json(data);
});

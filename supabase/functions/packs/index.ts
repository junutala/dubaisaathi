/**
 * `packs` — content, without a release (decision 030).
 *
 * Two questions and nothing else:
 *
 *   GET /packs           → which packs exist and what version each one is. A few hundred bytes,
 *                          asked on launch and when the app comes back to the foreground.
 *   GET /packs?id=<name> → that pack's body, asked only when the version it holds is older.
 *
 * Why a function rather than a bucket of files: this is the same origin the app already talks to
 * for everything else, under the same publishable key and the same CSP entry, and publishing is
 * then a row rather than an upload with its own credentials. The bodies are small — the largest,
 * the RTA network, is 1.6 MB and changes when the RTA publishes, which is not often.
 *
 * Rules it keeps:
 * - **Read-only.** Nothing here writes; publishing is a privileged step run by a person.
 * - **No device id, no identity.** A pack is the same for everybody, so nothing about who is
 *   asking is read, logged or needed (decisions 001 and 011).
 * - **Never cached.** A manifest answered from last week's cache is the defect this replaces.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  Vary: 'Origin',
};

/** A pack name is a word we chose, so anything else is a mistake rather than a lookup. */
const PACKS = ['restaurants', 'attractions', 'transport'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'GET') return json({ error: 'GET' }, 405);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const wanted = new URL(request.url).searchParams.get('id');

  // The manifest: everything but the bodies, which is what makes it cheap enough to ask often.
  if (wanted === null) {
    const found = await db
      .from('content_packs')
      .select('id, version, published_at, bytes, sha')
      .order('id');
    if (found.error) return json({ error: found.error.message }, 500);
    return json({
      packs: (found.data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        version: row.version,
        publishedAt: row.published_at,
        bytes: row.bytes,
        sha: row.sha,
      })),
    });
  }

  if (!PACKS.includes(wanted)) return json({ error: 'no such pack' }, 404);

  const found = await db
    .from('content_packs')
    .select('id, version, published_at, sha, body')
    .eq('id', wanted)
    .maybeSingle();
  if (found.error) return json({ error: found.error.message }, 500);
  if (!found.data) return json({ error: 'no such pack' }, 404);

  const row = found.data as Record<string, unknown>;
  return json({
    id: row.id,
    version: row.version,
    publishedAt: row.published_at,
    sha: row.sha,
    body: row.body,
  });
});

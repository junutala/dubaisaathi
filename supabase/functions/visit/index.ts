/**
 * `visit` — saafarsaathi.in reporting what one visit did (decision 053).
 *
 * The page sends the whole visit so far — how long it was on the screen, how far down it was
 * read, which sections reached the screen, what was pressed — on arrival, whenever the tab is
 * hidden and on a tap that leaves the page, and `record_site_visit()` (migration 0026) keeps the
 * most of each. It is sent with `navigator.sendBeacon`, which survives the page closing but can
 * carry no headers: so this function runs without the platform's key check (`verify_jwt` off),
 * reads a `text/plain` body, and is strict about everything in it instead.
 *
 * Rules it keeps:
 * - **No IP address and no cookie** (decision 011): the visit is a random id the page made for
 *   this tab, and nothing here reads where the request came from.
 * - **Nothing joins to a traveller.** No device id is read, sent or stored.
 * - **Only words it knows.** Sections and taps come from two fixed lists; anything else is dropped,
 *   so the table cannot become a place to write.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://saafarsaathi.in', 'https://www.saafarsaathi.in'];

const SECTIONS = ['try', 'watch', 'pillars', 'bolna', 'pass', 'more', 'partners', 'contact'];
const TAPS = ['open-app', 'hear-board', 'whatsapp', 'share', 'lang', 'contact-sent'];
const DEVICES = ['phone', 'tablet', 'laptop'];

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin ?? '')
      ? (origin as string)
      : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  };
}

/** Whole numbers inside a range; anything else is the low end. */
function whole(value: unknown, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(max, Math.max(0, n));
}

/** Only the words on the list, each once. */
function known(value: unknown, list: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => list.includes(String(item))))];
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get('origin');
  const done = (status: number) => new Response(null, { status, headers: cors(origin) });
  if (request.method === 'OPTIONS') return done(204);
  if (request.method !== 'POST') return done(405);
  // A browser always names the page that sent a beacon; anything else is not the website.
  if (!ALLOWED_ORIGINS.includes(origin ?? '')) return done(403);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return done(413);
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return done(400);
  }

  const visitId = String(body.visit ?? '');
  const tag = String(body.tag ?? '');
  const device = String(body.device ?? '');
  const lang = String(body.lang ?? '');
  if (
    !/^[a-z0-9]{12,40}$/.test(visitId) ||
    !/^[a-z0-9-]{1,40}$/.test(tag) ||
    !DEVICES.includes(device) ||
    (lang !== 'hi' && lang !== 'en')
  ) {
    return done(400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const { error } = await db.rpc('record_site_visit', {
    p_visit_id: visitId,
    p_tag: tag,
    p_device: device,
    p_lang: lang,
    p_seconds: whole(body.seconds, 3600),
    p_scroll: whole(body.scroll, 100),
    p_reached: known(body.reached, SECTIONS),
    p_taps: known(body.taps, TAPS),
  });
  return done(error ? 500 : 204);
});

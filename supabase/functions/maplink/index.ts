/**
 * `maplink` — where a short maps link on a hotel's card goes (decision 032, the owner's addendum).
 *
 * Many Dubai hotel cards carry a QR code that opens Google Maps. A long link says where the hotel
 * is in its own text and the phone reads it with the radio off. A short one — maps.app.goo.gl —
 * says nothing until it is followed, and a phone following it itself would fetch Google's pages
 * from the traveller's own connection. So the phone hands the link here, after Submit, and this
 * follows it and gives back the long link and what it says.
 *
 *   POST /maplink  { "url": "https://maps.app.goo.gl/…" }
 *     → 200 { url, at?: {lat, lng}, name? }   the long Maps link, and the place on it
 *     → 400                                    not a short maps link: nothing was fetched
 *     → 422                                    it led somewhere that is not Google Maps
 *     → 502                                    Google did not answer
 *
 * Rules it keeps:
 * - **Only Google's short links, only to Google Maps.** The link must be one of the short-link
 *   hosts in `_shared/mapsLink.ts`, every redirect must be another of them or a Maps page, and a
 *   Maps page is never fetched — its address is the answer. Nothing else is ever asked for, so
 *   this cannot be pointed at an address of anybody's choosing. Five hops at most.
 * - **Stores nothing, reads no device id, logs no address** (decision 011). The link in, the link
 *   out; the request's origin is the only header read.
 */

import { isShortMapsLink, mapsPlaceOf, nextHop } from '../_shared/mapsLink.ts';

const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

/** Google's short links go one or two hops; anything longer is not one of them. */
const MAX_HOPS = 5;
/** Each hop's answer, or the traveller is told the link could not be followed. */
const HOP_MS = 5000;
/** A link off a card, not a document. */
const MAX_CHARS = 300;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** The long Maps link, and what it says, once a hop has reached one. */
function answer(url: string): Response {
  return json({ url, ...(mapsPlaceOf(url) ?? {}) });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let given: unknown;
  try {
    given = ((await request.json()) as { url?: unknown }).url;
  } catch {
    return json({ error: 'not JSON' }, 400);
  }
  if (typeof given !== 'string' || given.length > MAX_CHARS || !isShortMapsLink(given)) {
    return json({ error: 'not a short maps link' }, 400);
  }

  // Always over TLS, whatever the card printed.
  let current = given.trim().replace(/^http:/i, 'https:');
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(HOP_MS),
      });
    } catch {
      return json({ error: 'the link did not answer' }, 502);
    }
    // The body is never read: only where it points.
    await response.body?.cancel();
    // Google failing is not the link failing: the phone keeps it and asks again later.
    if (response.status >= 500) return json({ error: 'the link did not answer' }, 502);
    const location = response.headers.get('location');
    if (response.status < 300 || response.status > 399 || location === null) {
      return json({ error: 'the link led nowhere' }, 422);
    }
    const next = nextHop(location, current);
    if (next.kind === 'maps') return answer(next.url);
    if (next.kind === 'refused') return json({ error: 'not a maps link' }, 422);
    current = next.url.replace(/^http:/i, 'https:');
  }
  return json({ error: 'too many hops' }, 422);
});

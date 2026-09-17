/**
 * `contact` — the website's form, and the only door it has.
 *
 * saafarsaathi.in is static: nginx and a folder of files, nothing that can receive a form
 * (decision 012). So the page posts here, and this writes the message into `contact_messages`.
 * There is no mail: the owner reads the table (decision 023). That is a deliberate choice over
 * an SMTP provider — a message in our own database cannot bounce, expire with an API key, or
 * land in a spam folder, and the admin screen that will show these is already the plan.
 *
 * Rules it keeps:
 * - **No IP address** (decision 011), same as every other function here. The rate limit below
 *   counts by the number typed into the form, never by where the request came from.
 * - **One origin** (decision 012). CORS is the website's, never `*`.
 * - **Nothing joins to a traveller.** No device id is read, sent or stored.
 *
 * It is not in anybody's way: nothing in the traveller's app calls this, and if it is down the
 * page says so and offers WhatsApp, which does not depend on us at all.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

/** The website, both the way GoDaddy forwards it and the way it is served. */
const ALLOWED_ORIGINS = ['https://saafarsaathi.in', 'https://www.saafarsaathi.in'];

/** One person, one number, one day. A form this quiet needs no more room than this. */
const MAX_PER_NUMBER_PER_DAY = 5;

const WHO = ['traveller', 'operator', 'outlet'];
const COUNTRY = ['IN', 'AE'];
const LOCALE = ['hi', 'en'];

/** Digits only, as the form strips them: 10 for India, 9 for the UAE, room either side. */
const PHONE = /^[0-9]{6,12}$/;

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin ?? '')
      ? (origin as string)
      : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'content-type': 'application/json' },
  });
}

/** A string that is there, is a string, and is not longer than it may be. */
function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405, origin);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'not JSON' }, 400, origin);
  }

  // The honeypot: a field the form hides and a person never sees, so anything in it was put
  // there by something filling every input on the page. Answered 200 and dropped — a script
  // told it failed simply tries again with the field empty.
  if (text(payload.company, 200) !== '') return json({ saved: true }, 200, origin);

  const who = String(payload.who ?? '');
  const country = String(payload.country ?? '');
  const locale = String(payload.locale ?? 'hi');
  const name = text(payload.name, 80);
  const phone = text(payload.phone, 20).replace(/\D/g, '');
  const message = text(payload.message, 2000);

  // Said one field at a time, because the page puts the answer next to the field it names.
  if (!WHO.includes(who)) return json({ error: 'who' }, 400, origin);
  if (name === '') return json({ error: 'name' }, 400, origin);
  if (!COUNTRY.includes(country)) return json({ error: 'country' }, 400, origin);
  if (!PHONE.test(phone)) return json({ error: 'phone' }, 400, origin);
  if (message === '') return json({ error: 'message' }, 400, origin);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Counted by the number given, never by where the request came from (decision 011). Somebody
  // who really has five things to say in a day can ring the WhatsApp number on the same page.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const seen = await db
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('country', country)
    .eq('phone', phone)
    .gte('at', since);
  if ((seen.count ?? 0) >= MAX_PER_NUMBER_PER_DAY) {
    return json({ error: 'too many' }, 429, origin);
  }

  const insert = await db.from('contact_messages').insert({
    who,
    name,
    country,
    phone,
    message,
    locale: LOCALE.includes(locale) ? locale : 'hi',
  });
  if (insert.error) return json({ error: 'save failed' }, 500, origin);

  return json({ saved: true }, 200, origin);
});

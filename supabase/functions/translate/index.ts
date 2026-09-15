/**
 * `translate` — Hindi and Hinglish into Arabic, for any sentence.
 *
 * The app does not call Google directly, because an API key compiled into a PWA is a public key
 * and the bill would be a stranger's to run up. The key lives here, in the function's secrets,
 * and this is the one place a per-device limit can be added when it is needed.
 *
 * Latin-script input is the whole point. A traveller types "mujhe garam paani chahiye", not
 * Devanagari, and Cloud Translation's v3 endpoint handles romanized Hindi directly — so nothing
 * transliterates first, which would be one more place to lose the meaning.
 *
 * Grammar is not our business: the owner ruled that conveying the meaning beats chaste Arabic
 * ("better than sign language in the middle of the road at 50C"). Output goes out as it comes.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** A traveller's sentence, not a document. Anything longer is a mistake or an attempt to bill us. */
const MAX_CHARS = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  const key = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
  if (!key) return json({ error: 'translation is not configured' }, 503);

  let text: unknown;
  try {
    text = ((await request.json()) as { text?: unknown }).text;
  } catch {
    return json({ error: 'not JSON' }, 400);
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return json({ error: 'nothing to translate' }, 400);
  }
  if (text.length > MAX_CHARS) return json({ error: 'too long' }, 413);

  // `source` is left unset on purpose. A traveller mixes Hindi, English and place names in one
  // sentence — "Karama metro station ke paas koi Jain restaurant hai?" — and letting Google
  // detect rather than being told is what keeps that sentence working.
  const answer = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: text, target: 'ar', format: 'text' }),
    },
  );

  if (!answer.ok) {
    // Never pass Google's body back: it can carry the key in an error echo.
    return json({ error: 'translation failed', status: answer.status }, 502);
  }

  const body = (await answer.json()) as {
    data?: { translations?: { translatedText?: string; detectedSourceLanguage?: string }[] };
  };
  const first = body.data?.translations?.[0];
  const ar = first?.translatedText;
  if (typeof ar !== 'string' || ar.trim() === '') return json({ error: 'empty translation' }, 502);

  return json({ ar, from: first?.detectedSourceLanguage ?? null });
});

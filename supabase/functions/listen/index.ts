/**
 * `listen` — a sentence spoken in any Indian language, back as English text (decision 020).
 *
 * This is the one place in the product where a microphone is involved. Decision 016 took voice
 * out after three days on a real phone proved no offline recogniser hears Dubai place names in
 * an Indian accent inside a Hindi sentence; the three pillars are typed into and stay that way.
 * बोलना is a different job — a traveller saying a whole sentence to be shown to a Dubai local —
 * and it runs online, through Sarvam, which the owner has proven on real Hindi and Tamil.
 *
 * **No audio is stored. Anywhere.** Not in the database, not in storage, not in a log line. The
 * bytes arrive in this request, go straight to Sarvam, and are gone when the response is written.
 * The only thing that survives is the transcript, on the traveller's own phone.
 *
 * The key lives in this function's secrets, as `SARVAM_API_KEY`, exactly like
 * `GOOGLE_TRANSLATE_API_KEY` in `translate`. It never enters the repo, a migration or the
 * bundle: a key compiled into a PWA is a public key, and the bill would be a stranger's to
 * run up.
 *
 * ── The mode matters, and getting it wrong fails silently ───────────────────────────────────
 * Sarvam's `saaras:v3` has several output modes. `codemix` keeps the speaker's own words — good
 * where something downstream matches Hindi and English alike. `translate` renders any supported
 * Indic language as English, which is the whole point here: the traveller speaks Tamil or Hindi,
 * the screen has to show English a Dubai shopkeeper can read, and the Arabic is made from that
 * English. Ask for `codemix` when you wanted English and nothing errors — you simply get good
 * Tamil back. So the mode is written out here, once, with this note next to it.
 */

/** One origin (decision 012). Only the traveller's app may spend our Sarvam minutes. */
const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

/**
 * A sentence for a shopkeeper, not a dictation. Half a minute is long enough to say anything a
 * traveller needs said, and both ceilings exist so a stuck recording is refused here rather than
 * billed to us: the bytes are the real guard, the seconds are what the phone says it recorded.
 */
const MAX_BYTES = 6 * 1024 * 1024;
/**
 * The phone stops its own recording at thirty seconds; this sits a little above that so a
 * recording that was inside the limit is never turned away over a second of counting slack.
 */
const MAX_SECONDS = 35;

/**
 * Sarvam's language codes. Unknown falls back to Indian English rather than erroring — a hint is
 * a hint, and a traveller mid-sentence is worth more than a strict argument.
 */
const LANG: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  const key = Deno.env.get('SARVAM_API_KEY');
  if (!key) return json({ error: 'listening is not configured' }, 503);

  // Refused on the declared length before the body is read, so an oversized upload is not even
  // carried into memory. A request that lies about its length is caught by the check below.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BYTES) return json({ error: 'too long' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'not a recording' }, 400);
  }

  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) return json({ error: 'no audio' }, 400);
  if (audio.size > MAX_BYTES) return json({ error: 'too long' }, 413);

  // What the phone says it recorded. It is a hint, not a measurement — nothing here decodes the
  // audio — but it catches the long recording whose codec happened to keep it small.
  const seconds = Number(form.get('seconds') ?? '0');
  if (Number.isFinite(seconds) && seconds > MAX_SECONDS) return json({ error: 'too long' }, 413);

  const hint = form.get('language');
  const languageCode = (typeof hint === 'string' ? LANG[hint] : undefined) ?? 'en-IN';

  const outgoing = new FormData();
  outgoing.append('file', audio, audio.name === '' ? 'audio.webm' : audio.name);
  outgoing.append('model', 'saaras:v3');
  // See the note at the top: `translate` is what makes any Indian language come back as English.
  outgoing.append('mode', 'translate');
  outgoing.append('language_code', languageCode);

  let answer: Response;
  try {
    answer = await fetch(SARVAM_STT_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': key },
      body: outgoing,
    });
  } catch {
    // The fault is upstream and the phone may usefully try again. Nothing of the error is
    // passed on: it is ours to read in the function's logs, not the traveller's to decipher.
    return json({ error: 'could not listen' }, 502);
  }

  if (!answer.ok) {
    // Never pass the provider's body back: an error echo can carry the key.
    return json({ error: 'could not listen', status: answer.status }, 502);
  }

  const body = (await answer.json().catch(() => ({}))) as { transcript?: unknown };
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

  // An empty transcript is not an error: the traveller may simply not have spoken. The phone
  // says so in its own words ("heard nothing — a little longer, a little closer").
  return json({ transcript });
});

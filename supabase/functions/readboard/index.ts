/**
 * `readboard` — बोलना's board reader: a photograph of an Arabic board in, its meaning in Hindi out.
 *
 * The owner, 28 September: Dubai's boards are in Arabic and English, never Hindi. The traveller
 * photographs one; the Arabic on it is read and turned into Hindi, and the phone reads the Hindi
 * aloud.
 *
 * **Claude first, Google next** (the owner, 28 September: "let's promote Claude as the first
 * translator and then Google next. We will see how it goes"). Claude reads the board and gives its
 * meaning in one call; when it cannot be reached or fails, Cloud Vision reads the Arabic and Cloud
 * Translation turns it into Hindi on `GOOGLE_TRANSLATE_API_KEY` — the key बोलना already uses,
 * with the Cloud Vision API enabled on its Google project. Google's reading is trusted only when
 * it holds enough Arabic and comes back in Hindi letters. Both are always tried in turn: a
 * fallback that is reached, not written.
 *
 * Rules it keeps:
 * - **The photograph is never kept** — not in storage, not in a log. It is read and dropped. The
 *   phone has already shrunk it, which strips where and when it was taken.
 * - **The text is kept** (the owner: "the text tells us a lot"): the Arabic read and the Hindi
 *   given, in `board_readings` (migration 0022), with the phone's random id and nothing that
 *   names a person (decision 045).
 * - **Online only, like the rest of बोलना** (decision 020). One origin (decision 012): only the
 *   traveller's app may spend our reading.
 * - **Bounded**: a photograph of at most MAX_BYTES, and at most DAILY_CAP readings a day in all.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

/** The phone sends a shrunk JPEG of a few hundred kB; anything this large is not one. */
const MAX_BYTES = 4 * 1024 * 1024;
const DAILY_CAP = 3000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_MODEL = 'claude-opus-5';
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const;
type Media = (typeof MEDIA)[number];

/** Arabic letters, including the presentation forms signs are often set in. */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_ALL = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const DEVANAGARI = /[\u0900-\u097F]/;

/**
 * Fewer Arabic letters than this is a scrap from a cut-off edge, not a board: on 28 September a
 * sign photographed with its Arabic column half out of frame read as "ملے" and came back as
 * "mlے" — junk on the screen where "go closer" belonged.
 */
const MIN_ARABIC_LETTERS = 4;

type Reading =
  | { readonly kind: 'read'; readonly arabic: string; readonly hindi: string; readonly by: string }
  | { readonly kind: 'none' }
  /** Google would not read it, or its reading cannot be trusted. */
  | { readonly kind: 'refused'; readonly why: string }
  | { readonly kind: 'failed' };

/** Cloud Vision reads the board, and Cloud Translation turns its Arabic lines into Hindi. */
async function readWithGoogle(key: string, image: string): Promise<Reading> {
  const seen = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: image },
          features: [{ type: 'TEXT_DETECTION' }],
          imageContext: { languageHints: ['ar'] },
        },
      ],
    }),
  });
  // Never pass Google's body back: it can carry the key in an error echo.
  if (seen.status === 403 || seen.status === 400)
    return { kind: 'refused', why: `vision ${String(seen.status)}` };
  if (!seen.ok) return { kind: 'failed' };
  const vision = (await seen.json()) as {
    responses?: { fullTextAnnotation?: { text?: string }; error?: { code?: number } }[];
  };
  const first = vision.responses?.[0];
  if (first?.error !== undefined)
    return { kind: 'refused', why: `vision error ${String(first.error.code)}` };
  // Only the Arabic lines: a board's English half is already readable, and translating it too
  // would put two versions of one sign in front of the traveller.
  const arabic = (first?.fullTextAnnotation?.text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => ARABIC.test(line))
    .join('\n');
  if (arabic === '') return { kind: 'none' };
  // Too little to be a board: never shown; the traveller is asked for a closer photo instead.
  if ((arabic.match(ARABIC_ALL) ?? []).length < MIN_ARABIC_LETTERS)
    return { kind: 'refused', why: 'too little arabic' };

  const turned = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: arabic, source: 'ar', target: 'hi', format: 'text' }),
    },
  );
  if (turned.status === 403 || turned.status === 400)
    return { kind: 'refused', why: `translate ${String(turned.status)}` };
  if (!turned.ok) return { kind: 'failed' };
  const body = (await turned.json()) as { data?: { translations?: { translatedText?: string }[] } };
  const hindi = body.data?.translations?.[0]?.translatedText?.trim() ?? '';
  if (hindi === '') return { kind: 'failed' };
  // A "translation" with no Hindi letters, or with Arabic still in it, is the translator giving
  // up in public; it never reaches the screen.
  if (!DEVANAGARI.test(hindi) || ARABIC.test(hindi)) return { kind: 'refused', why: 'no hindi' };
  return { kind: 'read', arabic, hindi, by: 'google-vision+translate' };
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['arabic', 'hindi'],
  properties: {
    arabic: { type: 'string' },
    hindi: { type: 'string' },
  },
};

const SYSTEM = `You help an Indian traveller in Dubai who reads Hindi but not Arabic or English.
They have photographed a board, sign, notice or label.

- "arabic": the Arabic text on it, exactly as written, line by line. Leave out any English.
- "hindi": what the Arabic means, in simple everyday Hindi in Devanagari, the way a friend who reads
  Arabic would explain it to them. Meaning, not word for word. Keep every number, time, price and
  phone number exactly. Write names of places, shops and brands in Devanagari as they sound.
  If it is a warning or a rule, say plainly what is and is not allowed.
- If there is no Arabic text you can read, return both as empty strings. Never guess at text you
  cannot see, and say nothing about any person in the photograph.`;

let chosenModel: string | null = null;

async function pickModel(client: Anthropic): Promise<string> {
  const named = Deno.env.get('READBOARD_MODEL');
  if (named) return named;
  if (chosenModel !== null) return chosenModel;
  try {
    let newest: { id: string; created_at: string } | null = null;
    for await (const model of client.models.list()) {
      if (!model.id.startsWith('claude-opus-')) continue;
      if (newest === null || model.created_at > newest.created_at) newest = model;
    }
    chosenModel = newest?.id ?? FALLBACK_MODEL;
  } catch {
    chosenModel = FALLBACK_MODEL;
  }
  return chosenModel;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

/** Claude reads the board and gives its meaning in one call: the first reader. */
async function readWithClaude(key: string, image: string, media: Media): Promise<Reading> {
  const client = new Anthropic({ apiKey: key });
  const model = await pickModel(client);
  const params = {
    model,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: {
      effort: 'low' as const,
      format: { type: 'json_schema' as const, schema: SCHEMA },
    },
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: media, data: image },
          },
          { type: 'text' as const, text: 'What does this board say?' },
        ],
      },
    ],
  };

  let message: Anthropic.Beta.BetaMessage;
  try {
    try {
      // A declined request is re-run on Anthropic's recommended fallback rather than lost.
      message = await client.beta.messages.create({
        ...params,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    } catch (error) {
      // A model the fallback beta does not cover answers 400; read the board without it.
      if (!(error instanceof Anthropic.BadRequestError)) throw error;
      message = await client.beta.messages.create(params);
    }
  } catch {
    return { kind: 'failed' };
  }
  if (message.stop_reason === 'refusal') return { kind: 'none' };
  const text = message.content.find((block) => block.type === 'text');
  if (text === undefined || text.type !== 'text') return { kind: 'failed' };

  let read: { arabic?: unknown; hindi?: unknown };
  try {
    read = JSON.parse(text.text) as typeof read;
  } catch {
    return { kind: 'failed' };
  }
  const arabic = typeof read.arabic === 'string' ? read.arabic.trim() : '';
  const hindi = typeof read.hindi === 'string' ? read.hindi.trim() : '';
  return arabic === '' || hindi === ''
    ? { kind: 'none' }
    : { kind: 'read', arabic, hindi, by: message.model };
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  const googleKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!googleKey && !claudeKey) return json({ error: 'reading is not configured' }, 503);

  let body: { image?: unknown; type?: unknown; deviceId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'not JSON' }, 400);
  }
  const image = typeof body.image === 'string' ? body.image : '';
  const media = MEDIA.find((type) => type === body.type) as Media | undefined;
  if (image === '' || media === undefined) return json({ error: 'no photograph' }, 400);
  if ((image.length * 3) / 4 > MAX_BYTES) return json({ error: 'photograph too large' }, 413);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const today = await db
    .from('board_readings')
    .select('id', { count: 'exact', head: true })
    .gte('at', new Date(Date.now() - 86_400_000).toISOString());
  if ((today.count ?? 0) >= DAILY_CAP) return json({ error: 'busy' }, 429);

  // Claude first (the owner, 28 September: "let's promote Claude as the first translator and
  // then Google next — we will see how it goes"); Google when Claude cannot be reached or fails.
  let reading: Reading = { kind: 'failed' };
  if (claudeKey) reading = await readWithClaude(claudeKey, image, media);
  if (reading.kind === 'failed' && googleKey) {
    console.warn('readboard: claude failed, trying google');
    try {
      reading = await readWithGoogle(googleKey, image);
    } catch {
      reading = { kind: 'failed' };
    }
    if (reading.kind === 'refused') {
      console.warn(`readboard: google refused (${reading.why})`);
      // A scrap or a non-Hindi answer is a photo to take again, closer; a refusal of the key is
      // "not switched on" only when Claude was never there to try.
      if (reading.why === 'too little arabic' || reading.why === 'no hindi')
        reading = { kind: 'none' };
      else if (claudeKey) reading = { kind: 'failed' };
    }
  }

  switch (reading.kind) {
    case 'read': {
      // The text is kept, the photograph is not. A failed insert costs a statistic, never the
      // answer.
      const deviceId =
        typeof body.deviceId === 'string' && UUID.test(body.deviceId) ? body.deviceId : null;
      await db.from('board_readings').insert({
        arabic: reading.arabic,
        hindi: reading.hindi,
        model: reading.by,
        device_id: deviceId,
      });
      return json({ arabic: reading.arabic, hindi: reading.hindi });
    }
    case 'none':
      return json({ arabic: '', hindi: '' });
    case 'refused':
      return json({ error: 'reading is not configured' }, 503);
    case 'failed':
      return json({ error: 'reading failed' }, 502);
  }
});

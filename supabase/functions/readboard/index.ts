/**
 * `readboard` — बोलना's board reader: a photograph of an Arabic board in, its meaning in Hindi out.
 *
 * The owner, 28 September: Dubai's boards are in Arabic and English, never Hindi. The traveller
 * photographs one; Claude reads the Arabic and says what it means, in plain Hindi, the way a
 * friend who reads Arabic would — meaning, not word for word. The phone reads the Hindi aloud.
 *
 * Rules it keeps:
 * - **The photograph is never kept** — not in storage, not in a log. It is read and dropped. The
 *   phone has already shrunk it, which strips where and when it was taken.
 * - **The text is kept** (the owner: "the text tells us a lot"): the Arabic read and the Hindi
 *   given, in `board_readings` (migration 0022), with the phone's random id and nothing that
 *   names a person (decision 045).
 * - **The model is not in the code** (decision 043's rule): `READBOARD_MODEL` names one; without
 *   it, the newest Opus the Models API lists.
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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'reading is not configured' }, 503);

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
    return json({ error: 'reading failed' }, 502);
  }
  if (message.stop_reason === 'refusal') return json({ arabic: '', hindi: '' });
  const text = message.content.find((block) => block.type === 'text');
  if (text === undefined || text.type !== 'text') return json({ error: 'reading failed' }, 502);

  let read: { arabic?: unknown; hindi?: unknown };
  try {
    read = JSON.parse(text.text) as typeof read;
  } catch {
    return json({ error: 'reading failed' }, 502);
  }
  const arabic = typeof read.arabic === 'string' ? read.arabic.trim() : '';
  const hindi = typeof read.hindi === 'string' ? read.hindi.trim() : '';

  // The text is kept, the photograph is not. A failed insert costs a statistic, never the answer.
  if (arabic !== '' && hindi !== '') {
    const deviceId =
      typeof body.deviceId === 'string' && UUID.test(body.deviceId) ? body.deviceId : null;
    await db
      .from('board_readings')
      .insert({ arabic, hindi, model: message.model, device_id: deviceId });
  }
  return json({ arabic, hindi });
});

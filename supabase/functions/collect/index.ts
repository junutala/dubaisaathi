/**
 * `collect` — the one door the device's queue comes through.
 *
 * Every sentence a traveller typed or spoke is recorded on their phone at `synced: false` and
 * sits there until this function takes it. Until it existed the learning loop, the demand
 * figures and every number worth negotiating with were theoretical: five tables and no rows.
 *
 * What it is not: nothing here is in the path of a traveller trying to get to Karama. It is
 * called when the phone happens to be online, it never blocks a screen, and if it is down the
 * queue simply waits.
 *
 * Rules it has to keep:
 * - **No IP address, anywhere** (decision 011). The owner ruled on it and reversing it needs a
 *   written reason. Note that `x-forwarded-for` is deliberately never read below.
 * - **No account** (decision 001). The device id generated on the phone is the whole identity.
 * - **One origin** (decision 012). CORS is the app's own origin, never `*`: this takes a device
 *   id and a wildcard on it is a free forgery surface.
 * - **Idempotent.** Row ids are made on the device, so a retried sync cannot duplicate.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = 'https://dubai.saafarsaathi.in';

/** One sync carries a trip's worth of events at most; beyond that something is wrong. */
const MAX_EVENTS = 500;

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IncomingEvent {
  id: string;
  at: string;
  sttEngine: string;
  sttModel: string;
  transcript: string;
  correctedFrom?: string;
  unconstrainedTranscript?: string;
  script: 'devanagari' | 'roman' | 'mixed';
  intent: string;
  confidence: number;
  landedOn: string;
  failure: string | null;
  clarifierChoice?: string;
  resultCount?: number;
  resolvedPlaceId?: string;
  /** Whether the phone had a signal when this was recorded (migration 0015). */
  online?: boolean;
  /** On a day's first open: the country only, and whether it was the installed app (0017). */
  region?: string;
  installed?: boolean;
}

const REGIONS = ['dubai', 'india', 'elsewhere', 'unknown'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let payload: { deviceId?: string; platform?: string; appVersion?: string; events?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'not JSON' }, 400);
  }

  const deviceId = payload.deviceId ?? '';
  if (!UUID.test(deviceId)) return json({ error: 'deviceId must be a uuid' }, 400);

  const events = Array.isArray(payload.events) ? (payload.events as IncomingEvent[]) : [];
  if (events.length > MAX_EVENTS) return json({ error: 'too many events' }, 413);

  // The service role, because there is no login: RLS is on with no policies by design, and this
  // function is the thing that checks the device id itself.
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const platform = ['android', 'ios', 'other'].includes(payload.platform ?? '')
    ? payload.platform
    : null;

  // The device row has to exist before its events can point at it. `last_seen_at` is the only
  // thing an empty sync updates, which is what makes "how many phones are alive" answerable.
  const device = await db.from('devices').upsert(
    {
      id: deviceId,
      last_seen_at: new Date().toISOString(),
      ...(platform === null ? {} : { platform }),
      ...(payload.appVersion === undefined ? {} : { app_version: payload.appVersion }),
    },
    { onConflict: 'id' },
  );
  if (device.error) return json({ error: device.error.message }, 500);

  if (events.length === 0) return json({ accepted: [] });

  const rows = events
    .filter((event) => UUID.test(event.id ?? '') && typeof event.transcript === 'string')
    .map((event) => ({
      id: event.id,
      device_id: deviceId,
      at: event.at,
      stt_engine: event.sttEngine,
      stt_model: event.sttModel,
      transcript: event.transcript,
      corrected_from: event.correctedFrom ?? null,
      unconstrained_transcript: event.unconstrainedTranscript ?? null,
      script: event.script,
      intent: event.intent,
      // The column is checked 0..1; a phone sending nonsense should not fail the whole batch.
      confidence: Math.min(1, Math.max(0, Number(event.confidence) || 0)),
      landed_on: event.landedOn,
      failure: event.failure,
      clarifier_choice: event.clarifierChoice ?? null,
      result_count: event.resultCount ?? null,
      resolved_place_id: event.resolvedPlaceId ?? null,
      online: typeof event.online === 'boolean' ? event.online : null,
      region: REGIONS.includes(event.region ?? '') ? event.region : null,
      installed: typeof event.installed === 'boolean' ? event.installed : null,
    }));

  // Ignore duplicates rather than erroring: a phone that synced and lost the response will send
  // the same rows again, and losing the whole batch over rows we already hold helps nobody.
  const insert = await db
    .from('voice_events')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (insert.error) return json({ error: insert.error.message }, 500);

  // The ids the phone may now mark synced. It marks nothing on its own: anything not named here
  // stays queued and comes back next time.
  return json({ accepted: rows.map((row) => row.id) });
});

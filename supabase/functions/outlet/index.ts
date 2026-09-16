/**
 * `outlet` — where a collector's visit lands.
 *
 * Two people fill this in: the owner and his driver. So there is no human approval queue — a
 * report publishes into the next pack by default, and only the checks below hold one back. The
 * gate was never really about fraud, it is about error, and the one error that can actually hurt
 * somebody is a hard dietary `yes` ticked off a signboard rather than asked of a cook. That one
 * waits for a person.
 *
 * The upload is dumb on purpose: raw in, checks after. Any cleaning step on the phone means a
 * tired collector at 7pm deciding what is worth keeping, and the thing that gets dropped is the
 * ambiguous, valuable one — the Jain sambar at a place that is not a Jain restaurant.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Dubai, generously. A report from outside it is a mistake worth a second look. */
const DUBAI = { lat: 25.2, lng: 55.27 };
const DUBAI_RADIUS_KM = 90;
/** Two collectors working one street is the normal duplicate, not a rare one. */
const DUPLICATE_METRES = 40;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Base64 out of a data URL, without dragging in a dependency to do it. */
function bytesFromDataUrl(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  try {
    const binary = atob(dataUrl.slice(comma + 1));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let payload: { report?: Record<string, unknown>; photos?: { kind: string; dataUrl: string }[] };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'not JSON' }, 400);
  }

  const report = payload.report;
  if (!report || typeof report.id !== 'string' || typeof report.name !== 'string') {
    return json({ error: 'a report needs an id and a name' }, 400);
  }
  const at = report.location as { lat?: number; lng?: number } | undefined;
  if (typeof at?.lat !== 'number' || typeof at.lng !== 'number') {
    return json({ error: 'a report needs where it was taken' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // --- the checks, so a person only reads what needs judgement -----------------------------
  const flags: string[] = [];

  if (distanceKm({ lat: at.lat, lng: at.lng }, DUBAI) > DUBAI_RADIUS_KM) {
    flags.push('outside-dubai');
  }

  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  if (!photos.some((photo) => photo.kind === 'front')) flags.push('no-front-photo');

  const price = report.priceForOneAed;
  if (typeof price === 'number' && (price < 3 || price > 500)) flags.push('price-looks-wrong');

  /**
   * A hard `yes` on a dietary question with no dish named behind it. This is the only check that
   * asks for a human, because it is the only claim that can leave somebody unable to eat.
   */
  const dietary = (report.dietary ?? {}) as Record<string, unknown>;
  const dishes = Array.isArray(report.confirmedDishes) ? report.confirmedDishes : [];
  const hardYes = Object.entries(dietary).filter(([, value]) => value === true);
  if (hardYes.length > 0 && dishes.length === 0) flags.push('dietary-yes-without-a-dish');

  // A neighbour within 40 m with a similar name is very probably the same shop twice.
  const box = DUPLICATE_METRES / 111_000;
  const near = await db
    .from('field_reports')
    .select('id, name, lat, lng')
    .gte('lat', at.lat - box)
    .lte('lat', at.lat + box)
    .gte('lng', at.lng - box)
    .lte('lng', at.lng + box)
    .neq('id', report.id);
  const tidy = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (
    near.data?.some(
      (row: { name: string }) =>
        tidy(row.name).startsWith(tidy(report.name as string).slice(0, 6)) ||
        tidy(report.name as string).startsWith(tidy(row.name).slice(0, 6)),
    )
  ) {
    flags.push('looks-like-a-duplicate');
  }

  const row = {
    id: report.id,
    collector: String(report.collectorId ?? 'unknown'),
    captured_at: report.capturedAt ?? new Date().toISOString(),
    kind: report.kind ?? 'restaurant',
    lat: at.lat,
    lng: at.lng,
    name: report.name,
    name_hi: report.nameHi ?? null,
    area: report.areaId ?? report.areaName ?? null,
    phone: report.phone ?? null,
    kitchen: report.kitchen ?? null,
    dietary: report.dietary ?? {},
    confirmed_dishes: dishes.length > 0 ? dishes : null,
    hours: report.hours ?? null,
    hours_confirmed_at: report.hoursConfirmedAt ?? null,
    delivers: report.delivers ?? null,
    delivery_phone: report.deliveryPhone ?? null,
    price_for_one_aed: typeof price === 'number' ? Math.round(price) : null,
    spoke_to: report.spokeTo ?? null,
    notes: report.notes ?? null,
    // Published by default; a flag is what holds one back.
    status: flags.length > 0 ? 'flagged' : 'approved',
    flags,
  };

  const saved = await db.from('field_reports').upsert(row, { onConflict: 'id' });
  if (saved.error) return json({ error: saved.error.message }, 500);

  // Photographs after the row, so a failed image never costs the visit itself.
  let stored = 0;
  for (const [index, photo] of photos.entries()) {
    const bytes = bytesFromDataUrl(photo.dataUrl);
    if (!bytes) continue;
    const id = `${report.id.slice(0, 30)}${photo.kind === 'front' ? 'f' : 'm'}${String(index)}`;
    const uuid = crypto.randomUUID();
    const written = await db.from('field_photos').upsert(
      {
        id: uuid,
        report_id: report.id,
        kind: photo.kind === 'front' ? 'front' : 'menu',
        image: `\\x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`,
      },
      { onConflict: 'id' },
    );
    if (!written.error) stored += 1;
    void id;
  }

  return json({ id: report.id, status: row.status, flags, photos: stored });
});

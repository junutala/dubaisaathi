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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** Dubai, generously. A report from outside it is a mistake worth a second look. */
const DUBAI = { lat: 25.2, lng: 55.27 };
const DUBAI_RADIUS_KM = 90;
/** Two collectors working one street is the normal duplicate, not a rare one. */
const DUPLICATE_METRES = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  /**
   * One form's menu pages, for review to read (23 September): `?menu=0013` lists the pages it holds
   * and `?menu=0013&page=0` answers with that page as a JPEG. A menu is a card the restaurant hands
   * to anyone who asks, so this is no more private than the paper; nothing else about the report
   * comes with it.
   */
  const url = new URL(request.url);
  const menu = url.searchParams.get('menu');
  if (request.method === 'GET' && menu !== null) {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const found = await db.from('field_reports').select('id').eq('form_serial', menu).limit(1);
    const id = (found.data?.[0] as { id?: string } | undefined)?.id;
    if (id === undefined) return json({ error: 'no such form' }, 404);
    const page = url.searchParams.get('page');
    if (page === null) {
      const pages = await db
        .from('field_photos')
        .select('ord')
        .eq('report_id', id)
        .eq('kind', 'menu')
        .order('ord');
      return json({ form: menu, pages: (pages.data ?? []).map((row: { ord: number }) => row.ord) });
    }
    const shot = await db
      .from('field_photos')
      .select('image')
      .eq('report_id', id)
      .eq('kind', 'menu')
      .eq('ord', Number(page))
      .limit(1);
    const image = (shot.data?.[0] as { image?: string } | undefined)?.image;
    if (image === undefined) return json({ error: 'no such page' }, 404);
    const hex = image.startsWith('\\x') ? image.slice(2) : image;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return new Response(bytes, { headers: { ...CORS, 'content-type': 'image/jpeg' } });
  }

  /**
   * Menus wanted (the owner, 27 September, migration 0018): every pinned form that has no menu in
   * the app — no page uploaded on it, and none published from anywhere else — plus any form review
   * has put back with what is still missing.
   *
   * Each comes with its own name and whether it has a picture of its own (the cover taken at the
   * counter), because the list is used to match a paper menu in the hand to its form: which one is
   * 0030, not 0029 or 0031.
   */
  if (request.method === 'GET' && url.searchParams.has('open')) {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const forms = await db
      .from('field_reports')
      .select(
        'id, form_serial, name, lat, lng, captured_at, notes, menu_in_app_at, menu_wanted, menu_wanted_pages',
      )
      .not('form_serial', 'is', null)
      .order('form_serial', { ascending: true })
      .limit(2000);
    if (forms.error) return json({ error: forms.error.message }, 500);
    // First pages only: one row per form that has any, which stays far under the server's
    // 1,000-row answer however many pages the forms hold between them.
    const pages = await db
      .from('field_photos')
      .select('report_id')
      .eq('kind', 'menu')
      .eq('ord', 0)
      .limit(5000);
    if (pages.error) return json({ error: pages.error.message }, 500);
    const withPages = new Set(
      (pages.data ?? []).map((row: { report_id: string }) => row.report_id),
    );

    type Form = {
      id: string;
      form_serial: string;
      name: string | null;
      lat: number;
      lng: number;
      captured_at: string;
      notes: string | null;
      menu_in_app_at: string | null;
      menu_wanted: string | null;
      menu_wanted_pages: number | null;
    };
    const all = (forms.data ?? []) as Form[];

    // A form review asked more of leaves the list once it holds more pages than it did then
    // (migration 0019), so pages photographed from the list take it off without review's help.
    const asked = all.filter((form) => form.menu_wanted !== null && form.menu_wanted.trim() !== '');
    const held = new Map<string, number>();
    if (asked.length > 0) {
      const counted = await db
        .from('field_photos')
        .select('report_id')
        .eq('kind', 'menu')
        .in(
          'report_id',
          asked.map((form) => form.id),
        )
        .limit(5000);
      if (counted.error) return json({ error: counted.error.message }, 500);
      for (const row of (counted.data ?? []) as { report_id: string }[]) {
        held.set(row.report_id, (held.get(row.report_id) ?? 0) + 1);
      }
    }
    const open = all.flatMap((form) => {
      const wanted =
        form.menu_wanted !== null &&
        form.menu_wanted.trim() !== '' &&
        (held.get(form.id) ?? 0) <= (form.menu_wanted_pages ?? 0);
      const noMenu = !withPages.has(form.id) && form.menu_in_app_at === null;
      if (!wanted && !noMenu) return [];
      return [
        {
          formSerial: form.form_serial,
          name: form.name !== null && form.name.trim() !== '' ? form.name : null,
          lat: form.lat,
          lng: form.lng,
          capturedAt: form.captured_at,
          notes: form.notes,
          wanted: wanted ? form.menu_wanted : null,
          picture: withPages.has(form.id),
        },
      ];
    });
    return json({ forms: open });
  }

  /**
   * The pins a rider has dropped and nobody has keyed the paper for yet (decision 029).
   *
   * Narrow on purpose: the id, the number written on the form, where it was taken and by whom —
   * and the frontage photograph, because a list of bare numbers is a miserable thing to match a
   * stack of paper against. No menu, no dietary, nothing a stranger could use, which is what
   * makes this read safe in an app that has no accounts by decision.
   */
  if (request.method === 'GET') {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    // Waiting is what the POST below says it is: a pin whose paper has not been keyed. Since the
    // desk may leave the kitchen for review (23 September), a missing kitchen no longer means it.
    const waiting = await db
      .from('field_reports')
      .select('id, form_serial, lat, lng, captured_at, collector')
      .not('form_serial', 'is', null)
      .contains('flags', ['awaiting-paper'])
      .order('captured_at', { ascending: true })
      .limit(400);
    if (waiting.error) return json({ error: waiting.error.message }, 500);

    const ids = (waiting.data ?? []).map((row: { id: string }) => row.id);
    const shots =
      ids.length === 0
        ? { data: [] }
        : await db
            .from('field_photos')
            .select('report_id, image')
            .eq('kind', 'front')
            .in('report_id', ids);
    const frontage = new Map<string, string>();
    for (const shot of (shots.data ?? []) as { report_id: string; image: string }[]) {
      // Postgres hands bytea back as `\x…`; the app wants something an <img> can show.
      const hex = shot.image.startsWith('\\x') ? shot.image.slice(2) : shot.image;
      const bytes = new Uint8Array((hex.match(/.{2}/g) ?? []).map((pair) => parseInt(pair, 16)));
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      frontage.set(shot.report_id, `data:image/jpeg;base64,${btoa(binary)}`);
    }

    return json(
      {
        pins: (waiting.data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id,
          formSerial: row.form_serial,
          lat: row.lat,
          lng: row.lng,
          capturedAt: row.captured_at,
          collector: row.collector,
          front: frontage.get(String(row.id)) ?? null,
        })),
      },
      200,
    );
  }

  if (request.method !== 'POST') return json({ error: 'GET or POST' }, 405);

  /**
   * Pages added to a form that is already on the server, from the menus-wanted list: `?pages=0027`
   * with `{ photos: [{ id, dataUrl }] }`. Each page is appended after the form's last one. The
   * phone's id for the page is kept as the row's id, so a retry after a lost answer is the same
   * row again rather than a second copy. The answer is how many pages the form now holds, which is
   * what the phone shows before it lets the collector move on.
   */
  const addTo = url.searchParams.get('pages');
  if (addTo !== null) {
    let body: { photos?: { id?: string; dataUrl?: string }[] };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'not JSON' }, 400);
    }
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const found = await db.from('field_reports').select('id').eq('form_serial', addTo).limit(1);
    const reportId = (found.data?.[0] as { id?: string } | undefined)?.id;
    if (reportId === undefined) return json({ error: 'no such form' }, 404);

    const count = async (): Promise<number> => {
      const held = await db
        .from('field_photos')
        .select('id', { count: 'exact', head: true })
        .eq('report_id', reportId)
        .eq('kind', 'menu');
      return held.count ?? 0;
    };
    for (const photo of Array.isArray(body.photos) ? body.photos : []) {
      const bytes = typeof photo.dataUrl === 'string' ? bytesFromDataUrl(photo.dataUrl) : null;
      const id = typeof photo.id === 'string' && UUID.test(photo.id) ? photo.id : null;
      if (bytes === null || id === null)
        return json({ error: 'a page needs an id and a picture' }, 400);
      const already = await db.from('field_photos').select('id').eq('id', id).limit(1);
      if ((already.data ?? []).length > 0) continue;
      const last = await db
        .from('field_photos')
        .select('ord')
        .eq('report_id', reportId)
        .eq('kind', 'menu')
        .order('ord', { ascending: false })
        .limit(1);
      const ord = ((last.data?.[0] as { ord?: number } | undefined)?.ord ?? -1) + 1;
      const written = await db.from('field_photos').insert({
        id,
        report_id: reportId,
        kind: 'menu',
        ord,
        image: `\\x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`,
      });
      if (written.error) return json({ error: written.error.message }, 502);
    }
    return json({ form: addTo, pages: await count() });
  }

  let payload: {
    report?: Record<string, unknown>;
    photos?: { kind: string; dataUrl: string; ord?: number }[];
  };
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
  // No photograph of the shop is ever asked for, so none is missing (the owner, 23 September:
  // photographing shops in Dubai is a risk he will not take). Nothing is flagged for its absence.

  /**
   * A rider's pin: a number and a fix, with the five answers still on paper in somebody's bag
   * (decision 029). It is not an approved outlet and must not read as one in review — it is a
   * row waiting for its form, and this is what the desk lists.
   */
  if (typeof report.formSerial === 'string' && !report.kitchen && !report.keyedAt) {
    flags.push('awaiting-paper');
  }
  /**
   * Keyed at the desk in the owner's four steps — number, questions, menu, submit — with the name
   * or the kind of kitchen left for review to read off the menu. Held until it has been.
   */
  if (report.keyedAt && (String(report.name ?? '').trim() === '' || !report.kitchen)) {
    flags.push('read-from-menu');
  }

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
  const mine = tidy(typeof report.name === 'string' ? report.name : '');
  // A rider's pin carries no name — the board is in the photograph (decision 029). Comparing an
  // empty string would match every neighbour, so proximity alone is not enough to call a twin.
  if (
    mine !== '' &&
    near.data?.some(
      (row: { name: string }) =>
        tidy(row.name).startsWith(mine.slice(0, 6)) || mine.startsWith(tidy(row.name).slice(0, 6)),
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
    // The paper form's printed number, when this is a rider's pin (decision 029).
    form_serial: typeof report.formSerial === 'string' ? report.formSerial : null,
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

  /**
   * Photographs after the row, so a failed image never costs the visit itself.
   *
   * A photograph is identified by its slot — this report's front, its second menu page — and not
   * by an id minted here (migration 0013). The same report is sent again after a lost response,
   * and again when a rider's pin is completed into a full outlet on the same phone, and each of
   * those must leave one row per picture rather than another copy of it.
   */
  let stored = 0;
  let readable = 0;
  const seen = { front: 0, menu: 0 };
  for (const photo of photos) {
    const bytes = bytesFromDataUrl(photo.dataUrl);
    if (!bytes) continue;
    readable += 1;
    const kind = photo.kind === 'front' ? 'front' : 'menu';
    // A batch of a long menu says which page each photo is; a whole report in one request may
    // leave it to its order.
    const ord =
      typeof photo.ord === 'number' && Number.isInteger(photo.ord) && photo.ord >= 0
        ? photo.ord
        : seen[kind];
    seen[kind] += 1;
    const written = await db.from('field_photos').upsert(
      {
        report_id: report.id,
        kind,
        ord,
        image: `\\x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`,
      },
      { onConflict: 'report_id,kind,ord' },
    );
    if (!written.error) stored += 1;
  }

  // A page that did not store is not a report that arrived: the phone keeps it queued and sends
  // the batch again, which the slots above make harmless. One that could not be decoded would
  // fail the same way for ever, so it does not hold the visit back.
  if (stored < readable) {
    return json({ error: 'photos not all stored', stored, sent: readable }, 502);
  }
  return json({ id: report.id, status: row.status, flags, photos: stored });
});

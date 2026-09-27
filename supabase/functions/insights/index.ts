/**
 * `insights` — the three agents (decision 043, stage C).
 *
 * The Needs agent reads what travellers asked for and did not get; the Usage agent reads how the
 * app is used, with a signal and without one; the Product Strategist reads both and the figures,
 * and says what to do next. They read `insight_metrics()` and write about it — they never make a
 * figure. Every item they write is tagged fact, inference or hypothesis and cites the metric keys
 * it rests on; a cite that does not resolve in the figures is marked unchecked before anyone sees
 * it.
 *
 * Rules it keeps:
 * - **The model is not in the code** (the owner, 27 September: "a moving target … keep it
 *   dynamic"). `INSIGHTS_MODEL` names one; without it, the newest Opus the Models API lists.
 * - **Never on a traveller's path.** Called weekly by pg_cron and from /admin's "run now" only.
 * - **Cost is bounded**: one run at a time, at most RUNS_PER_DAY a day, three requests a run.
 * - **Totals only.** The figures carry no device id; the only text in them is what travellers
 *   typed and we could not answer, with how many times and how many phones.
 * - Callers: the owner's passphrase (the same fingerprint as `admin`), or the weekly key held in
 *   the vault (`insights_key_ok`, migration 0021).
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const PASS_SHA256 = '6f9d616517e970d80597f3079f255b850e2846533e91954929fc3adaf610a991';
const ORIGINS = ['https://admin.saafarsaathi.in', 'https://admin-production-976c.up.railway.app'];
const RUNS_PER_DAY = 6;
const STALE_RUN_MS = 15 * 60_000;
const FALLBACK_MODEL = 'claude-opus-5';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':
      origin !== null && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-insights-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- What each agent writes -------------------------------------------------------------------

const ITEM = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'text', 'cites'],
  properties: {
    kind: { type: 'string', enum: ['fact', 'inference', 'hypothesis'] },
    text: { type: 'string' },
    cites: { type: 'array', items: { type: 'string' } },
  },
};

const READER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'items'],
  properties: {
    headline: { type: 'string' },
    items: { type: 'array', items: ITEM },
  },
};

const STRATEGY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'signal', 'items', 'recommendations', 'dataGaps'],
  properties: {
    headline: { type: 'string' },
    signal: { type: 'string' },
    items: { type: 'array', items: ITEM },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['action', 'why', 'measure', 'cites'],
        properties: {
          action: { type: 'string' },
          why: { type: 'string' },
          measure: { type: 'string' },
          cites: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    dataGaps: { type: 'array', items: { type: 'string' } },
  },
};

const PRODUCT = `Dubai Saathi is an offline information desk for Indian travellers in Dubai, a PWA.
Three pillars work with the network off: खाना (food: dish first, kitchens a collector confirmed),
जाना (getting there: metro, bus, tram, abra, taxi with time and fare) and जानना (attractions and
travel topics). बोलना is the one online feature: speak in an Indian language, read it back in
English and Arabic. The traveller's hotel and documents live on the phone. A pass costs ₹199–₹499
for 14 days; a traveller who paid once is never gated. It is pre-launch: the numbers are the
owner's own testing and a few early phones, so small samples are normal.

Standing rules you must respect in anything you recommend: offline-first; no LLM in the traveller's
core path; input is Hindi and Hinglish only; no login; never name a competitor (say "a delivery
app", "a map app"); the product is not booking, delivery, a marketplace, an itinerary planner, a
content portal or a chatbot.`;

const DISCIPLINE = `How you write:
- You receive a JSON document of figures. Every number you state must appear in it. Never compute
  a new rate, never extrapolate a total, never invent a figure.
- Tag every item: "fact" when it restates figures, "inference" when it reads meaning into them,
  "hypothesis" when it proposes a cause the figures cannot show.
- "cites" lists the dot paths of the figures an item rests on, exactly as they appear in the
  document, e.g. "week.answerRate.rate", "month.tasksByKind.transport_route.failed",
  "week.unmetAsks.0.text". A fact with no cite is not a fact.
- Rates carry a 95% Wilson range (low, high) and the counts k of n. When n is small or the range
  is wide, say so and do not lean on the rate. "Satisfied" is inferred from what a traveller
  reached, never asked; say "appears answered", not "was happy".
- A verdict of "insufficient" means exactly that. Do not argue around it.
- Plain English, short sentences, for the owner reading on a phone. At most eight items.`;

const NEEDS = `${PRODUCT}

You are the Needs agent. Read what travellers asked for and did not get: unmetAsks (the words
typed, how often, how many phones, which pillar), the unmet rate, and the tasks that failed or were
left, by kind. Say which needs are unmet, which look like missing content (a place, a dish, a
kitchen) and which look like the matcher not understanding the words. Group asks that are one
need. Do not recommend features; that is the Strategist's job.

${DISCIPLINE}`;

const USAGE = `${PRODUCT}

You are the Usage agent. Read how the app is used: sessions, sessions that tried something and
that got an answer, active time with a signal, without one and unknown, the pillars, tasks by kind
and outcome, answer rates with and without a signal, repeat phones, signal transitions, and why
travellers had no signal (offlineAnswers). Say whether offline use is real and whether answers hold
up offline, and what the 28-day window shows that the 7-day one does not (and "trend" if present).

${DISCIPLINE}`;

const STRATEGIST = `${PRODUCT}

You are the Product Strategist. You receive the figures and the Needs and Usage agents' reports.
Read the Product Signal and the Offline Value verdict and say in one sentence ("signal") what they
mean this week. Then give at most three recommendations, the most valuable first: each an action
the owner can take this week, why (citing figures), and the measure in these figures that would
show whether it worked. Prefer content and wording fixes the data points at over new features.
List in "dataGaps" what the figures cannot answer yet that would change your advice. Where the
agents' reports and the figures disagree, the figures win.

${DISCIPLINE}`;

// ---- Checking what the agents wrote -----------------------------------------------------------

interface Item {
  kind: string;
  text: string;
  cites: string[];
  checked?: boolean;
}

function resolves(doc: unknown, path: string): boolean {
  let node: unknown = doc;
  for (const part of path.split('.')) {
    if (node === null || typeof node !== 'object') return false;
    const record = node as Record<string, unknown>;
    if (!(part in record)) return false;
    node = record[part];
  }
  return true;
}

/** Marks every item whose cites do not all resolve in the figures, or that has none. */
function check<T extends { cites: string[] }>(
  doc: unknown,
  items: T[],
): (T & { checked: boolean })[] {
  return items.map((item) => ({
    ...item,
    checked: item.cites.length > 0 && item.cites.every((cite) => resolves(doc, cite)),
  }));
}

// ---- The model --------------------------------------------------------------------------------

async function pickModel(client: Anthropic): Promise<string> {
  const named = Deno.env.get('INSIGHTS_MODEL');
  if (named) return named;
  try {
    let newest: { id: string; created_at: string } | null = null;
    for await (const model of client.models.list()) {
      if (!model.id.startsWith('claude-opus-')) continue;
      if (newest === null || model.created_at > newest.created_at) newest = model;
    }
    return newest?.id ?? FALLBACK_MODEL;
  } catch {
    return FALLBACK_MODEL;
  }
}

interface Spent {
  input: number;
  output: number;
}

async function ask(
  client: Anthropic,
  model: string,
  system: string,
  content: string,
  schema: Record<string, unknown>,
  effort: 'medium' | 'high',
  spent: Spent,
): Promise<Record<string, unknown>> {
  const request = {
    model,
    max_tokens: 16000,
    system,
    output_config: { effort, format: { type: 'json_schema' as const, schema } },
    messages: [{ role: 'user' as const, content }],
  };
  let message: Anthropic.Beta.BetaMessage;
  try {
    // A declined request is re-run on Anthropic's recommended fallback rather than lost.
    message = await client.beta.messages
      .stream({ ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      .finalMessage();
  } catch (error) {
    // A model the fallback beta does not cover answers 400; the run goes on without it.
    if (!(error instanceof Anthropic.BadRequestError)) throw error;
    message = await client.beta.messages.stream(request).finalMessage();
  }
  spent.input += message.usage.input_tokens;
  spent.output += message.usage.output_tokens;
  if (message.stop_reason === 'refusal') throw new Error('the model declined this request');
  if (message.stop_reason === 'max_tokens') throw new Error('the report ran past its length');
  const text = message.content.find((block) => block.type === 'text');
  if (text === undefined || text.type !== 'text') throw new Error('the model wrote no report');
  return JSON.parse(text.text) as Record<string, unknown>;
}

async function run(db: SupabaseClient, id: string): Promise<void> {
  const finish = (fields: Record<string, unknown>) =>
    db
      .from('insight_reports')
      .update({ ...fields, finished_at: new Date().toISOString() })
      .eq('id', id);
  try {
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set on the Supabase project');
    const client = new Anthropic({ apiKey: key });

    const [week, month, snapshots] = await Promise.all([
      db.rpc('insight_metrics', { p_days: 7 }),
      db.rpc('insight_metrics', { p_days: 28 }),
      db
        .from('metric_snapshots')
        .select('taken_at, metrics')
        .order('taken_at', { ascending: false })
        .limit(8),
    ]);
    if (week.error || month.error) throw new Error((week.error ?? month.error)?.message);
    // The trend is a handful of headline figures per night, oldest first, not the whole snapshot.
    const trend = (snapshots.data ?? []).reverse().map((row) => {
      const m = row.metrics as Record<string, unknown>;
      return {
        takenAt: row.taken_at,
        sessions: m.sessions,
        devices: m.devices,
        answerRate: m.answerRate,
        offlinePrevalence: m.offlinePrevalence,
        productSignal: m.productSignal,
      };
    });
    const doc = { week: week.data, month: month.data, trend };
    const figures = JSON.stringify(doc);

    const model = await pickModel(client);
    await db.from('insight_reports').update({ model, metrics: doc }).eq('id', id);

    const spent: Spent = { input: 0, output: 0 };
    const [needs, usage] = await Promise.all([
      ask(client, model, NEEDS, `The figures:\n${figures}`, READER_SCHEMA, 'medium', spent),
      ask(client, model, USAGE, `The figures:\n${figures}`, READER_SCHEMA, 'medium', spent),
    ]);
    const strategy = await ask(
      client,
      model,
      STRATEGIST,
      `The figures:\n${figures}\n\nThe Needs agent:\n${JSON.stringify(needs)}\n\nThe Usage agent:\n${JSON.stringify(usage)}`,
      STRATEGY_SCHEMA,
      'high',
      spent,
    );

    const checked = (report: Record<string, unknown>) => ({
      ...report,
      items: check(doc, (report.items as Item[] | undefined) ?? []),
    });
    const strategyChecked = {
      ...checked(strategy),
      recommendations: check(
        doc,
        (strategy.recommendations as { cites: string[] }[] | undefined) ?? [],
      ),
    };
    await finish({
      status: 'done',
      needs: checked(needs),
      usage: checked(usage),
      strategy: strategyChecked,
      tokens: spent,
    });
  } catch (error) {
    await finish({
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  const headers = cors(request.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { pass?: unknown; trigger?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'not JSON' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const pass = typeof body.pass === 'string' ? body.pass.trim().toLowerCase() : '';
  const key = request.headers.get('x-insights-key') ?? '';
  let allowed = pass !== '' && same(await sha256(pass), PASS_SHA256);
  if (!allowed && key !== '') {
    const { data } = await db.rpc('insights_key_ok', { p_key: key });
    allowed = data === true;
  }
  if (!allowed) return json({ error: 'not allowed' }, 401);
  const trigger = body.trigger === 'weekly' && key !== '' ? 'weekly' : 'manual';

  // One run at a time: a second press while the first is working gets the first.
  const recent = await db
    .from('insight_reports')
    .select('id, status, created_at')
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
    .order('created_at', { ascending: false });
  if (recent.error) return json({ error: recent.error.message }, 500);
  const running = (recent.data ?? []).find(
    (row) => row.status === 'running' && Date.now() - Date.parse(row.created_at) < STALE_RUN_MS,
  );
  if (running) return json({ id: running.id, status: 'running' });
  if (trigger === 'manual' && (recent.data ?? []).length >= RUNS_PER_DAY) {
    return json({ error: `at most ${RUNS_PER_DAY} runs a day` }, 429);
  }

  const created = await db.from('insight_reports').insert({ trigger }).select('id').single();
  if (created.error) return json({ error: created.error.message }, 500);
  // The three requests take a minute or two; the page polls rather than waiting on this answer.
  EdgeRuntime.waitUntil(run(db, created.data.id));
  return json({ id: created.data.id, status: 'running' }, 202);
});

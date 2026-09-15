/**
 * Turns collected visits into the pack खाना reads.
 *
 * This is the step that was missing. Reports reached Postgres and stopped there: a collector
 * could spend a day in Meena Bazaar and no traveller would ever see one outlet of it, because
 * nothing carried an approved `field_report` across to `data/restaurants/`. A capture path that
 * ends in a table is a doorway into a house with no rooms.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run publish:outlets --workspace @saathi/content-tools
 *   npm run publish:outlets --workspace @saathi/content-tools -- --rows rows.json
 *
 * The key is read from the environment and never written to the repo, and it has to be the
 * service role: `field_reports` has RLS on with no policies by design, so the anon key sees
 * nothing at all — an empty pack rather than an error, which is the failure worth being loud
 * about. Hence the refusal below when the table comes back empty.
 *
 * Only `approved` rows are taken. A clean report is approved by the `outlet` function on
 * arrival, and a flagged one waits for a person — the owner's rule: machine checks yes, human
 * approval queue no.
 *
 * `--rows <file>` publishes from a file of the same rows instead of the network. It exists so the
 * pack can be rebuilt, and the mapping exercised, by someone who does not hold the service role
 * key — and so the committed pack is always the output of this tool rather than of a one-off
 * script nobody can run again.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRestaurant, type ReportRow } from './toRestaurant.ts';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', '..', '..', 'data', 'restaurants', 'restaurants.v1.json');

const COLUMNS = [
  'id',
  'name',
  'name_hi',
  'kind',
  'lat',
  'lng',
  'kitchen',
  'dietary',
  'confirmed_dishes',
  'hours',
  'hours_confirmed_at',
  'delivers',
  'delivery_phone',
  'price_for_one_aed',
  'spoke_to',
  'status',
].join(',');

/** Rows from Supabase, or from a file when the key is somebody else's to hold. */
async function readRows(): Promise<readonly ReportRow[]> {
  const flag = process.argv.indexOf('--rows');
  if (flag !== -1) {
    const file = process.argv[flag + 1];
    if (file === undefined) throw new Error('--rows needs a file path');
    return JSON.parse(await readFile(resolve(process.cwd(), file), 'utf8')) as readonly ReportRow[];
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || key === undefined) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. The key never lives in the repo.',
    );
  }

  const endpoint = `${url}/rest/v1/field_reports?select=${COLUMNS}&status=eq.approved&kind=eq.restaurant`;
  const answer = await fetch(endpoint, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!answer.ok) throw new Error(`Supabase said ${String(answer.status)}: ${await answer.text()}`);
  return (await answer.json()) as readonly ReportRow[];
}

async function main(): Promise<void> {
  // Approved only, whichever way the rows arrived — a file must not become a way past the checks.
  const rows = (await readRows()).filter(
    (row) => row.status === 'approved' && (row.kind ?? 'restaurant') === 'restaurant',
  );

  const outlets = [];
  const dropped: string[] = [];
  for (const row of rows) {
    const outlet = toRestaurant(row);
    if (outlet === null) dropped.push(`${row.id} (${row.name}) — no kitchen kind, or no name`);
    else outlets.push(outlet);
  }

  if (outlets.length === 0) {
    // Writing an empty pack would replace working fixture content with nothing and look like a
    // successful run. A publisher that can quietly empty the app is worse than one that stops.
    throw new Error(
      `No approved restaurant reports became outlets (${String(rows.length)} rows read). ` +
        'Nothing written — the existing pack is left alone.',
    );
  }

  const pack = {
    contentVersion: 1,
    status: 'collected',
    publishedAt: new Date().toISOString(),
    source: 'field_reports where status = approved',
    restaurants: outlets,
  };
  await writeFile(OUT, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');

  console.log(`${String(outlets.length)} outlets → ${OUT}`);
  for (const line of dropped) console.log(`  dropped: ${line}`);
}

await main();

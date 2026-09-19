/**
 * Publishing content to phones, without a release (decision 030).
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run publish:packs
 *   npm run publish:packs -- --only restaurants     # one pack
 *   npm run publish:packs -- --dry                  # say what would go, send nothing
 *
 * The files under `data/` stay the source of truth and stay in git — this reads them, checks
 * them, and writes one row per pack into `content_packs`, which is what phones poll. Nothing is
 * built, nothing is deployed, and no service worker is involved: a kitchen collected in Meena
 * Bazaar at four o'clock is on a traveller's phone at its next launch.
 *
 * The version is the pack's own `contentVersion` where it has one, and otherwise the count of
 * publishes so far plus one. It only ever goes up: a phone holding 7 ignores a 6, so a pack
 * republished by mistake cannot walk a traveller's data backwards.
 *
 * The service role key is required and never written to the repo: `content_packs` has RLS on
 * with no policies, so the publishable key sees nothing at all.
 */
import { createHash } from 'node:crypto';
import { packDigestInput } from '@saathi/shared';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = resolve(here, '..', '..', '..', 'data');

/** The packs that may be published, and the file each one is read from. */
const PACKS = {
  restaurants: resolve(data, 'restaurants', 'restaurants.v1.json'),
  attractions: resolve(data, 'places', 'attractions.v1.json'),
  transport: resolve(data, 'transport', 'network.v1.json'),
} as const;

type PackId = keyof typeof PACKS;

interface Existing {
  readonly id: string;
  readonly version: number;
}

function argOf(flag: string): string | undefined {
  const at = process.argv.indexOf(flag);
  return at < 0 ? undefined : process.argv[at + 1];
}

/**
 * A pack that will not parse, or that is empty, is not published. An empty `restaurants.v1.json`
 * is the normal state before the first collection day and must not replace a phone's copy with
 * nothing — the rule the whole product turns on is that a claim ships with its data (decision
 * 025), and publishing emptiness over a phone's outlets is that rule broken from our side.
 */
function check(id: PackId, body: unknown): asserts body is Record<string, unknown> {
  if (typeof body !== 'object' || body === null) throw new Error(`${id}: not an object`);
  const rows = (body as Record<string, unknown>)[id === 'transport' ? 'nodes' : 'items'];
  if (id !== 'transport' && !Array.isArray(rows)) {
    throw new Error(`${id}: no items array — is this the right file?`);
  }
  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error(`${id}: empty. Nothing is published over a phone's copy with nothing.`);
  }
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dry = process.argv.includes('--dry');
  const only = argOf('--only') as PackId | undefined;

  if (!dry && (!url || !key)) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry)');
  }
  if (only !== undefined && !(only in PACKS)) {
    throw new Error(`--only must be one of ${Object.keys(PACKS).join(', ')}`);
  }

  const current = new Map<string, number>();
  if (!dry) {
    const response = await fetch(`${String(url)}/rest/v1/content_packs?select=id,version`, {
      headers: { apikey: String(key), authorization: `Bearer ${String(key)}` },
    });
    if (!response.ok) throw new Error(`reading current versions: ${String(response.status)}`);
    for (const row of (await response.json()) as Existing[]) current.set(row.id, row.version);
  }

  for (const id of Object.keys(PACKS) as PackId[]) {
    if (only !== undefined && id !== only) continue;
    const raw = await readFile(PACKS[id], 'utf8');
    const body: unknown = JSON.parse(raw);
    check(id, body);

    const own = (body as { contentVersion?: unknown }).contentVersion;
    const version = typeof own === 'number' && own > 0 ? own : (current.get(id) ?? 0) + 1;
    const bytes = Buffer.byteLength(raw, 'utf8');
    /**
     * Over the body as the phone will hash it, never over the file as it sits on disk. The two
     * differ by indentation alone, which is enough for every pack to arrive looking damaged.
     */
    const sha = createHash('sha256').update(packDigestInput(body)).digest('hex');

    if (version < (current.get(id) ?? 0)) {
      throw new Error(`${id}: version ${String(version)} is older than what is published`);
    }

    const size = `${(bytes / 1024).toFixed(1)} kB`;
    if (dry) {
      console.log(`${id}: would publish version ${String(version)} · ${size}`);
      continue;
    }

    const written = await fetch(`${String(url)}/rest/v1/content_packs?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: String(key),
        authorization: `Bearer ${String(key)}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id,
        version,
        published_at: new Date().toISOString(),
        bytes,
        sha,
        body,
      }),
    });
    if (!written.ok) {
      throw new Error(`${id}: ${String(written.status)} ${await written.text()}`);
    }
    console.log(`${id}: published version ${String(version)} · ${size} · ${sha.slice(0, 12)}`);
  }
}

await main();

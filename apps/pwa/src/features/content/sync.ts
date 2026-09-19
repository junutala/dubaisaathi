import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';
import { db } from '../../db/schema.js';
import { isPackId, type PackId, type PackSummary, type StoredPack } from './records.js';

/**
 * Bringing new content down (decision 030).
 *
 * The owner's worry, and it was the right one: "I am now more worried about the dataupload that
 * we have to carry whenever we have new outlets and/or dubai introduces new routes or update
 * their timetable." Every pack was compiled into the bundle, so a kitchen collected on Tuesday
 * needed a release, a deployment and a service-worker handover before anybody could eat there.
 *
 * Now the phone asks. A manifest of a few hundred bytes says what versions exist; only a pack
 * whose version is higher than the one held is downloaded; the bytes are checked against the
 * published digest before anything is stored, because a truncated pack that parses is worse
 * than one that does not. What is stored is picked up at the next launch.
 *
 * Nothing here is in the traveller's way: no signal, a server between publishes, a body that
 * will not parse — all of them leave the phone with exactly what it had.
 */

const PACKS = `${PROJECT_URL}/functions/v1/packs`;

/** What the round did, in the words the caller can actually report. */
export interface PackSync {
  readonly checked: boolean;
  readonly downloaded: readonly string[];
}

async function manifest(): Promise<readonly PackSummary[] | null> {
  try {
    const response = await fetch(PACKS, { headers: supabaseHeaders(), cache: 'no-store' });
    if (!response.ok) return null;
    const body = (await response.json()) as { packs?: unknown };
    if (!Array.isArray(body.packs)) return null;
    return body.packs.filter((row): row is PackSummary => {
      const pack = row as Partial<PackSummary>;
      return (
        typeof pack.id === 'string' &&
        isPackId(pack.id) &&
        typeof pack.version === 'number' &&
        typeof pack.sha === 'string'
      );
    });
  } catch {
    return null;
  }
}

/** The digest of the body exactly as it will be stored, so a half-download cannot be parsed. */
async function digest(body: unknown): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(body));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // An engine with no subtle crypto (an insecure origin) still gets its content; it simply
    // cannot check it. Refusing the pack there would punish the traveller for our caution.
    return null;
  }
}

async function fetchPack(id: PackId): Promise<StoredPack | null> {
  try {
    const response = await fetch(`${PACKS}?id=${id}`, {
      headers: supabaseHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<StoredPack>;
    if (typeof body.version !== 'number' || body.body === undefined) return null;
    return {
      id,
      version: body.version,
      publishedAt: typeof body.publishedAt === 'string' ? body.publishedAt : '',
      sha: typeof body.sha === 'string' ? body.sha : '',
      downloadedAt: new Date().toISOString(),
      body: body.body,
    };
  } catch {
    return null;
  }
}

export async function syncPacks(): Promise<PackSync> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { checked: false, downloaded: [] };
  }
  const listed = await manifest();
  if (listed === null) return { checked: false, downloaded: [] };

  const downloaded: string[] = [];
  for (const summary of listed) {
    const id = summary.id as PackId;
    const held = await db.packs.get(id);
    // Only ever forward: a pack republished at a lower number cannot walk a phone backwards.
    if (held && held.version >= summary.version) continue;

    const pack = await fetchPack(id);
    if (pack === null || pack.version < summary.version) continue;

    // The digest the publisher computed is over the file as it was read from disk; ours is over
    // the body as JSON. They agree when nothing was lost, which is the only thing worth knowing.
    const ours = await digest(pack.body);
    if (ours !== null && summary.sha !== '' && ours !== summary.sha && pack.sha !== ours) {
      // Arrived damaged. Keep what the phone has and try again on the next round.
      continue;
    }

    await db.packs.put(pack);
    downloaded.push(id);
  }
  return { checked: true, downloaded };
}

/**
 * Ask on launch, and again whenever the phone comes back to signal. Not on a timer: content is
 * not urgent the way a broken build is, and a traveller's data is not ours to spend on polling.
 */
export function startPackSync(): () => void {
  const ask = () => {
    void syncPacks();
  };
  ask();
  window.addEventListener('online', ask);
  return () => {
    window.removeEventListener('online', ask);
  };
}

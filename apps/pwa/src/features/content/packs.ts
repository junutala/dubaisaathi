import { db } from '../../db/schema.js';
import { isPackId, type PackId, type StoredPack } from './records.js';

/**
 * The packs, in memory, for the features that read them synchronously (decision 030).
 *
 * Filled once at boot, before anything paints, from what the phone has stored. A pack that has
 * never been downloaded is simply absent and the feature falls back to the copy compiled into
 * the bundle — which is what makes a first launch work with the radio off, and what makes this
 * change safe: the bundled copy is still there, it is just no longer the only one.
 *
 * Nothing here reaches the network. A newer pack arrives in `sync.ts`, is written to IndexedDB,
 * and is picked up at the next launch — the same rule builds follow, and for the same reason:
 * a traveller halfway through reading a menu must not have the menu change under them.
 */

const held = new Map<PackId, StoredPack>();
let loaded = false;

export async function loadPacks(): Promise<void> {
  try {
    const rows = await db.packs.toArray();
    for (const row of rows) if (isPackId(row.id)) held.set(row.id, row);
  } catch {
    // A database that will not open is a fresh install or a private window: the bundled copies
    // answer for everything, which is exactly what they are for.
  }
  loaded = true;
}

/** The body as it was published, or undefined where the phone has never downloaded this pack. */
export function packBody(id: PackId): unknown {
  return held.get(id)?.body;
}

/** What this phone is actually reading, for the sync to compare and for us to be able to ask. */
export function packVersions(): Record<string, number> {
  const versions: Record<string, number> = {};
  for (const [id, pack] of held) versions[id] = pack.version;
  return versions;
}

export function packsAreLoaded(): boolean {
  return loaded;
}

/** For tests: the registry is module state, and a test that leaves it filled poisons the next. */
export function forgetPacks(): void {
  held.clear();
  loaded = false;
}

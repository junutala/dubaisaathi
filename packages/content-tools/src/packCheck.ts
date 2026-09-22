import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * What a pack must look like before it is published to phones (decision 030).
 *
 * It lives apart from the publisher so a test can run it over the real files in `data/`. It did
 * not, once: the fare pack changed from distance bands to zones and this check went on looking
 * for `transitBandsAed`, so `publish:packs` refused the very pack it was meant to wave through.
 * Nothing in the gate noticed, because nothing ran it. A check nobody runs is not a check.
 */

const here = dirname(fileURLToPath(import.meta.url));
const data = resolve(here, '..', '..', '..', 'data');

/** The packs that may be published, and the file each one is read from. */
export const PACK_FILES = {
  restaurants: resolve(data, 'restaurants', 'restaurants.v1.json'),
  attractions: resolve(data, 'places', 'attractions.v1.json'),
  transport: resolve(data, 'transport', 'network.v1.json'),
  fares: resolve(data, 'transport', 'fares.v1.json'),
} as const;

export type PackId = keyof typeof PACK_FILES;

/**
 * Where each pack keeps its rows. Every file names them after itself, and this said `items` for
 * two of them — so `publish:packs` could never have published an outlet or an attraction. It
 * would have failed on the first collection day in Meena Bazaar, which is the day decision 030
 * exists for. Nothing ran the check, so nothing said so.
 */
const ROWS_IN: Readonly<Record<PackId, string | null>> = {
  restaurants: 'restaurants',
  attractions: 'attractions',
  transport: 'nodes',
  // A tariff is a handful of numbers, not a list; it is checked by its own shape below.
  fares: null,
};

/** Which field carries a pack's version. They move independently and must not drag each other. */
export function versionField(id: PackId): 'fareVersion' | 'contentVersion' {
  return id === 'fares' ? 'fareVersion' : 'contentVersion';
}

/**
 * A pack that will not parse, or that is empty, is not published. An empty `restaurants.v1.json`
 * is the normal state before the first collection day and must not replace a phone's copy with
 * nothing — the rule the whole product turns on is that a claim ships with its data (decision
 * 025), and publishing emptiness over a phone's outlets is that rule broken from our side.
 */
export function checkPack(id: PackId, body: unknown): asserts body is Record<string, unknown> {
  if (typeof body !== 'object' || body === null) throw new Error(`${id}: not an object`);

  if (id === 'fares') {
    const pack = body as { nol?: Record<string, unknown>; taxi?: { minimumAed?: unknown } };
    const silver = pack.nol?.silver as { oneZone?: unknown } | undefined;
    if (typeof silver?.oneZone !== 'number') {
      throw new Error('fares: no Nol zone tariff — is this the right file?');
    }
    if (typeof pack.taxi?.minimumAed !== 'number') throw new Error('fares: no taxi tariff');
    return;
  }

  const field = ROWS_IN[id];
  const rows = field === null ? undefined : (body as Record<string, unknown>)[field];
  if (!Array.isArray(rows)) {
    throw new Error(`${id}: no "${String(field)}" array — is this the right file?`);
  }
  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error(`${id}: empty. Nothing is published over a phone's copy with nothing.`);
  }
}

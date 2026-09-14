import { PHRASE_SITUATIONS, type ContentVersion, type Phrase } from '@saathi/shared';
import { db } from './schema.js';
import { TRANSPORT_PACK_ID, type TransportNetwork } from '../features/transport/network.js';

/**
 * Content is data, not code (CLAUDE.md working conventions): the pack ships as JSON under
 * `data/`, is loaded into IndexedDB once, and is versioned so an update replaces it wholesale
 * rather than merging by hand.
 */
interface PhrasePack {
  readonly contentVersion: number;
  readonly publishedAt: string;
  readonly phrases: readonly Phrase[];
}

/**
 * The pack ships as JSON, so its types are not checked at build time. This narrows it once,
 * at the boundary, and throws on a malformed pack rather than leaving a screen blank.
 */
export function parsePhrasePack(raw: unknown): PhrasePack {
  const pack = raw as PhrasePack;
  const bad = pack.phrases.find(
    (p) => !(PHRASE_SITUATIONS as readonly string[]).includes(p.situation),
  );
  if (bad) throw new Error(`phrase ${bad.id} has an unknown situation: ${bad.situation}`);
  return pack;
}

export const PHRASE_PACK_ID = 'phrases';

/** Idempotent: loading the same version twice is a no-op, so it is safe on every boot. */
export async function loadPhrasePack(pack: PhrasePack): Promise<'loaded' | 'already-current'> {
  const current = await db.contentVersions.get(PHRASE_PACK_ID);
  if (current && current.version >= pack.contentVersion) return 'already-current';

  await db.transaction('rw', db.phrases, db.contentVersions, async () => {
    await db.phrases.clear();
    await db.phrases.bulkAdd(pack.phrases);
    const version: ContentVersion = {
      id: PHRASE_PACK_ID,
      version: pack.contentVersion,
      publishedAt: pack.publishedAt,
      downloadedAt: new Date().toISOString(),
    };
    await db.contentVersions.put(version);
  });
  return 'loaded';
}

export async function phrasesFor(situation: Phrase['situation']): Promise<Phrase[]> {
  return db.phrases.where('situation').equals(situation).toArray();
}

export async function phraseById(id: string): Promise<Phrase | undefined> {
  return db.phrases.get(id);
}

/**
 * The transport pack, loaded the same way and for the same reason: the metro, the bus routes
 * and the fares are content, so a corrected station is a data release rather than a code one.
 * Idempotent, so it is safe on every boot.
 */
export async function loadTransportPack(
  pack: TransportNetwork,
): Promise<'loaded' | 'already-current'> {
  const current = await db.contentVersions.get(TRANSPORT_PACK_ID);
  if (current && current.version >= pack.contentVersion) return 'already-current';

  const { nodes, edges, ...meta } = pack;
  await db.transaction(
    'rw',
    db.transportNodes,
    db.transportEdges,
    db.transportMeta,
    db.contentVersions,
    async () => {
      await db.transportNodes.clear();
      await db.transportEdges.clear();
      await db.transportMeta.clear();
      await db.transportNodes.bulkAdd([...nodes]);
      await db.transportEdges.bulkAdd([...edges]);
      await db.transportMeta.put({ ...meta, id: TRANSPORT_PACK_ID });
      const version: ContentVersion = {
        id: TRANSPORT_PACK_ID,
        version: pack.contentVersion,
        publishedAt: pack.publishedAt,
        downloadedAt: new Date().toISOString(),
      };
      await db.contentVersions.put(version);
    },
  );
  return 'loaded';
}

/**
 * The whole graph, off the device. `null` until the pack has been loaded — the planner says so
 * rather than returning a journey with no stations in it.
 */
export async function transportNetwork(): Promise<TransportNetwork | null> {
  const meta = await db.transportMeta.get(TRANSPORT_PACK_ID);
  if (!meta) return null;
  const [nodes, edges] = await Promise.all([
    db.transportNodes.toArray(),
    db.transportEdges.toArray(),
  ]);
  return {
    contentVersion: meta.contentVersion,
    publishedAt: meta.publishedAt,
    source: meta.source,
    walkingMetresPerMinute: meta.walkingMetresPerMinute,
    fares: meta.fares,
    waitSeconds: meta.waitSeconds,
    lines: meta.lines,
    nodes,
    edges,
  };
}

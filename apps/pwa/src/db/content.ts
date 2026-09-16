import type { ContentVersion } from '@saathi/shared';
import { db } from './schema.js';
import { TRANSPORT_PACK_ID, type TransportNetwork } from '../features/transport/network.js';

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
    attribution: meta.attribution,
    walkingMetresPerMinute: meta.walkingMetresPerMinute,
    fares: meta.fares,
    waitSeconds: meta.waitSeconds,
    lines: meta.lines,
    nodes,
    edges,
  };
}

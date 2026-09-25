import { TRANSPORT_MODES, type TransportNetwork, type TransportNode } from '@saathi/shared';
import abras from '../../../../../data/transport/abras.v1.json';

/**
 * The transport network, as it ships: `data/transport/network.v1.json`, written from the RTA's
 * GTFS feed by `packages/content-tools/src/publishTransport.ts`. The types live in the shared
 * package so the writer and the reader cannot drift; this file is the reader's boundary.
 */

export type { TransportNetwork, TransportLine, TransportNode, TransportEdge } from '@saathi/shared';

/**
 * Everything in the pack that is not a station or a link: one row, so the fares a journey was
 * priced with travel with the stations they were priced for rather than living in the bundle
 * while the rows live on the device.
 */
export interface TransportMeta extends Omit<TransportNetwork, 'nodes' | 'edges'> {
  readonly id: string;
}

export const TRANSPORT_PACK_ID = 'transport';

/**
 * The pack ships as JSON, so its types are not checked at build time. This narrows it once, at
 * the boundary, and throws on a malformed pack — an edge pointing at a station that is not in
 * the file would otherwise surface as a journey that silently cannot be planned, which is the
 * kind of defect that only shows up on a phone in Dubai.
 */
export function parseTransportPack(raw: unknown): TransportNetwork {
  const pack = raw as TransportNetwork;
  const nodeIds = new Set(pack.nodes.map((node: TransportNode) => node.id));
  const lineIds = new Set(pack.lines.map((line) => line.id));

  for (const edge of pack.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      throw new Error(`transport pack: edge ${edge.id} points at a station that is not in it`);
    }
    if (!(TRANSPORT_MODES as readonly string[]).includes(edge.mode)) {
      throw new Error(`transport pack: edge ${edge.id} has an unknown mode: ${edge.mode}`);
    }
    if (edge.line !== undefined && !lineIds.has(edge.line)) {
      throw new Error(`transport pack: edge ${edge.id} runs on an unknown line: ${edge.line}`);
    }
    if (edge.durationSeconds <= 0) {
      throw new Error(`transport pack: edge ${edge.id} takes no time at all`);
    }
  }
  return pack;
}

/** Metres between two points on the globe. Straight-line: the screen says "अनुमानित". */
export function metresBetween(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number {
  const earthRadiusM = 6_371_008.8;
  const toRad = Math.PI / 180;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const dLat = lat2 - lat1;
  const dLng = (b.lng - a.lng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

/**
 * The network with the Creek's abras in it (decision 036). They are not in the RTA pack — its
 * feed has only two of the four crossings — so they ride beside it, in the network's own shape,
 * from `data/transport/abras.v1.json`, and join whatever pack the phone holds, shipped or
 * downloaded. Adding them twice is a no-op.
 */
export function withAbras(network: TransportNetwork): TransportNetwork {
  const extra = parseTransportPack({
    ...network,
    ...abras,
    lines: abras.lines,
    nodes: abras.nodes,
    edges: abras.edges,
  });
  if (network.nodes.some((node) => node.id === extra.nodes[0]?.id)) return network;
  return {
    ...network,
    nodes: [...network.nodes, ...extra.nodes],
    lines: [...network.lines, ...extra.lines],
    edges: [...network.edges, ...extra.edges],
  };
}

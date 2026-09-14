import {
  TRANSPORT_MODES,
  type LocalisedName,
  type TransportEdge,
  type TransportMode,
  type TransportNode,
} from '@saathi/shared';

/**
 * The transport network, as it ships: `data/transport/network.v1.json`.
 *
 * Content, not code (CLAUDE.md working conventions). The metro lines, the bus routes, the
 * fares and the walking speed are all rows in a pack that is versioned and loaded into
 * IndexedDB — so correcting a station or adding a route is a data change, not a release of
 * new logic. Nothing here is fetched at runtime: a traveller with the radio off plans the
 * same journey as one on hotel wifi (rule 1).
 */

/** A line or a numbered bus route, named in both interface languages. */
export interface TransportLine {
  readonly id: string;
  readonly mode: TransportMode;
  readonly name: LocalisedName;
}

/** Nol charges the whole journey by the distance it covers; this is that table. */
export interface FareBand {
  readonly maxKm: number;
  readonly aed: number;
}

export interface TaxiFare {
  readonly flagFallAed: number;
  readonly perKmAed: number;
  readonly minimumAed: number;
  /** A meter is not a timetable: the fare is shown as a range this wide either side. */
  readonly spreadPercent: number;
}

export interface TransportNetwork {
  readonly contentVersion: number;
  readonly publishedAt: string;
  /** Where the rows came from, so the next reader does not have to guess. */
  readonly source: string;
  readonly walkingMetresPerMinute: number;
  readonly fares: {
    readonly transitBandsAed: readonly FareBand[];
    readonly taxi: TaxiFare;
  };
  /** What a traveller spends on the platform before the doors open, by mode. */
  readonly waitSeconds: Readonly<Record<'metro' | 'bus', number>>;
  readonly lines: readonly TransportLine[];
  readonly nodes: readonly TransportNode[];
  readonly edges: readonly TransportEdge[];
}

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
  const nodeIds = new Set(pack.nodes.map((node) => node.id));
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

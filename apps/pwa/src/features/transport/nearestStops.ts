import type { LatLng, TransportNode } from '@saathi/shared';
import { distanceKm } from '../../lib/distance.js';

/**
 * The metro station and the bus stop nearest a point — the hotel's pin, on घर.1 (decision 032).
 * Read off the RTA network already on the phone, so it needs no signal and nobody types it.
 */
export interface NearStop {
  readonly node: TransportNode;
  readonly km: number;
}

export interface NearStops {
  readonly metro?: NearStop;
  readonly bus?: NearStop;
}

export function nearestStops(nodes: readonly TransportNode[], at: LatLng): NearStops {
  let metro: NearStop | undefined;
  let bus: NearStop | undefined;
  for (const node of nodes) {
    const km = distanceKm(at, node.location);
    if (node.modes.includes('metro') && (metro === undefined || km < metro.km))
      metro = { node, km };
    if (node.modes.includes('bus') && (bus === undefined || km < bus.km)) bus = { node, km };
  }
  return { ...(metro !== undefined && { metro }), ...(bus !== undefined && { bus }) };
}

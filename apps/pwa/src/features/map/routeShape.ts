import type { LatLng, TransportMode } from '@saathi/shared';

/**
 * A planned journey as lines on नक्शा (decision 035): every leg through the stops it passes,
 * coloured by what carries the traveller, with the two ends and the changes marked.
 *
 * Pure, so it is tested without a map: the screen hands the result to MapLibre as GeoJSON.
 */

/** A leg as the planner gives it — only what drawing needs. */
export interface ShapeLeg {
  readonly mode: TransportMode;
  readonly line?: string;
  readonly path: readonly string[];
}

/** The RTA's own colours for its rail lines; buses share one, walking and taxis are dashed. */
const LINE_COLOUR: Readonly<Record<string, string>> = {
  red: '#D7263D',
  'red-branch': '#D7263D',
  green: '#1E9E5A',
  tram: '#E36F1E',
};
const MODE_COLOUR: Readonly<Record<TransportMode, string>> = {
  metro: '#D7263D',
  tram: '#E36F1E',
  bus: '#2563EB',
  walk: '#5B6474',
  taxi: '#B7791F',
};

export interface LegFeature {
  readonly type: 'Feature';
  readonly properties: { readonly colour: string; readonly dashed: boolean };
  readonly geometry: { readonly type: 'LineString'; readonly coordinates: [number, number][] };
}

export interface PointFeature {
  readonly type: 'Feature';
  readonly properties: { readonly role: 'start' | 'end' | 'change' };
  readonly geometry: { readonly type: 'Point'; readonly coordinates: [number, number] };
}

export interface RouteShape {
  readonly legs: { readonly type: 'FeatureCollection'; readonly features: LegFeature[] };
  readonly points: { readonly type: 'FeatureCollection'; readonly features: PointFeature[] };
  /** West, south, east, north — what the map fits itself to. */
  readonly bounds: [number, number, number, number];
}

function lngLat(at: LatLng): [number, number] {
  return [at.lng, at.lat];
}

/**
 * `where` answers a node id with its place — the journey's own ends included, which is why it is
 * a function rather than the network's node list. A stop it cannot place is left out of the line
 * rather than drawn at 0,0 in the Atlantic.
 */
export function routeShape(
  legs: readonly ShapeLeg[],
  start: LatLng,
  end: LatLng,
  where: (nodeId: string) => LatLng | undefined,
): RouteShape {
  const legFeatures: LegFeature[] = [];
  const changes: PointFeature[] = [];
  const all: [number, number][] = [lngLat(start), lngLat(end)];

  legs.forEach((leg, index) => {
    const coordinates = leg.path
      .map(where)
      .filter((at): at is LatLng => at !== undefined)
      .map(lngLat);
    if (coordinates.length < 2) return;
    all.push(...coordinates);
    legFeatures.push({
      type: 'Feature',
      properties: {
        colour:
          (leg.line === undefined ? undefined : LINE_COLOUR[leg.line]) ?? MODE_COLOUR[leg.mode],
        dashed: leg.mode === 'walk' || leg.mode === 'taxi',
      },
      geometry: { type: 'LineString', coordinates },
    });
    const first = coordinates[0];
    if (index > 0 && first !== undefined) {
      changes.push({
        type: 'Feature',
        properties: { role: 'change' },
        geometry: { type: 'Point', coordinates: first },
      });
    }
  });

  const lngs = all.map(([lng]) => lng);
  const lats = all.map(([, lat]) => lat);
  return {
    legs: { type: 'FeatureCollection', features: legFeatures },
    points: {
      type: 'FeatureCollection',
      features: [
        ...changes,
        {
          type: 'Feature',
          properties: { role: 'start' },
          geometry: { type: 'Point', coordinates: lngLat(start) },
        },
        {
          type: 'Feature',
          properties: { role: 'end' },
          geometry: { type: 'Point', coordinates: lngLat(end) },
        },
      ],
    },
    bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
  };
}

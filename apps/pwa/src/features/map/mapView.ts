import {
  addProtocol,
  AttributionControl,
  Map as MapLibre,
  setWorkerUrl,
  type GeoJSONSource,
  type LayerSpecification,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// The renderer's worker as a file of our own origin: the policy allows workers from 'self' only,
// never from a blob (deploy/nginx.conf), and a file is what the service worker can keep offline.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { FileSource, PMTiles, Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { ARCHIVE, mapFile, mapUrl } from './mapFiles.js';
import type { RouteShape } from './routeShape.js';

/**
 * The map itself — MapLibre drawing the OpenStreetMap archive on the phone, with the journey on
 * top (decision 035). Loaded only when नक्शा opens, so no other screen carries its weight; it is
 * still in the precache, so it opens with the radio off.
 */

/** Where the streets come from: the phone's copy, our server while it downloads, or nowhere. */
export type Basemap =
  | { readonly kind: 'phone'; readonly archive: File }
  | { readonly kind: 'server' }
  | { readonly kind: 'none' };

export interface MapView {
  showRoute(shape: RouteShape): void;
  destroy(): void;
}

const protocol = new Protocol();
let registered = false;

function register(): void {
  if (registered) return;
  registered = true;
  setWorkerUrl(workerUrl);
  addProtocol('pmtiles', protocol.tile);
  // Glyphs and sprites: the phone's kept copy first, our own server while it has not arrived.
  addProtocol('saathimap', async (params, abort) => {
    const res = await mapFile(params.url.slice('saathimap://'.length), abort.signal);
    if (!res.ok) throw new Error(`${params.url}: ${String(res.status)}`);
    if (params.type === 'json') return { data: (await res.json()) as object };
    return { data: await res.arrayBuffer() };
  });
}

const OSM = '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>';

function style(basemap: Basemap, dark: boolean): StyleSpecification {
  const flavor = dark ? 'dark' : 'light';
  if (basemap.kind === 'none') {
    return {
      version: 8,
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': dark ? '#1C2230' : '#EFEAE0' },
        },
      ],
    };
  }
  let url = `pmtiles://${mapUrl(ARCHIVE)}`;
  if (basemap.kind === 'phone') {
    protocol.add(new PMTiles(new FileSource(basemap.archive)));
    url = `pmtiles://${basemap.archive.name}`;
  }
  return {
    version: 8,
    glyphs: 'saathimap://fonts/{fontstack}/{range}.pbf',
    sprite: `saathimap://sprites/${flavor}`,
    sources: { protomaps: { type: 'vector', url, attribution: OSM } },
    // English names: what Dubai's street signs carry, beside the Arabic.
    layers: layers('protomaps', namedFlavor(flavor), { lang: 'en' }),
  };
}

const ROUTE_LAYERS: readonly LayerSpecification[] = [
  {
    id: 'route-casing',
    type: 'line',
    source: 'route-legs',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#FFFFFF', 'line-width': 9 },
  },
  {
    id: 'route-ride',
    type: 'line',
    source: 'route-legs',
    filter: ['==', ['get', 'dashed'], false],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'colour'], 'line-width': 5 },
  },
  {
    id: 'route-walk',
    type: 'line',
    source: 'route-legs',
    filter: ['==', ['get', 'dashed'], true],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'colour'], 'line-width': 4, 'line-dasharray': [1, 1.6] },
  },
  {
    id: 'route-points',
    type: 'circle',
    source: 'route-points',
    paint: {
      'circle-radius': ['match', ['get', 'role'], 'change', 5, 9],
      'circle-color': ['match', ['get', 'role'], 'start', '#1A2456', 'end', '#B4610F', '#FFFFFF'],
      'circle-stroke-color': ['match', ['get', 'role'], 'change', '#1A2456', '#FFFFFF'],
      'circle-stroke-width': 3,
    },
  },
];

export function createMapView(container: HTMLElement, basemap: Basemap, dark: boolean): MapView {
  register();
  const map = new MapLibre({
    container,
    style: style(basemap, dark),
    center: [55.3, 25.25],
    zoom: 11,
    attributionControl: false,
    maxBounds: [
      [54.6, 24.6],
      [55.9, 25.6],
    ],
  });
  map.addControl(new AttributionControl({ compact: true, customAttribution: 'RTA' }));

  let pending: RouteShape | null = null;
  let loaded = false;

  function draw(shape: RouteShape): void {
    const legs = map.getSource<GeoJSONSource>('route-legs');
    const points = map.getSource<GeoJSONSource>('route-points');
    if (legs && points) {
      void legs.setData(shape.legs);
      void points.setData(shape.points);
    } else {
      map.addSource('route-legs', { type: 'geojson', data: shape.legs });
      map.addSource('route-points', { type: 'geojson', data: shape.points });
      for (const layer of ROUTE_LAYERS) map.addLayer(layer);
    }
    const [west, south, east, north] = shape.bounds;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 48, maxZoom: 16, duration: 0 },
    );
  }

  map.on('load', () => {
    loaded = true;
    if (pending) draw(pending);
  });

  return {
    showRoute(shape) {
      pending = shape;
      if (loaded) draw(shape);
    },
    destroy() {
      map.remove();
    },
  };
}

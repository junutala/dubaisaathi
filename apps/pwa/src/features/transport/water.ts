import type { LatLng } from '@saathi/shared';
import raw from '../../../../../data/transport/water.v1.json';

/**
 * Water a traveller cannot walk across (decision 036): the Dubai Creek and the Dubai Water Canal,
 * as OpenStreetMap draws them.
 *
 * The planner's walks are straight lines between two points, which is honest on land and a lie
 * over water — on 25 September नक्शा drew a bus journey to Meena Bazaar ending in a kilometre's
 * "walk" straight across the Creek. A walk that would cross it is simply not offered; the metro,
 * the bus and the taxi cross it on bridges and tunnels the network already knows.
 */

type Ring = readonly (readonly [number, number])[];
interface WaterBody {
  readonly rings: readonly Ring[];
  /** west, south, east, north — so a walk nowhere near the water costs four comparisons. */
  readonly box: readonly [number, number, number, number];
}

/** More water than this on a straight walk and it is a crossing, not a bank brushed. */
const CROSSING_METRES = 30;

function toBody(rings: readonly Ring[]): WaterBody {
  const points = rings.flat();
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return {
    rings,
    box: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
  };
}

function isRing(value: unknown): value is Ring {
  return (
    Array.isArray(value) &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number',
    )
  );
}

const BODIES: readonly WaterBody[] = raw.polygons
  .map((rings: unknown) => (Array.isArray(rings) ? rings.filter(isRing) : []))
  .filter((rings) => rings.length > 0)
  .map(toBody);

function insideRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    if (a[1] > lat !== b[1] > lat && lng < ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

function insideBody(lng: number, lat: number, body: WaterBody): boolean {
  let inside = false;
  for (const ring of body.rings) if (insideRing(lng, lat, ring)) inside = !inside;
  return inside;
}

/** Where along a→b (0…1) the segment crosses an edge of the body. */
function crossings(from: LatLng, to: LatLng, body: WaterBody): number[] {
  const found: number[] = [];
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  for (const ring of body.rings) {
    for (let i = 1; i < ring.length; i++) {
      const p = ring[i - 1];
      const q = ring[i];
      if (!p || !q) continue;
      const ex = q[0] - p[0];
      const ey = q[1] - p[1];
      const denominator = dx * ey - dy * ex;
      if (denominator === 0) continue;
      const t = ((p[0] - from.lng) * ey - (p[1] - from.lat) * ex) / denominator;
      const u = ((p[0] - from.lng) * dy - (p[1] - from.lat) * dx) / denominator;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) found.push(t);
    }
  }
  return found;
}

/** How many metres of a straight walk from `from` to `to` lie on the water. */
export function waterMetres(from: LatLng, to: LatLng, length: number): number {
  const west = Math.min(from.lng, to.lng);
  const east = Math.max(from.lng, to.lng);
  const south = Math.min(from.lat, to.lat);
  const north = Math.max(from.lat, to.lat);
  let wet = 0;
  for (const body of BODIES) {
    const [bw, bs, be, bn] = body.box;
    if (east < bw || west > be || north < bs || south > bn) continue;
    const cuts = [0, ...crossings(from, to, body).sort((a, b) => a - b), 1];
    for (let i = 1; i < cuts.length; i++) {
      const start = cuts[i - 1] ?? 0;
      const end = cuts[i] ?? 1;
      const middle = (start + end) / 2;
      const lng = from.lng + (to.lng - from.lng) * middle;
      const lat = from.lat + (to.lat - from.lat) * middle;
      if (insideBody(lng, lat, body)) wet += (end - start) * length;
    }
  }
  return wet;
}

/** Whether a straight walk of `length` metres from `from` to `to` would cross the water. */
export function walkCrossesWater(from: LatLng, to: LatLng, length: number): boolean {
  return waterMetres(from, to, length) > CROSSING_METRES;
}

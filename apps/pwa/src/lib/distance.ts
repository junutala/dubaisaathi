import type { LatLng } from '@saathi/shared';
import type { StringKey } from '../i18n/index.js';

/** Great-circle distance in kilometres. Three pillars measure "how far" with it. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const radians = Math.PI / 180;
  const earthKm = 6371;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "650 मी" under a kilometre, "1.2 किमी" above it: the way a person says it. */
export function distanceLabel(
  t: (key: StringKey, vars?: Record<string, string | number>) => string,
  km: number,
): string {
  if (km < 1) return t('food.m', { m: Math.max(50, Math.round((km * 1000) / 50) * 50) });
  return t('food.km', { km: km.toFixed(1) });
}

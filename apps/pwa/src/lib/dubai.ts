import type { LatLng } from '@saathi/shared';

/**
 * Where Dubai is, for the one question three pillars and the pass all ask: is this reading in
 * it? A traveller trying the app in Pune is not in it, and the honest answer there is not a
 * 1,900 km taxi fare but a stand-in: the hotel they have saved, or failing that BurJuman, the
 * interchange in the middle of the districts our travellers stay in. The screen says which.
 */

/** Dubai emirate, generously. Being generous here costs nothing; being tight strands arrivals. */
export const DUBAI = { lat: 25.2, lng: 55.27 } as const;
const RADIUS_KM = 80;

/** Where "here" is when the phone is outside Dubai and no hotel is saved: BurJuman. */
export const VIRTUAL_HERE: LatLng = { lat: 25.2551, lng: 55.3041 };
export const VIRTUAL_HERE_NAME = { hi: 'बुरजुमान', en: 'BurJuman' } as const;

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

export function insideDubai(at: LatLng): boolean {
  return distanceKm(at, DUBAI) <= RADIUS_KM;
}

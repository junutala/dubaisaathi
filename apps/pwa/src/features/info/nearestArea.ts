import type { DubaiPlace, LatLng } from '@saathi/shared';
import type { AreaName } from './records.js';
import placePack from '../../../../../data/intents/places.v1.json';

/**
 * The one piece of the hotel a traveller does not have to type: which part of Dubai the pin
 * fell in, read off the place pack that already ships on the phone. It is content, not code —
 * the same file the intent parser resolves place names from.
 *
 * Only neighbourhoods count. A pin 400 m from Dubai Mall is not in "Dubai Mall", and telling
 * someone their hotel is a shopping centre is worse than telling them nothing.
 */
const AREAS: readonly DubaiPlace[] = (placePack.places as readonly DubaiPlace[]).filter(
  (place) => place.kind === 'neighbourhood',
);

/**
 * Beyond this the nearest listed neighbourhood is not the one you are standing in — the pack
 * covers central Dubai, and a hotel in Al Barsha is 8 km from everything in it. Past the
 * radius the hotel simply has no name, which is honest; a wrong one is not.
 */
const AREA_RADIUS_KM = 4;

/** Great-circle distance in kilometres. */
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

/** The area a pin is in, or nothing at all when the pack does not cover where they are. */
export function areaFor(pin: LatLng): AreaName | undefined {
  let closest: { readonly place: DubaiPlace; readonly km: number } | undefined;
  for (const place of AREAS) {
    const km = distanceKm(pin, place.location);
    if (!closest || km < closest.km) closest = { place, km };
  }
  if (!closest || closest.km > AREA_RADIUS_KM) return undefined;
  return { hi: closest.place.name.hi, en: closest.place.name.en, placeId: closest.place.id };
}

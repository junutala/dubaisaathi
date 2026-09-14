import type { LatLng } from '@saathi/shared';

/**
 * Deciding that a traveller is in Dubai, which is the one number entitlement runs on.
 *
 * Nothing counts while they are in India: the app is free there for a year so it can be tried
 * before the trip. The moment they land, 24 hours starts. So this has to be right in both
 * directions — starting the counter in Mumbai steals a day the traveller paid for, and failing
 * to start it at the airport gives the product away.
 *
 * Two independent signals, because neither is reliable alone:
 *
 * - **The geofence.** Accurate, and needs a permission the traveller may never grant.
 * - **The phone's clock.** Gulf Standard Time is UTC+4 and Indian Standard Time is UTC+5:30, so
 *   a phone that switches offset has almost certainly moved. It needs no permission at all,
 *   which matters: location is the one permission this app asks for, and it is asked at first
 *   need rather than on arrival.
 *
 * Either signal can say "in Dubai", and **neither is believed on a single reading**
 * (CLAUDE.md: repeated readings, never one fix). A GPS glitch or a traveller who sets their
 * watch forward the night before must not start the clock.
 */

/** Dubai emirate, generously. Being generous here costs nothing; being tight strands arrivals. */
const DUBAI = { lat: 25.2, lng: 55.27 } as const;
const RADIUS_KM = 80;

/** Gulf Standard Time, as minutes west of UTC — what `getTimezoneOffset` returns for UTC+4. */
const GULF_OFFSET_MINUTES = -240;

/** How many separate readings agree before the counter starts. */
export const CONFIRMATIONS_NEEDED = 3;

/**
 * And how many agree before we accept that they have gone home.
 *
 * Higher than arriving, deliberately. Getting an arrival wrong by a few hours costs a traveller
 * a slice of a free day; getting a departure wrong locks a paying customer out of the app in the
 * middle of their trip, in a country where they have no data. The two mistakes are not the same
 * size, so they do not get the same threshold.
 */
export const DEPARTURES_NEEDED = 6;

function distanceKm(a: LatLng, b: LatLng): number {
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

/** The phone's own clock, which needs no permission and no fix. */
export function clockSaysGulf(now: Date = new Date()): boolean {
  return now.getTimezoneOffset() === GULF_OFFSET_MINUTES;
}

/**
 * One reading's verdict. `at` is absent when the traveller has never granted location, which is
 * the normal case — then the clock is the whole answer.
 */
export function readingSaysDubai(at: LatLng | undefined): boolean {
  if (at !== undefined && insideDubai(at)) return true;
  return clockSaysGulf();
}

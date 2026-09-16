import type { LatLng } from '@saathi/shared';
import { insideDubai } from '../../lib/dubai.js';

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

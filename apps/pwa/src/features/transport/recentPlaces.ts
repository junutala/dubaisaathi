import type { DubaiPlace } from '@saathi/shared';
import { placeById } from './destinations.js';

/**
 * Where this traveller has already asked to go, newest first.
 *
 * 1.1 was a box and two buttons over half a screen of nothing, and the ledger always said this
 * belonged there: _"Tourists repeat destinations; saves typing on day two."_ A tourist's week
 * is four or five places over and over — the hotel, the mall, the metro station, the restaurant
 * their cousin named.
 *
 * It is a shortcut and never a suggestion. Tapping one **fills the box** rather than navigating,
 * so the traveller still chooses whether they want the route or the driver. Nothing here is
 * ranked by anything we think they would like.
 *
 * On the device, in localStorage: it is this phone's own history and there is no reason for it
 * to leave.
 */

const KEY = 'saathi.recentPlaces';
/** Enough for a trip's worth of repeats without the list becoming something to read. */
const KEEP = 4;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    // Private mode, cleared storage, or something that is not ours. A missing shortcut is not
    // worth a broken screen.
    return [];
  }
}

/** Newest first, most recent use wins, and a place that has left the pack quietly drops out. */
export function recentPlaces(): readonly DubaiPlace[] {
  return read()
    .map((id) => placeById(id))
    .filter((place): place is DubaiPlace => place !== undefined)
    .slice(0, KEEP);
}

export function rememberPlace(placeId: string): void {
  try {
    const next = [placeId, ...read().filter((id) => id !== placeId)].slice(0, KEEP);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not being able to remember is a worse day tomorrow, not a broken one today.
  }
}

export function forgetPlaces(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
}

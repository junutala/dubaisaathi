import type { DubaiPlace } from '@saathi/shared';
import { intentCorpus } from '../ask/intentPacks.js';
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

/**
 * Where travellers actually go, most-asked first, from `popularity` in the place pack.
 *
 * This is what fills 1.1 on the first day, when the traveller has no history and the screen
 * would otherwise be a box over half a phone of nothing. Ranked in content rather than in code,
 * so once the learning loop is syncing the order comes from what people really asked for
 * (`voice_events.resolved_place_id`) rather than from anyone's guess.
 *
 * Like the rest of the shortcuts it fills the box and never acts: going there and showing a
 * driver are still the traveller's choice, made after they see the name.
 */
export function popularPlaces(): readonly DubaiPlace[] {
  return [...intentCorpus.places.values()]
    .filter((place) => place.popularity !== undefined)
    .sort((a, b) => (a.popularity ?? 0) - (b.popularity ?? 0));
}

/**
 * The shortcuts as one row: the hotel first because it is the destination a traveller repeats
 * most, then wherever this phone has already been, then the popular places to fill the rest.
 * No duplicates, and capped so it stays a row of shortcuts rather than a list to read.
 */
export function quickPicks(hotelPlaceId: string | undefined, limit = 8): readonly DubaiPlace[] {
  const out: DubaiPlace[] = [];
  const seen = new Set<string>();
  const add = (place: DubaiPlace | undefined) => {
    if (!place || seen.has(place.id) || out.length >= limit) return;
    seen.add(place.id);
    out.push(place);
  };
  add(hotelPlaceId === undefined ? undefined : placeById(hotelPlaceId));
  for (const place of recentPlaces()) add(place);
  for (const place of popularPlaces()) add(place);
  return out;
}

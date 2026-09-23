import { mapsPlaceOf, type MapsPlace } from '@saathi/shared';
import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';

/**
 * A short maps link off the card's QR code, followed through our own `maplink` function (decision
 * 032, the owner's addendum): maps.app.goo.gl says nothing about where it goes until it is
 * followed, and that takes a signal.
 *
 * What leaves the phone is the link printed on the card, and only after the traveller pressed
 * Submit — never the photograph, never the hotel, never anything that says who is asking. The
 * function answers with the long link, and the phone reads the place off it itself, with the same
 * rules it reads a long link printed on a card with.
 */

const MAPLINK = `${PROJECT_URL}/functions/v1/maplink`;
/** Two hops at Google and back: longer than this is a signal too weak to wait on. */
const WAIT_MS = 12_000;

export type LinkAnswer =
  /** Followed, and it names or places the hotel. */
  | { readonly kind: 'place'; readonly place: MapsPlace }
  /** Followed, and it is not a maps place after all: dropped, the card is read the usual way. */
  | { readonly kind: 'none' }
  /** Not followed — no signal, or the server did not answer. Kept, and tried again. */
  | { readonly kind: 'waiting' };

export async function followShortLink(url: string): Promise<LinkAnswer> {
  const abort = new AbortController();
  const timer = window.setTimeout(() => {
    abort.abort();
  }, WAIT_MS);
  try {
    const response = await fetch(MAPLINK, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ url }),
      cache: 'no-store',
      signal: abort.signal,
    });
    // The function refused the link, or followed it somewhere that is not Google Maps.
    if (response.status === 400 || response.status === 422) return { kind: 'none' };
    if (!response.ok) return { kind: 'waiting' };
    const body = (await response.json()) as { url?: unknown };
    const place = typeof body.url === 'string' ? mapsPlaceOf(body.url) : undefined;
    return place !== undefined && (place.at !== undefined || place.name !== undefined)
      ? { kind: 'place', place }
      : { kind: 'none' };
  } catch {
    return { kind: 'waiting' };
  } finally {
    window.clearTimeout(timer);
  }
}

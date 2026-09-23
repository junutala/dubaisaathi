/**
 * A maps link printed on a hotel's card as a QR code, read without asking anybody (decision 032,
 * the owner's addendum of 23 September): where the hotel is, and what Google calls it.
 *
 * One definition for the phone and for the `maplink` edge function, which follows the short links
 * a card sometimes prints. This file has no imports on purpose: the edge functions run on Deno and
 * cannot reach into a workspace package, so `supabase/functions/_shared/mapsLink.ts` is a byte for
 * byte mirror of it, and `packages/content-tools/src/mapsLink.test.ts` fails when the two drift.
 */

/** A place on a maps link. Either half may be missing: a link can name a place and not pin it. */
export interface MapsPlace {
  readonly at?: { readonly lat: number; readonly lng: number };
  readonly name?: string;
}

function urlOf(text: string): URL | undefined {
  try {
    return new URL(text.trim());
  } catch {
    return undefined;
  }
}

/** Only links that are plainly addresses: no password, no port, the web's own two schemes. */
function plain(url: URL): boolean {
  return (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.username === '' &&
    url.password === '' &&
    url.port === ''
  );
}

/**
 * The short links Google prints for a place, and nothing else. This list is the whole of what the
 * edge function will ever fetch: a short link is followed only because it is one of these, and a
 * link to anywhere else is never asked for — the function is not a way to make our server fetch
 * a stranger's address.
 */
export function isShortMapsLink(text: string): boolean {
  const url = urlOf(text);
  if (url === undefined || !plain(url)) return false;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (host === 'maps.app.goo.gl') return path.length > 1;
  if (host === 'goo.gl' || host === 'www.goo.gl') return /^\/maps\/.+/.test(path);
  if (host === 'g.co') return /^\/kgs\/.+/.test(path);
  return false;
}

/** google.com, google.ae, google.co.in — the domains Google Maps answers on. */
const GOOGLE = /^(?:www\.|maps\.)?google\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/;

/** A long Google Maps address — what a short link lands on, and what most cards print outright. */
export function isGoogleMapsUrl(text: string): boolean {
  const url = urlOf(text);
  if (url === undefined || !plain(url)) return false;
  const host = url.hostname.toLowerCase();
  if (!GOOGLE.test(host)) return false;
  return host.startsWith('maps.') || url.pathname === '/maps' || url.pathname.startsWith('/maps/');
}

/** Degrees that are a real place on the Earth, from two strings the link carries. */
function latLng(lat: string, lng: string): MapsPlace['at'] {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  if (Math.abs(a) > 90 || Math.abs(b) > 180 || (a === 0 && b === 0)) return undefined;
  return { lat: a, lng: b };
}

const PAIR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function pairOf(text: string | null): MapsPlace['at'] {
  const match = text === null ? null : PAIR.exec(text);
  return match ? latLng(match[1] ?? '', match[2] ?? '') : undefined;
}

/** A name as a link spells it: `+` for a space, then percent-escapes. Garbled escapes are no name. */
function nameOf(text: string | null | undefined): string | undefined {
  if (text === null || text === undefined) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(text.replace(/\+/g, ' '));
  } catch {
    return undefined;
  }
  // Coordinates written where a name goes, in degrees or in degrees and minutes, are no name.
  if (PAIR.test(decoded) || /^\s*-?\d{1,3}(?:\.\d+)?\s*°/.test(decoded)) return undefined;
  // A place's name, not its address: Google writes "Name, street - area - Dubai" into some links.
  const name = (decoded.split(',')[0] ?? '').replace(/\s+/g, ' ').trim();
  if (name === '' || name.length > 120) return undefined;
  return name;
}

/** The parameters a Maps link puts a place in, the most specific first. */
const PLACE_PARAMS = ['q', 'query', 'destination', 'daddr', 'll', 'center'] as const;

/**
 * Where a maps link says the place is, and what it calls it — offline, from the text alone. The
 * pin Google drops (`!3d…!4d…`) is taken before a coordinate a parameter gives, and both before
 * the `@` of the view, which is where the map was centred rather than where the place is.
 *
 * Undefined for anything that is not a maps link: a WhatsApp link, a website, a vCard.
 */
export function mapsPlaceOf(text: string): MapsPlace | undefined {
  const geo = /^geo:(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/i.exec(text.trim());
  if (geo) {
    const at = latLng(geo[1] ?? '', geo[2] ?? '');
    return at === undefined ? undefined : { at };
  }
  if (!isGoogleMapsUrl(text)) return undefined;
  const url = new URL(text.trim());
  const whole = `${url.pathname}${url.search}${url.hash}`;

  let at: MapsPlace['at'];
  const pinned = /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(whole);
  if (pinned) at = latLng(pinned[1] ?? '', pinned[2] ?? '');
  let name: string | undefined;
  for (const key of PLACE_PARAMS) {
    const value = url.searchParams.get(key);
    const pair = pairOf(value);
    if (pair !== undefined) at ??= pair;
    else if (key !== 'll' && key !== 'center') name ??= nameOf(value);
  }
  const view = /\/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/.exec(url.pathname);
  if (view) at ??= latLng(view[1] ?? '', view[2] ?? '');

  const place = /\/maps\/place\/([^/]+)/.exec(url.pathname);
  // A path segment is percent-encoded once already: `%2B` is a plus in the name, `+` a space.
  const fromPath = nameOf(place?.[1]);
  if (fromPath !== undefined) name = fromPath;
  else if (place?.[1] !== undefined) at ??= pairOf(decodeSafely(place[1]));

  return { ...(at === undefined ? {} : { at }), ...(name === undefined ? {} : { name }) };
}

function decodeSafely(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

/** Where one redirect of a short link may go, and what it is when it gets there. */
export type Hop =
  | { readonly kind: 'maps'; readonly url: string }
  | { readonly kind: 'short'; readonly url: string }
  | { readonly kind: 'refused' };

/**
 * The next step of a short link, from the `Location` it answered with: a Maps page (done), another
 * short link (follow it), or anything else (stop — the function never fetches it). Google's
 * consent page carries the Maps address it would continue to, and that address is taken from it
 * rather than the page being fetched.
 */
export function nextHop(location: string, from: string): Hop {
  let url: URL;
  try {
    url = new URL(location, from);
  } catch {
    return { kind: 'refused' };
  }
  if (isGoogleMapsUrl(url.href)) return { kind: 'maps', url: url.href };
  if (isShortMapsLink(url.href)) return { kind: 'short', url: url.href };
  if (plain(url) && /^consent\.google\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/.test(url.hostname)) {
    const onward = url.searchParams.get('continue');
    if (onward !== null && isGoogleMapsUrl(onward)) return { kind: 'maps', url: onward };
  }
  return { kind: 'refused' };
}

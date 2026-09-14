import type { LatLng } from '@saathi/shared';

/**
 * यहीं पिन करें, and the whole of it is one rule from CLAUDE.md: **never tell a traveller
 * their phone cannot do something until it has refused.** There is no capability query here
 * and no permission probe. The button is live from the moment the screen paints, the phone is
 * asked when it is pressed, and whatever the phone says back is what the traveller is told.
 *
 * That includes a browser with no geolocation at all: reading the missing object throws inside
 * the executor, the promise rejects, and it arrives as a refusal like any other — a device
 * that answered, rather than a device we ruled out in advance.
 */
export type PinResult =
  | { readonly kind: 'pinned'; readonly at: LatLng }
  /** The phone was asked and said no. `denied` is the traveller's own choice; the rest are not. */
  | { readonly kind: 'refused'; readonly why: 'denied' | 'unavailable' | 'timeout' };

/** A hotel lobby is indoors, where a fix is slow — long enough to get one, short enough to answer. */
const PIN_TIMEOUT_MS = 15_000;

export async function pinHere(): Promise<PinResult> {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: PIN_TIMEOUT_MS,
        maximumAge: 0,
      });
    });
    return {
      kind: 'pinned',
      at: { lat: position.coords.latitude, lng: position.coords.longitude },
    };
  } catch (error) {
    return { kind: 'refused', why: whyRefused(error) };
  }
}

/**
 * `GeolocationPositionError` is a browser object with numeric codes, and it is not the only
 * thing that can land here — a browser with no geolocation throws a plain `TypeError` instead.
 * Anything that is not a stated refusal is reported as "could not get a fix", which is what it
 * is, and which leaves the two photo options on 4.2 as the way through.
 */
function whyRefused(error: unknown): 'denied' | 'unavailable' | 'timeout' {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}

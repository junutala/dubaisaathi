import type { LatLng } from '@saathi/shared';

/**
 * The one permission this app needs, asked the one time it is needed (design rules 9 and 30).
 *
 * Two rules shape everything here. The reason goes on the screen **before** the phone's own
 * prompt, because a prompt with no reason is a prompt that gets refused. And the phone's answer
 * is the answer: we never conclude a traveller has no location until the device has actually
 * said so (CLAUDE.md — five defects on 13 September were the app deciding something was
 * impossible instead of trying it).
 *
 * Asked once. A traveller who says no is not asked again on the next screen, or the next day.
 *
 * It lives in `lib/` rather than under रास्ता because two tiles now need it: the route needs to
 * know where "from" is, and खाना needs to know what is nearby. It holds no feature logic —
 * only the asking, the answer and a cache so that moving between screens does not wake the GPS
 * twice.
 */

export type Location =
  /** Not asked yet — the reason line is still to be shown. */
  | { readonly kind: 'unknown' }
  | { readonly kind: 'asking' }
  | { readonly kind: 'here'; readonly at: LatLng }
  /** The phone refused. This, and only this, is what 1.1b is about. */
  | { readonly kind: 'denied' }
  /** The phone tried and could not: no fix, timed out, or no geolocation at all. */
  | { readonly kind: 'unavailable' };

const ASKED_KEY = 'saathi.locationAsked';

/**
 * A fix is good for the length of a walk to the metro, not the length of a holiday, but asking
 * again costs a traveller nothing and this is not a tracking app: the cache exists so that
 * moving between 1.1 and 1.3 does not wake the GPS twice.
 */
let cached: Location = { kind: 'unknown' };
let inFlight: Promise<Location> | null = null;

/**
 * Screens that need the answer but must never be the one that asks — the top strip is on every
 * screen, and a strip that called `askForLocation` would put the phone's prompt in front of a
 * traveller before any reason for it had been shown (design rules 9 and 30). They watch instead.
 */
type Watcher = (location: Location) => void;
const watchers = new Set<Watcher>();

function settle(answer: Location): Location {
  cached = answer;
  for (const watcher of watchers) watcher(answer);
  return answer;
}

/** Watch the answer without asking for it. Returns the unsubscribe. */
export function watchLocation(watcher: Watcher): () => void {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
}

/** Whether the reason has already been shown and the phone already asked, ever. */
export function hasBeenAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === 'yes';
  } catch {
    // A browser with site data blocked still works; it just shows the reason once per session.
    return cached.kind !== 'unknown';
  }
}

function markAsked(): void {
  try {
    localStorage.setItem(ASKED_KEY, 'yes');
  } catch {
    // Nothing to do: the in-memory cache carries the same fact for this session.
  }
}

export function currentLocation(): Location {
  return cached;
}

/** For tests, and for a traveller who fixes the setting and comes back to 1.1b. */
export function forgetLocation(): void {
  settle({ kind: 'unknown' });
  inFlight = null;
}

function readError(error: unknown): Location {
  // GeolocationPositionError is a browser type with numeric codes; 1 is PERMISSION_DENIED.
  const code = (error as GeolocationPositionError | undefined)?.code;
  return code === 1 ? { kind: 'denied' } : { kind: 'unavailable' };
}

/**
 * Ask the phone. Never called before the reason is on the screen, and never called twice at
 * once — two prompts stacked on top of each other is how a traveller ends up refusing both.
 */
export async function askForLocation(): Promise<Location> {
  if (cached.kind === 'here') return cached;
  if (inFlight) return inFlight;

  markAsked();
  // Older Android WebViews and some in-app browsers have no geolocation at all. That is the
  // device answering, not a guess about it.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom overstates support
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return settle({ kind: 'unavailable' });
  }

  settle({ kind: 'asking' });
  inFlight = new Promise<Location>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          kind: 'here',
          at: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
      },
      (error: GeolocationPositionError) => {
        resolve(readError(error));
      },
      {
        // A street-level fix is all a walk to the nearest station needs, and the low-accuracy
        // one arrives without waking the GPS chip — which matters on a phone in a pocket with
        // no data and a day left of battery.
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 5 * 60_000,
      },
    );
  }).then((answer) => {
    inFlight = null;
    return settle(answer);
  });

  return inFlight;
}

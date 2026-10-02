/**
 * The offline kit waits for the second open (the owner, 2 October; decision 052).
 *
 * The kit is the service worker's precache (every screen, the fonts and the content packs, about
 * 8 MB) and the street map (16 MB). Fetched on the first open, it turned a tap on an ad into half
 * a minute or more inside Facebook's own browser, and nearly everyone left before the first screen
 * finished — 186 clicks on 1 October became nine phones in the app. A first open is someone
 * deciding whether to look; the second is someone who came back. So the kit comes down on the
 * second open, on a phone that is already installed, or on one that already holds a worker — the
 * travellers who have it today keep it and keep being updated.
 *
 * An open is a page load in a new browsing session: a reload in the same tab is the same open.
 */

const OPENS = 'saathi.opens';
const COUNTED = 'saathi.openCounted';

/** Counts this open once per browsing session and returns the total so far, this one included. */
export function countThisOpen(
  local: Pick<Storage, 'getItem' | 'setItem'>,
  session: Pick<Storage, 'getItem' | 'setItem'>,
): number {
  try {
    const before = Number(local.getItem(OPENS) ?? '0');
    const soFar = Number.isFinite(before) && before > 0 ? before : 0;
    if (session.getItem(COUNTED) === '1') return Math.max(1, soFar);
    session.setItem(COUNTED, '1');
    local.setItem(OPENS, String(soFar + 1));
    return soFar + 1;
  } catch {
    // Private mode remembers nothing, so every open is a first: the kit would never come. Treat
    // it as a return instead — the app worked this way for everyone until 2 October.
    return 2;
  }
}

/** Whether this open fetches the offline kit. */
export function offlineKitDue(opens: number, hasWorker: boolean, installed: boolean): boolean {
  return hasWorker || installed || opens >= 2;
}

let due = true;

/** Read once, before anything paints; the map follows what it decided. */
export function decideOfflineKit(): boolean {
  const hasWorker = 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
  let installed = false;
  try {
    installed =
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    installed = false;
  }
  due = offlineKitDue(countThisOpen(localStorage, sessionStorage), hasWorker, installed);
  return due;
}

export function offlineKitIsDue(): boolean {
  return due;
}

/**
 * Registers the worker that downloads the kit — on a due open, or wherever a worker is already
 * registered, so a phone that has the kit is never left without its updates.
 */
export async function registerOfflineKit(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!due && existing === undefined) return;
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch {
    /* no worker today; the app still runs from the network, and the next open tries again */
  }
}

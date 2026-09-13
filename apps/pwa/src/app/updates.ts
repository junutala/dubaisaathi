/**
 * Applying a downloaded update, at the next launch and never mid-trip.
 *
 * The product decision (CLAUDE.md): "Updates download silently while the app is open and apply
 * on the landing page at the next launch — never mid-trip." A traveller halfway through showing
 * a driver an address must not have the app reload under them.
 *
 * The service worker already does the first half: a new build installs in the background and
 * then waits. Nothing was doing the second half. Left alone, a waiting worker only takes over
 * once every tab of the origin is closed — which on a phone, where the app is never really
 * closed, can be days. The traveller keeps running the old build and cannot tell.
 *
 * So: at a cold start, if a worker is already waiting from an earlier session, that update was
 * downloaded before this launch and is applied now. One reload, before anything is on screen.
 * A worker that starts waiting *during* this session is left alone until the next launch.
 */

/** Set for the life of the tab, so a worker that refuses to activate cannot cause a reload loop. */
const APPLIED = 'saathi.updateApplied';

/** How long to wait for the new worker to take over before reloading anyway. */
const HANDOVER_TIMEOUT_MS = 3000;

export async function applyPendingUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await navigator.serviceWorker.getRegistration();
  } catch {
    return false;
  }

  const waiting = registration?.waiting;
  // No worker waiting means either a first visit or nothing new — both are the normal case.
  if (!waiting) return false;
  // `navigator.serviceWorker.controller` is null on the very first load of a fresh install; there
  // is no old build to replace, so there is nothing to apply and no reason to reload.
  if (!navigator.serviceWorker.controller) return false;
  if (sessionStorage.getItem(APPLIED) !== null) return false;

  sessionStorage.setItem(APPLIED, '1');
  waiting.postMessage({ type: 'SKIP_WAITING' });

  await new Promise<void>((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, HANDOVER_TIMEOUT_MS);
    navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
  });

  window.location.reload();
  return true;
}

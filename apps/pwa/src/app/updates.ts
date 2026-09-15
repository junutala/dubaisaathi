/**
 * Getting a new build onto the phone.
 *
 * The product decision (CLAUDE.md): "Updates download silently while the app is open and apply
 * on the landing page at the next launch — never mid-trip." A traveller halfway through showing
 * a driver an address must not have the app reload under them.
 *
 * "Never mid-trip" means never in the middle of a task. It was read as "never during this
 * session", and that was wrong in a way that cost real time: the only check ran once, before
 * anything painted, and a new worker takes a second or two to install — so at that instant there
 * was nothing waiting yet, and by the time there was, nobody looked again. Every release reached
 * a phone one launch late, and a browser tab that is never truly closed could sit on a build for
 * days. The owner tested a deployment he had been told was live and saw the previous one.
 *
 * So there are three ways in now, in order of how quickly they fire:
 *
 *   1. A worker already waiting at a cold start is applied before anything paints, as before.
 *   2. A worker that finishes installing *during* the session is applied as soon as the traveller
 *      is on घर — no task in progress, nothing on screen to lose. That is what "not mid-trip"
 *      actually means.
 *   3. Nothing is downloaded unless somebody asks, so the app asks: a check on launch and every
 *      half hour the app stays open, because the browser's own schedule is its business and can
 *      be a day.
 */

/** Set for the life of the tab, so a worker that refuses to activate cannot cause a reload loop. */
const APPLIED = 'saathi.updateApplied';

/** How long to wait for the new worker to take over before reloading anyway. */
const HANDOVER_TIMEOUT_MS = 3000;

/** How often an open app asks whether there is a new build. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  try {
    return await navigator.serviceWorker.getRegistration();
  } catch {
    return undefined;
  }
}

/**
 * Hands over to a waiting worker and reloads.
 *
 * Shared by the cold-start path and the on-घर path so there is one way this happens. The reload
 * is unconditional after the handover resolves or times out: a worker that will not activate
 * must not leave the traveller on a half-replaced build.
 */
async function handOver(waiting: ServiceWorker): Promise<void> {
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
}

/**
 * At a cold start: apply an update downloaded in an earlier session, before anything paints.
 * This is the "next launch" the previous session's download was waiting for.
 */
export async function applyPendingUpdate(): Promise<boolean> {
  const reg = await registration();
  const waiting = reg?.waiting;
  // No worker waiting means either a first visit or nothing new — both are the normal case.
  if (!waiting) return false;
  // `navigator.serviceWorker.controller` is null on the very first load of a fresh install; there
  // is no old build to replace, so there is nothing to apply and no reason to reload.
  if (!navigator.serviceWorker.controller) return false;
  if (sessionStorage.getItem(APPLIED) !== null) return false;

  await handOver(waiting);
  return true;
}

/**
 * Apply a build that arrived while the app was open — called when the traveller is on घर.
 *
 * Safe there and nowhere else: घर holds no typed sentence, no destination and no half-finished
 * task, so a reload costs nothing. Called from a child screen this would be the exact thing the
 * rule forbids, which is why the decision of *when* belongs to the screen and not to this file.
 */
export async function applyUpdateIfIdle(): Promise<boolean> {
  if (sessionStorage.getItem(APPLIED) !== null) return false;
  const reg = await registration();
  const waiting = reg?.waiting;
  if (!waiting || !navigator.serviceWorker.controller) return false;

  await handOver(waiting);
  return true;
}

/**
 * Ask whether there is a new build, now and twice an hour after that.
 *
 * Without this nothing downloads until the browser decides to look, which it may not do for a
 * day. Returns the stop function; failures are ignored on purpose — a phone with no signal
 * asking for an update is the normal case, not an error worth surfacing.
 */
export function startUpdateChecks(): () => void {
  const ask = () => {
    void registration().then((reg) => reg?.update().catch(() => undefined));
  };
  ask();
  const timer = window.setInterval(ask, CHECK_EVERY_MS);
  // A phone coming back to signal is the most likely moment for an update to be available.
  window.addEventListener('online', ask);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('online', ask);
  };
}

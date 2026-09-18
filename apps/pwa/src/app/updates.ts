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
 *
 * Way 2 needed a fourth thing to work, and did not have it until 18 September. It was wired to
 * the traveller *arriving* on घर, so a traveller already standing there when the download
 * finished was never asked again — and that is the common case, because घर is where the app
 * opens. The owner watched a new build download to his phone in full (the http log shows the
 * worker fetching every asset) and went on looking at the build before it. So the arrival of a worker is now
 * itself a moment: `watchForUpdate` below notices one finishing, and the screen decides whether
 * it is a safe time.
 */

/**
 * When a handover was last attempted in this tab, so a worker that refuses to activate cannot
 * cause a reload loop — and cannot wedge the tab for ever either. It was a one-shot flag until
 * 18 September, which meant a single failed handover left that tab on the old build for as long
 * as it stayed open: the exact state the owner's phone was found in, four releases behind.
 */
const APPLIED = 'saathi.updateApplied';
/** Long enough that a reload loop is impossible, short enough that a failure is not permanent. */
const RETRY_AFTER_MS = 60_000;

/** A repair takes the worker out of the way entirely; once an hour at most, and never a loop. */
const REPAIRED = 'saathi.updateRepaired';
const REPAIR_AFTER_MS = 60 * 60 * 1000;

function triedRecently(key: string, within: number, store: Storage): boolean {
  try {
    const at = Number(store.getItem(key) ?? '');
    return Number.isFinite(at) && at > 0 && Date.now() - at < within;
  } catch {
    // Private mode: nothing is remembered, and one extra attempt is better than none.
    return false;
  }
}

function noteTry(key: string, store: Storage): void {
  try {
    store.setItem(key, String(Date.now()));
  } catch {
    /* private mode, and nothing a traveller should see */
  }
}

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
  noteTry(APPLIED, sessionStorage);
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
  if (triedRecently(APPLIED, RETRY_AFTER_MS, sessionStorage)) return false;

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
  if (triedRecently(APPLIED, RETRY_AFTER_MS, sessionStorage)) return false;
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
  const askIfVisible = () => {
    if (document.visibilityState === 'visible') ask();
  };
  ask();
  const timer = window.setInterval(ask, CHECK_EVERY_MS);
  // A phone coming back to signal is the most likely moment for an update to be available.
  window.addEventListener('online', ask);
  /**
   * And the likeliest moment of all: the app coming back to the foreground. A phone in a pocket
   * never "launches" — the app is resumed, no boot code runs, and on 18 September that was how a
   * build sat unseen on a phone whose tab had been open since morning.
   */
  document.addEventListener('visibilitychange', askIfVisible);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('online', ask);
    document.removeEventListener('visibilitychange', askIfVisible);
  };
}

/** What `version.json` says, which is the server's own answer rather than a worker's. */
export interface Latest {
  readonly build: string;
  readonly at: string;
  readonly minimumAt: string;
}

/**
 * Which build the server is serving, asked so that nothing can answer from a cache.
 *
 * This is the question nothing was asking. Every other signal here is about the *worker* — is
 * one waiting, has it installed — and a worker that misbehaves makes all of them say "nothing to
 * do" while the traveller looks at last week's app. Sixty bytes, `no-store`, and the phone can
 * always tell whether it is current.
 */
export async function latestBuild(): Promise<Latest | null> {
  try {
    const response = await fetch(`version.json?at=${String(Date.now())}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<Latest>;
    if (typeof body.build !== 'string') return null;
    return {
      build: body.build,
      at: typeof body.at === 'string' ? body.at : '',
      minimumAt: typeof body.minimumAt === 'string' ? body.minimumAt : '',
    };
  } catch {
    // No signal, a captive portal, a server between deployments: not knowing is not being behind.
    return null;
  }
}

/**
 * The last resort, when the server says there is a newer build and the worker will not hand over.
 *
 * It takes the worker out of the way — unregistered, its caches deleted — and reloads onto
 * whatever the network serves. **Nothing of the traveller's is in there**: the documents, the
 * hotel and the pass live in IndexedDB and localStorage, which this does not touch. What is lost
 * is the offline copy of the app itself, which the new worker rebuilds on the next load.
 *
 * Once an hour at most, so a server that is genuinely unreachable cannot turn this into a loop.
 */
export async function repairToLatest(): Promise<boolean> {
  if (triedRecently(REPAIRED, REPAIR_AFTER_MS, localStorage)) return false;
  noteTry(REPAIRED, localStorage);
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  } catch {
    /* an unregister that fails still leaves the reload below worth doing */
  }
  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch {
    /* same: the shell is network-first, so a stale cache is no longer the authority anyway */
  }
  window.location.reload();
  return true;
}

/**
 * Notice a build that finishes downloading while the app is open, and say so once.
 *
 * This is the missing half of way 2. `applyUpdateIfIdle` answers "is there one waiting?" at the
 * moment it is called; nothing was asking that question again while the traveller sat on घर, so
 * a build that landed a second after the screen painted waited for a navigation that never came.
 *
 * The caller decides what to do — this file must not, because only the screen knows whether the
 * traveller is in the middle of something (see `applyUpdateIfIdle`).
 */
export function watchForUpdate(arrived: () => void): () => void {
  let stopped = false;
  let watched: ServiceWorkerRegistration | undefined;

  const onStateChange = (worker: ServiceWorker) => () => {
    // `installed` is the state a worker sits in while it waits for the old one to let go. No
    // controller means this is a first install with nothing to replace, which is not an update.
    if (!stopped && worker.state === 'installed' && navigator.serviceWorker.controller) arrived();
  };

  const onFound = () => {
    const installing = watched?.installing;
    if (!installing) return;
    installing.addEventListener('statechange', onStateChange(installing));
  };

  void registration().then((found) => {
    if (stopped || !found) return;
    watched = found;
    found.addEventListener('updatefound', onFound);
    // One may already be waiting: the download can finish between the cold start's check and
    // this one, which is exactly the gap that let a release sit unseen on a phone.
    if (found.waiting && navigator.serviceWorker.controller) arrived();
  });

  return () => {
    stopped = true;
    watched?.removeEventListener('updatefound', onFound);
  };
}

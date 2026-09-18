import { useEffect, useState } from 'react';
import { BUILD_AT, BUILD_SHA } from './version.js';
import { applyUpdateIfIdle, latestBuild, repairToLatest } from './updates.js';

/**
 * "Am I running what the server is serving?" — asked on घर, answered by the server.
 *
 * Every other update signal in this app is about the service worker: is one waiting, has one
 * installed. On 18 September all of them said "nothing to do" on a phone that was four releases
 * behind, because the worker had downloaded the new build and would not hand over. A worker
 * cannot be the authority on what the app is. `version.json` can.
 *
 * So this compares the build actually running with the build the server names, on the moments
 * that matter — the screen appearing, the app returning to the foreground, the signal coming
 * back — and when they differ it applies the update. If that does not land within a few seconds
 * the worker is taken out of the way entirely (`repairToLatest`), which is the difference
 * between a phone that catches up by itself and a phone somebody has to be talked through.
 *
 * `minimumAt` in the beacon is the lever for a build that is actively wrong: older than that and
 * the update is applied wherever the traveller is standing. It is empty until somebody sets it.
 */
export type Freshness = 'unknown' | 'current' | 'catchingUp';

/** Long enough for a handover and a reload; past it, the worker is the problem. */
const GIVE_UP_MS = 8000;

export function useFreshness(safeToApply: boolean): Freshness {
  const [state, setState] = useState<Freshness>('unknown');

  useEffect(() => {
    let live = true;
    let repairing: number | undefined;

    const check = () => {
      void latestBuild().then((latest) => {
        if (!live || latest === null) return;
        // A local build has no sha and can never be "behind" a deployed one.
        if (BUILD_SHA === '' || latest.build === '' || latest.build === BUILD_SHA) {
          setState('current');
          return;
        }
        // Older than the minimum the server will tolerate: apply it wherever they are standing.
        const forced = latest.minimumAt !== '' && BUILD_AT < latest.minimumAt;
        if (!safeToApply && !forced) return;

        setState('catchingUp');
        void applyUpdateIfIdle();
        // The handover is given its few seconds; a worker that has not obeyed by then is not
        // going to, and the traveller should not be the one to find that out.
        window.clearTimeout(repairing);
        repairing = window.setTimeout(() => {
          if (live) void repairToLatest();
        }, GIVE_UP_MS);
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      live = false;
      window.clearTimeout(repairing);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [safeToApply]);

  return state;
}

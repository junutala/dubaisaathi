import type { EventPillar, NetworkState } from '@saathi/shared';

/**
 * Time actively used, not time open (decision 043). A phone left on a menu in a pocket is not a
 * traveller being helped, so a second counts only while the app is visible and the traveller has
 * touched, scrolled or typed within the last minute. Each counted second is filed under the pillar
 * on screen and the network state at that moment, which is what lets the owner compare time
 * actively spent with no signal against time spent online.
 */

/** No touch for longer than this and the traveller is no longer counted as using the app. */
export const IDLE_MS = 60_000;
/** A gap between ticks longer than this (the phone slept) counts for no more than one tick. */
const MAX_STEP_MS = 10_000;

export interface ActiveClock {
  /** A touch, a scroll, a key: the traveller is here. */
  interact(now: number): void;
  /** Called on a timer; counts the time since the last tick if the traveller was active. */
  tick(now: number, visible: boolean, pillar: EventPillar, net: NetworkState): void;
  /** The seconds counted since the last flush, by pillar and network state; then starts again. */
  flush(): { pillar: EventPillar; net: NetworkState; seconds: number }[];
}

export function createActiveClock(start: number): ActiveClock {
  let lastInteraction = start;
  let lastTick = start;
  const buckets = new Map<string, number>();
  return {
    interact(now) {
      lastInteraction = now;
    },
    tick(now, visible, pillar, net) {
      const step = Math.min(Math.max(now - lastTick, 0), MAX_STEP_MS);
      lastTick = now;
      if (!visible || now - lastInteraction > IDLE_MS) return;
      const key = `${pillar}|${net}`;
      buckets.set(key, (buckets.get(key) ?? 0) + step);
    },
    flush() {
      const out = [...buckets.entries()]
        .map(([key, ms]) => {
          const [pillar, net] = key.split('|') as [EventPillar, NetworkState];
          return { pillar, net, seconds: Math.round(ms / 1000) };
        })
        .filter((row) => row.seconds > 0);
      buckets.clear();
      return out;
    },
  };
}

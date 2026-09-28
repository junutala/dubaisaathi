import type { NetworkState } from '@saathi/shared';

/**
 * Whether the phone can reach us, as evidence rather than as the browser's guess (decision 043).
 *
 * `navigator.onLine` says only that a network interface is up: a phone on hotel wifi behind a
 * login page, or on roaming data with no plan, says `true` and reaches nothing. So "online" here
 * means our own server answered within the last few minutes. "Offline" means the phone itself says
 * it has no network, or our server could not be reached on the last attempt. Anything else — no
 * attempt yet, or the last answer too old to trust — is "unknown", and is counted as such rather
 * than guessed either way.
 *
 * Every call Saathi makes to its own server reports here (the question log's sync is the regular
 * one), so there is no separate ping: the evidence is a by-product of work the app already does.
 */

/** How long an answer from our server stands as proof of being online. */
export const ONLINE_FOR_MS = 3 * 60_000;

export interface Reach {
  /** When our server last answered. */
  readonly okAt: number | null;
  /** When a call to our server last failed to get any answer. */
  readonly failedAt: number | null;
}

/** The state, from the evidence and the phone's own flag. Pure, so the rule is testable. */
export function networkState(reach: Reach, browserOnline: boolean, now: number): NetworkState {
  if (!browserOnline) return 'offline';
  const { okAt, failedAt } = reach;
  if (failedAt !== null && (okAt === null || failedAt > okAt)) return 'offline';
  if (okAt !== null && now - okAt <= ONLINE_FOR_MS) return 'online';
  return 'unknown';
}

let reach: Reach = { okAt: null, failedAt: null };
const listeners = new Set<(state: NetworkState) => void>();
let last: NetworkState | null = null;

function browserOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** The state right now. */
export function currentNetwork(now: number = Date.now()): NetworkState {
  return networkState(reach, browserOnline(), now);
}

function announce(): void {
  const state = currentNetwork();
  if (state === last) return;
  last = state;
  for (const listener of listeners) listener(state);
}

/** Called after every attempt to reach our server: `true` if it answered, `false` if not. */
export function reportReach(ok: boolean, now: number = Date.now()): void {
  // The newest report decides, so two reports in one millisecond must not tie: a failure right
  // after a success in the same millisecond once read as online (CI caught it, 28 September).
  const newest = Math.max(reach.okAt ?? -Infinity, reach.failedAt ?? -Infinity);
  const at = Math.max(now, newest + 1);
  reach = ok ? { ...reach, okAt: at } : { ...reach, failedAt: at };
  announce();
}

/** Told whenever the state changes, including when an answer grows too old to count. */
export function onNetworkChange(listener: (state: NetworkState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-reads the phone's flag and the age of the last answer; the caller's timer drives it. */
export function recheckNetwork(): void {
  announce();
}

/** For tests only: forget all evidence. */
export function resetNetworkForTests(): void {
  reach = { okAt: null, failedAt: null };
  last = null;
  listeners.clear();
}

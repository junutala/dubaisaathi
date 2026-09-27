import type {
  AppEvent,
  AppEventName,
  EventPillar,
  NetworkState,
  TaskKind,
  TaskOutcome,
} from '@saathi/shared';
import { db } from '../../db/schema.js';
import { BUILD_SHA } from '../../app/version.js';
import { currentNetwork } from './network.js';

/**
 * The product-intelligence log (decision 043): sessions, time actively used, network changes and
 * tasks, written to the phone first and synced with the question log. Recording never throws and
 * never waits: a phone that cannot store a row loses a statistic, not a screen.
 */

/** Away for longer than this and the next open is a new session. */
export const SESSION_GAP_MS = 30 * 60_000;

const LAST_SEEN = 'saathi.session.lastSeen';
const SESSION = 'saathi.session.id';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* a new session next time rather than a continued one; nothing a traveller sees */
  }
}

/**
 * Whether the gap since the phone was last seen in use starts a new session. Pure, for the test:
 * a first ever open, or a return after SESSION_GAP_MS, is new; anything sooner continues.
 */
export function isNewSession(lastSeen: number | null, now: number): boolean {
  return lastSeen === null || now - lastSeen > SESSION_GAP_MS;
}

let sessionId: string | null = null;

/**
 * The current session, starting a new one when the gap says so. Returns whether it just began, so
 * the caller can record `session_start` exactly once.
 */
export function touchSession(now: number = Date.now()): { id: string; started: boolean } {
  const lastSeen = Number(read(LAST_SEEN) ?? 'NaN');
  const stored = read(SESSION);
  const fresh = isNewSession(Number.isFinite(lastSeen) ? lastSeen : null, now) || stored === null;
  if (fresh) sessionId = crypto.randomUUID();
  else sessionId ??= stored;
  write(SESSION, sessionId);
  write(LAST_SEEN, String(now));
  return { id: sessionId, started: fresh };
}

/** The session in progress, without touching it; null before the first `touchSession`. */
export function currentSessionId(): string | null {
  return sessionId ?? read(SESSION);
}

export interface AppEventInput {
  readonly name: AppEventName;
  readonly pillar?: EventPillar;
  readonly net?: NetworkState;
  readonly taskId?: string;
  readonly taskKind?: TaskKind;
  readonly outcome?: TaskOutcome;
  readonly contentId?: string;
  readonly seconds?: number;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
}

const recorded = new Set<() => void>();

/** Told after a row is stored, so the sync can send it soon rather than at the next launch. */
export function onAppEventRecorded(listener: () => void): () => void {
  recorded.add(listener);
  return () => {
    recorded.delete(listener);
  };
}

export async function recordAppEvent(
  input: AppEventInput,
  now: number = Date.now(),
): Promise<void> {
  const session = sessionId ?? touchSession(now).id;
  const event: AppEvent = {
    id: crypto.randomUUID(),
    sessionId: session,
    at: new Date(now).toISOString(),
    name: input.name,
    net: input.net ?? currentNetwork(now),
    ...(input.pillar === undefined ? {} : { pillar: input.pillar }),
    ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
    ...(input.taskKind === undefined ? {} : { taskKind: input.taskKind }),
    ...(input.outcome === undefined ? {} : { outcome: input.outcome }),
    ...(input.contentId === undefined ? {} : { contentId: input.contentId }),
    ...(input.seconds === undefined ? {} : { seconds: Math.round(input.seconds) }),
    ...(input.meta === undefined ? {} : { meta: input.meta }),
    ...(BUILD_SHA === '' ? {} : { appVersion: BUILD_SHA }),
    synced: false,
  };
  try {
    await db.appEvents.add(event);
    for (const listener of recorded) listener();
  } catch {
    /* storage refused: a statistic lost, never a screen */
  }
}

export async function pendingAppEvents(): Promise<AppEvent[]> {
  // Oldest first, so a batch that stops short leaves the newest waiting rather than a random few.
  return db.appEvents
    .orderBy('at')
    .filter((event) => !event.synced)
    .toArray();
}

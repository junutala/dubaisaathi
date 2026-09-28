import type { AppEvent, VoiceEvent } from '@saathi/shared';
import { db } from '../../db/schema.js';
import { onVoiceEventRecorded, pendingVoiceEvents } from './voiceEvent.js';
import { onAppEventRecorded, pendingAppEvents } from './appEvents.js';
import { reportReach } from './network.js';
import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';
import { deviceId as thisDevice, platform } from '../../lib/device.js';

/**
 * Sending the queue to the server, when the phone happens to have a connection.
 *
 * Everything about this is deliberately unimportant to the traveller. It is never awaited by a
 * screen, it never blocks a tap, and if the server is down or the radio is off the queue simply
 * waits — for a whole trip if it has to (CLAUDE.md, "Learning loop": never blocks the tourist).
 *
 * The phone marks nothing synced on its own. It marks exactly the ids the server said it took,
 * so a lost response costs a duplicate send rather than a lost row — and the server ignores
 * duplicates, because ids are made on the device.
 */

const COLLECT = `${PROJECT_URL}/functions/v1/collect`;

/** The most rows of each log one send carries; the rest go with the next. */
const BATCH = 400;
/** How long one send may take before it counts as no answer. */
const SEND_TIMEOUT_MS = 20_000;

/**
 * What goes on the wire. The device id travels once on the envelope rather than on every row,
 * and `synced` is the phone's own bookkeeping — the server has no use for either.
 */
function wireEvent(event: VoiceEvent | AppEvent): Record<string, unknown> {
  const row: Record<string, unknown> = { ...event };
  delete row.deviceId;
  delete row.synced;
  return row;
}

export interface SyncOutcome {
  readonly sent: number;
  readonly accepted: number;
  /** Why nothing went, when nothing went. Kept so a silent failure is at least a reported one. */
  readonly skipped?: 'offline' | 'failed';
}

export async function syncVoiceEvents(): Promise<SyncOutcome> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { sent: 0, accepted: 0, skipped: 'offline' };
  }

  const pending = (await pendingVoiceEvents()).slice(0, BATCH);
  const pendingApp = (await pendingAppEvents()).slice(0, BATCH);
  // Every phone has its random id from the first open (decision 045), so a phone that only reads
  // menus and never types a search still sends its usage; it once never did.
  const deviceId = pending[0]?.deviceId ?? thisDevice();
  const sent = pending.length + pendingApp.length;

  // A send with nothing queued still goes: it is how the phone learns our server can be reached,
  // which is what "online" means in the product-intelligence log (decision 043).
  const abort = new AbortController();
  const timer = setTimeout(() => {
    abort.abort();
  }, SEND_TIMEOUT_MS);
  try {
    const response = await fetch(COLLECT, {
      method: 'POST',
      headers: supabaseHeaders(),
      keepalive: true,
      signal: abort.signal,
      body: JSON.stringify({
        deviceId,
        platform: platform(),
        events: pending.map(wireEvent),
        appEvents: pendingApp.map(wireEvent),
      }),
    });
    // Any answer at all, even an error, is our server reached.
    reportReach(true);
    if (!response.ok) return { sent, accepted: 0, skipped: 'failed' };

    const body = (await response.json()) as { accepted?: unknown; acceptedApp?: unknown };
    const ids = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
    const accepted = ids(body.accepted);
    const acceptedApp = ids(body.acceptedApp);

    await db.transaction('rw', db.voiceEvents, db.appEvents, async () => {
      for (const id of accepted) await db.voiceEvents.update(id, { synced: true });
      for (const id of acceptedApp) await db.appEvents.update(id, { synced: true });
    });
    return { sent, accepted: accepted.length + acceptedApp.length };
  } catch {
    reportReach(false);
    return { sent, accepted: 0, skipped: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

/** Soon after something is recorded, rather than at the next launch. */
const SOON_MS = 10_000;
/** While the app is open, so events reach the server and "online" stays evidenced. */
const EVERY_MS = 2 * 60_000;

/**
 * When the queue is sent (the owner's own opens were waiting days for a cold start, 27 September:
 * an installed app stays alive in the background, and "on boot" came rarely). Now: on boot, when
 * the phone comes back online, a few seconds after anything is recorded, when the app goes out of
 * view, and every two minutes while it is in view. Never more than one send at a time.
 */
export function startVoiceEventSync(): () => void {
  let running = false;
  let soon: ReturnType<typeof setTimeout> | null = null;
  const attempt = () => {
    if (running) return;
    running = true;
    void syncVoiceEvents().finally(() => {
      running = false;
    });
  };
  const later = () => {
    if (soon !== null) return;
    soon = setTimeout(() => {
      soon = null;
      attempt();
    }, SOON_MS);
  };
  const onVisibility = () => {
    attempt();
  };
  attempt();
  window.addEventListener('online', attempt);
  document.addEventListener('visibilitychange', onVisibility);
  const unrecorded = onAppEventRecorded(later);
  const unvoiced = onVoiceEventRecorded(later);
  const every = setInterval(() => {
    if (document.visibilityState !== 'hidden') attempt();
  }, EVERY_MS);
  return () => {
    window.removeEventListener('online', attempt);
    document.removeEventListener('visibilitychange', onVisibility);
    unrecorded();
    unvoiced();
    clearInterval(every);
    if (soon !== null) clearTimeout(soon);
  };
}

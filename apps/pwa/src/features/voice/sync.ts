import type { VoiceEvent } from '@saathi/shared';
import { db } from '../../db/schema.js';
import { pendingVoiceEvents } from './voiceEvent.js';

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

/**
 * Publishable by design: this key identifies the project, not a person, and it is what every
 * Supabase browser client ships. It grants nothing on its own — RLS is on with no policies, so
 * the tables are unreachable except through the edge function, which holds the service role.
 */
const PROJECT_URL = 'https://pixlnjmpksmfqheotinp.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_kPj5Kv8cbgwrkyp9tRfLRg_Wy4olS5H';

const COLLECT = `${PROJECT_URL}/functions/v1/collect`;

/** Coarse and self-reported, for reading the data by platform. Never a fingerprint. */
function platform(): 'android' | 'ios' | 'other' {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios';
  return 'other';
}

/**
 * What goes on the wire. The device id travels once on the envelope rather than on every row,
 * and `synced` is the phone's own bookkeeping — the server has no use for either.
 */
function wireEvent(event: VoiceEvent): Record<string, unknown> {
  const row: Record<string, unknown> = { ...event };
  delete row.deviceId;
  delete row.synced;
  return row;
}

export interface SyncOutcome {
  readonly sent: number;
  readonly accepted: number;
  /** Why nothing went, when nothing went. Kept so a silent failure is at least a reported one. */
  readonly skipped?: 'offline' | 'nothing-queued' | 'failed';
}

export async function syncVoiceEvents(): Promise<SyncOutcome> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { sent: 0, accepted: 0, skipped: 'offline' };
  }

  const pending = await pendingVoiceEvents();
  const deviceId = pending[0]?.deviceId ?? localStorage.getItem('saathi.deviceId');
  if (deviceId === null) return { sent: 0, accepted: 0, skipped: 'nothing-queued' };

  try {
    const response = await fetch(COLLECT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${PUBLISHABLE_KEY}`,
        apikey: PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        deviceId,
        platform: platform(),
        events: pending.map(wireEvent),
      }),
    });
    if (!response.ok) return { sent: pending.length, accepted: 0, skipped: 'failed' };

    const body = (await response.json()) as { accepted?: unknown };
    const accepted = Array.isArray(body.accepted)
      ? body.accepted.filter((id): id is string => typeof id === 'string')
      : [];

    // Only what the server said it holds. Anything else stays queued and goes again next time.
    await db.transaction('rw', db.voiceEvents, async () => {
      for (const id of accepted) await db.voiceEvents.update(id, { synced: true });
    });
    return { sent: pending.length, accepted: accepted.length };
  } catch {
    // A dead radio mid-flight, a blocked host, a proxy. None of it is the traveller's problem.
    return { sent: pending.length, accepted: 0, skipped: 'failed' };
  }
}

/**
 * Try once on boot, and again whenever the phone says it is back online. No timer and no
 * retry loop: a traveller opens this app several times a day, and each open is an attempt.
 */
export function startVoiceEventSync(): () => void {
  const attempt = () => {
    void syncVoiceEvents();
  };
  attempt();
  window.addEventListener('online', attempt);
  return () => {
    window.removeEventListener('online', attempt);
  };
}

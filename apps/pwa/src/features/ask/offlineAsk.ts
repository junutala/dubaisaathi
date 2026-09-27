import { useEffect, useState } from 'react';
import { currentSessionId, recordAppEvent } from './appEvents.js';
import { currentNetwork } from './network.js';
import { dubaiDay } from './usage.js';

/**
 * The one question the app asks a traveller (decision 043, the owner, 27 September: "a fair
 * ask"): after a stretch with no signal, why there was none. The log can tell no-signal from
 * signal; it cannot tell a metro tunnel from data kept off to save roaming, and those are two
 * different needs. One tap answers it, one tap dismisses it, and it is asked at most once a Dubai
 * day — on घर only, where there is no task to interrupt. Never a wall.
 */

export const OFFLINE_ANSWERS = ['no_signal', 'data_off', 'skipped'] as const;
export type OfflineAnswer = (typeof OFFLINE_ANSWERS)[number];

const OFFLINE_SESSION = 'saathi.offlineAsk.session';
const ASKED_DAY = 'saathi.offlineAsk.day';

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
    /* asked again tomorrow at worst */
  }
}

const listeners = new Set<() => void>();
function changed(): void {
  for (const listener of listeners) listener();
}

/** The session in which the phone was confirmed offline; from `startProductIntelligence`. */
export function noteOfflineSession(sessionId: string): void {
  if (read(OFFLINE_SESSION) === sessionId) return;
  write(OFFLINE_SESSION, sessionId);
  changed();
}

/**
 * Pure, for the test: the question is due when this session went without a signal and today has
 * not been asked already. Answering or dismissing both count as asked.
 */
export function offlineAskDue(
  offlineSession: string | null,
  sessionId: string | null,
  askedDay: string | null,
  today: string,
): boolean {
  return offlineSession !== null && offlineSession === sessionId && askedDay !== today;
}

export function isOfflineAskDue(sessionId: string | null, now: number = Date.now()): boolean {
  return offlineAskDue(read(OFFLINE_SESSION), sessionId, read(ASKED_DAY), dubaiDay(new Date(now)));
}

export async function answerOfflineAsk(
  answer: OfflineAnswer,
  now: number = Date.now(),
): Promise<void> {
  write(ASKED_DAY, dubaiDay(new Date(now)));
  changed();
  await recordAppEvent(
    { name: 'offline_answer', pillar: 'home', net: currentNetwork(now), meta: { answer } },
    now,
  );
}

/** Whether घर should carry the question now; follows the signal and the answer as they change. */
export function useOfflineAsk(): boolean {
  const [due, setDue] = useState(() => isOfflineAskDue(currentSessionId()));
  useEffect(() => {
    const update = (): void => {
      setDue(isOfflineAskDue(currentSessionId()));
    };
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return due;
}

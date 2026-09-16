import type { OpeningHours } from '@saathi/shared';

/**
 * Is it open, right now, in Dubai — on a phone with no network?
 *
 * The one question worth the trouble of collecting structured hours instead of free text. A
 * close earlier than the open means past midnight — 06:00 to 02:00 — and those are exactly the
 * places the owner insisted we keep: Dubai does not sleep, the late kitchens have no web
 * presence, and a traveller at 2am is the moment this app earns being told to a friend.
 *
 * The clock is Dubai's, never the phone's (owner, 16 September). A traveller testing from
 * India, or a phone that never left Indian time, must still be told whether a kitchen in Karama
 * is open now, and "now" for a kitchen in Karama is Gulf time.
 */
export const DUBAI_TIME_ZONE = 'Asia/Dubai';

/** Minutes since midnight in Dubai, for the instant given. */
export function dubaiMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DUBAI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return read('hour') * 60 + read('minute');
}

function minutesOf(hhmm: string): number | undefined {
  const [h, m] = hhmm.split(':');
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  return hour * 60 + minute;
}

export interface OpenState {
  readonly open: boolean;
  /** When it closes if open, when it opens if closed — "HH:MM" in Dubai time. Absent for 24h. */
  readonly next?: string;
}

/**
 * Open or closed, and the one time worth showing next to it: the closing time while it is open,
 * the opening time while it is closed (owner, 16 September). `undefined` when nobody asked.
 */
export function openState(
  hours: OpeningHours | undefined,
  now = new Date(),
): OpenState | undefined {
  if (hours === undefined) return undefined;
  if (hours.open24 === true) return { open: true };
  const day = hours.everyDay;
  if (day === undefined) return undefined;

  const opens = minutesOf(day.opens);
  const closes = minutesOf(day.closes);
  if (opens === undefined || closes === undefined) return undefined;

  const at = dubaiMinutes(now);
  // A kitchen that closes after it opens keeps to one day; one that closes before it opens is
  // running past midnight, so the open window is the two ends of the clock rather than the middle.
  const open = closes > opens ? at >= opens && at < closes : at >= opens || at < closes;
  return { open, next: open ? day.closes : day.opens };
}

export function isOpenNow(hours: OpeningHours | undefined, now = new Date()): boolean | undefined {
  return openState(hours, now)?.open;
}

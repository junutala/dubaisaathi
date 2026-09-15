import type { OpeningHours } from '@saathi/shared';

/**
 * Is it open, right now, on a phone with no network?
 *
 * The one question worth the trouble of collecting structured hours instead of free text. A
 * close earlier than the open means past midnight — 06:00 to 02:00 — and those are exactly the
 * places the owner insisted we keep: Dubai does not sleep, the late kitchens have no web
 * presence, and a traveller at 2am is the moment this app earns being told to a friend.
 *
 * Local time is the phone's own, which in Dubai is Gulf time and in India is not. That is not a
 * defect worth correcting here: someone testing from India wants the hours read against the
 * clock they are holding, and someone in Dubai is on Dubai time already.
 */
export function isOpenNow(hours: OpeningHours | undefined, now = new Date()): boolean | undefined {
  if (hours === undefined) return undefined;
  if (hours.open24 === true) return true;
  const day = hours.everyDay;
  if (day === undefined) return undefined;

  const minutes = (hhmm: string): number | undefined => {
    const [h, m] = hhmm.split(':');
    const hour = Number(h);
    const minute = Number(m);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
    return hour * 60 + minute;
  };

  const opens = minutes(day.opens);
  const closes = minutes(day.closes);
  if (opens === undefined || closes === undefined) return undefined;

  const at = now.getHours() * 60 + now.getMinutes();
  // A kitchen that closes after it opens keeps to one day; one that closes before it opens is
  // running past midnight, so the open window is the two ends of the clock rather than the middle.
  return closes > opens ? at >= opens && at < closes : at >= opens || at < closes;
}

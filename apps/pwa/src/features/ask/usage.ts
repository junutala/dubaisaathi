import type { LatLng } from '@saathi/shared';
import { insideDubai } from '../../lib/dubai.js';
import { currentLocation } from '../../lib/location.js';
import { recordVoiceEvent, type Region } from './voiceEvent.js';

/**
 * How Saathi is used, recorded for the owner and never shown to the traveller (the owner,
 * 25 September: "a tool for marketing, not for selling", and "do not clutter the customer app").
 *
 * Success is measured in travellers helped, and the proof is use: phones that come back day after
 * day, the share of use with no signal at all (our one promise), what they opened, and how many
 * came to us through someone else. Each is one row in the same question log, through the same
 * `collect` door, keyed to the device id only — no name, no number, no IP (decision 011). Nothing
 * here blocks a screen: a row is written to the phone and sent whenever there is a signal.
 */

/** What a usage row says happened. `landed_on` on the server. */
export type UsageEvent = 'opened' | 'arrived' | 'menu' | 'steps' | 'map' | 'topic' | 'place';

const OPENED_ON = 'saathi.usage.openedOn';
const ARRIVED = 'saathi.usage.arrived';

/** One usage row. `subject` is what was opened — an outlet, a place, a topic — never a person. */
export function recordUsage(
  what: UsageEvent,
  subject = '',
  where?: { readonly region: Region; readonly installed: boolean },
): void {
  void recordVoiceEvent({
    transcript: subject,
    intent: 'use',
    confidence: 1,
    landedOn: what,
    sttEngine: 'usage',
    sttModel: 'v1',
    ...where,
  }).catch(() => undefined);
}

/** A rough box around India — enough to tell Kochi from Karama, never a position. */
function inIndia(at: LatLng): boolean {
  return at.lat > 6 && at.lat < 36.5 && at.lng > 68 && at.lng < 97.5;
}

/**
 * Which country the phone is using Saathi from, and nothing finer (the owner, 25 September:
 * "users testing in India, users in Dubai"). A fix the app already holds decides it — Saathi never
 * asks for location for this — and without one, the phone's own time zone. Only the bucket is
 * kept; no coordinate is ever recorded (0004: "I do not want to know if and where Arun went").
 */
export function regionNow(): Region {
  const location = currentLocation();
  if (location.kind === 'here') {
    if (insideDubai(location.at)) return 'dubai';
    return inIndia(location.at) ? 'india' : 'elsewhere';
  }
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === 'Asia/Dubai') return 'dubai';
    if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'india';
    return zone === '' ? 'unknown' : 'elsewhere';
  } catch {
    return 'unknown';
  }
}

/** Opened from the home screen as an installed app, rather than in a browser tab. */
export function openedInstalled(): boolean {
  try {
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return standalone || window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** Today's date in Dubai, so a day of use is a Dubai day wherever the phone's clock is set. */
export function dubaiDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(now);
}

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
    /* a phone that will not keep it records the day again; the server counts days, not rows */
  }
}

/**
 * How this phone came to us, read once from the address it was first opened at: `?via=` on a
 * link or a QR (the website, a counter card, an agent's list), a family pass handed over by QR,
 * or nobody — typed in or found. Only letters, digits and hyphens are kept.
 */
export function arrivalSource(url: URL): string {
  const via = (url.searchParams.get('via') ?? '').toLowerCase();
  if (/^[a-z0-9-]{1,40}$/.test(via)) return via;
  if (url.hash.startsWith('#/pass/')) return 'family-pass';
  return 'direct';
}

/**
 * On launch and whenever the app comes back into view: the first open ever says how the phone
 * arrived, and the first open of each Dubai day says it was used that day.
 */
export function startUsageRecording(): () => void {
  const mark = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (read(ARRIVED) === null) {
      write(ARRIVED, '1');
      recordUsage('arrived', arrivalSource(new URL(window.location.href)), {
        region: regionNow(),
        installed: openedInstalled(),
      });
    }
    const today = dubaiDay();
    if (read(OPENED_ON) !== today) {
      write(OPENED_ON, today);
      recordUsage('opened', today, { region: regionNow(), installed: openedInstalled() });
    }
  };
  mark();
  document.addEventListener('visibilitychange', mark);
  return () => {
    document.removeEventListener('visibilitychange', mark);
  };
}

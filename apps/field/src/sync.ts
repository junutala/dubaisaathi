import { asDataUrl } from './dataUrl.js';
import { db, type Photo, type QueuedReport } from './db.js';

/**
 * Sending a report to the server, whenever the phone has a connection.
 *
 * Nothing here is in the collector's way. It runs on submit, on boot and when the phone says it
 * is back online; a failure leaves the report exactly where it was and it goes again next time.
 * The phone marks a report uploaded only when the server says it holds it — a lost response
 * costs a duplicate send, which the server ignores, and never a lost visit.
 */

const PROJECT_URL = 'https://pixlnjmpksmfqheotinp.supabase.co';
/** Publishable by design: it identifies the project, not a person, and grants nothing on its own. */
const PUBLISHABLE_KEY = 'sb_publishable_kPj5Kv8cbgwrkyp9tRfLRg_Wy4olS5H';
export const ENDPOINT = `${PROJECT_URL}/functions/v1/outlet`;

/** The same two headers every call to the function needs. One definition, not two. */
export function outletHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${PUBLISHABLE_KEY}`,
    apikey: PUBLISHABLE_KEY,
  };
}

interface SentPhoto {
  readonly kind: string;
  readonly dataUrl: string;
  readonly ord: number;
}

/**
 * About 4 MB of base64 per request. Photographs go as base64 beside the report, and a short menu
 * is one request as it always was; a 24-page menu (form 0002, 23 September) is several, so no
 * single request is one a hotel's wifi or the function's gateway will refuse for its size.
 */
export const BATCH_CHARS = 4_000_000;

/**
 * Each photograph with its page: its place in the report's own list, not its place in the table.
 * Ids sort as strings, so page 10 came before page 2, and a menu read out of order is a menu with
 * prices under the wrong dishes.
 */
function pageOf(report: QueuedReport, photo: Photo, fallback: number): number {
  const list = photo.kind === 'front' ? report.frontPhotoIds : report.menuPhotoIds;
  const at = list.indexOf(photo.id);
  return at >= 0 ? at : fallback;
}

export function batches(photos: readonly SentPhoto[], budget = BATCH_CHARS): SentPhoto[][] {
  const out: SentPhoto[][] = [];
  let current: SentPhoto[] = [];
  let size = 0;
  for (const photo of photos) {
    if (current.length > 0 && size + photo.dataUrl.length > budget) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(photo);
    size += photo.dataUrl.length;
  }
  // A report with no photographs is still one request: the report itself.
  out.push(current);
  return out;
}

export interface SyncOutcome {
  readonly pending: number;
  readonly sent: number;
  readonly skipped?: 'offline' | 'failed';
}

export async function syncReports(): Promise<SyncOutcome> {
  const waiting = await db.reports.filter((report) => !report.uploaded).toArray();
  if (waiting.length === 0) return { pending: 0, sent: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { pending: waiting.length, sent: 0, skipped: 'offline' };
  }

  let sent = 0;
  for (const report of waiting) {
    if (await sendOne(report)) sent += 1;
  }
  const left = await db.reports.filter((report) => !report.uploaded).count();
  return { pending: left, sent, ...(sent === 0 ? { skipped: 'failed' as const } : {}) };
}

async function sendOne(report: QueuedReport): Promise<boolean> {
  try {
    const held = await db.photos.where('reportId').equals(report.id).toArray();
    const counted = { front: 0, menu: 0 };
    const photos: SentPhoto[] = [];
    for (const photo of held) {
      const ord = pageOf(report, photo, 1000 + counted[photo.kind]);
      counted[photo.kind] += 1;
      photos.push({ kind: photo.kind, dataUrl: await asDataUrl(photo.bytes), ord });
    }
    photos.sort((a, b) => a.ord - b.ord);
    // Every batch carries the report, so each request stands alone; the server keys each
    // photograph by its page, so sending a batch twice after a lost response stores it once.
    for (const batch of batches(photos)) {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: outletHeaders(),
        body: JSON.stringify({ report: { ...report, uploaded: undefined }, photos: batch }),
      });
      if (!response.ok) return false;
    }
    await db.reports.update(report.id, { uploaded: true });
    return true;
  } catch {
    // A dead radio, a proxy, a basement. The report stays queued and goes again.
    return false;
  }
}

/** One attempt now, and another whenever the phone comes back. */
export function startSync(onChange: (outcome: SyncOutcome) => void): () => void {
  const attempt = () => {
    void syncReports().then(onChange);
  };
  attempt();
  window.addEventListener('online', attempt);
  return () => {
    window.removeEventListener('online', attempt);
  };
}

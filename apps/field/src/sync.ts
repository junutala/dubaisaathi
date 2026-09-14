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
const ENDPOINT = `${PROJECT_URL}/functions/v1/outlet`;

/** Photographs go as base64 in the same request: one visit, one round trip, one thing to fail. */
async function encodePhoto(photo: Photo): Promise<{ kind: string; dataUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // readAsDataURL always yields a string; the union is there for the other read methods.
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('the photograph did not read as a data URL'));
    };
    reader.onerror = () => {
      reject(new Error('could not read the photograph'));
    };
    reader.readAsDataURL(photo.bytes);
  });
  return { kind: photo.kind, dataUrl };
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
    const photos = await db.photos.where('reportId').equals(report.id).toArray();
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${PUBLISHABLE_KEY}`,
        apikey: PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        report: { ...report, uploaded: undefined },
        photos: await Promise.all(photos.map(encodePhoto)),
      }),
    });
    if (!response.ok) return false;
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

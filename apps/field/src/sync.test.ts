import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldReport } from '@saathi/shared';
import { cloneKeepingBlobs } from './blobHarness.js';
import { db } from './db.js';
import { syncReports } from './sync.js';

/**
 * A collector's morning, and the one way it can be destroyed.
 *
 * The report is written to the phone before anything is sent, and marked uploaded only when the
 * server says it holds it. Marking it any earlier loses a visit for ever: nobody can reproduce a
 * conversation with a cook in Meena Bazaar, and the collector will not know it went missing
 * until the outlet never appears in the app.
 */

const REPORT: FieldReport & { uploaded: boolean } = {
  id: '11111111-2222-4333-8444-555555555555',
  kind: 'restaurant',
  collectorId: 'Ravi',
  capturedAt: '2026-09-15T09:00:00.000Z',
  location: { lat: 25.2548, lng: 55.3043 },
  name: 'Kerala Mess',
  kitchen: 'mixed',
  dietary: {
    jain: 'on-request',
    vrat: false,
    sattvik: false,
    noOnionGarlic: 'on-request',
    eggless: false,
  },
  frontPhotoIds: ['front-1'],
  menuPhotoIds: [],
  status: 'queued',
  uploaded: false,
};

const online = (yes: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: yes, configurable: true });
};

beforeEach(async () => {
  // Without this the harness stores photographs and keeps none of them — see blobHarness.ts.
  vi.stubGlobal('structuredClone', cloneKeepingBlobs);
  await db.delete();
  await db.open();
  online(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function queueOne() {
  await db.reports.add(REPORT);
  await db.photos.add({
    id: 'front-1',
    reportId: REPORT.id,
    kind: 'front',
    bytes: new Blob(['a shopfront'], { type: 'image/jpeg' }),
  });
}

describe('a visit on its way to the server', () => {
  it('marks it uploaded only when the server took it', async () => {
    await queueOne();
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 200 })));

    expect(await syncReports()).toMatchObject({ pending: 0, sent: 1 });
    expect((await db.reports.get(REPORT.id))?.uploaded).toBe(true);
  });

  /** The failure that loses a morning. Asserted hardest. */
  it('keeps it queued when the server errors', async () => {
    await queueOne();
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('no', { status: 500 })));

    expect(await syncReports()).toMatchObject({ pending: 1, sent: 0, skipped: 'failed' });
    expect((await db.reports.get(REPORT.id))?.uploaded).toBe(false);
  });

  it('keeps it queued when the radio dies mid-upload', async () => {
    await queueOne();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('network')));

    expect(await syncReports()).toMatchObject({ pending: 1, sent: 0 });
    expect((await db.reports.get(REPORT.id))?.uploaded).toBe(false);
  });

  /** A basement in Deira is the normal case, not the edge case. */
  it('does not reach for the network at all when the phone is offline', async () => {
    await queueOne();
    const fetched = vi.fn();
    vi.stubGlobal('fetch', fetched);
    online(false);

    expect(await syncReports()).toMatchObject({ pending: 1, sent: 0, skipped: 'offline' });
    expect(fetched).not.toHaveBeenCalled();
  });

  it('sends the photographs with the visit they belong to', async () => {
    await queueOne();
    let body = '';
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      body = init.body as string;
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    await syncReports();
    const sent = JSON.parse(body) as { photos: { kind: string; dataUrl: string }[] };
    expect(sent.photos).toHaveLength(1);
    expect(sent.photos[0]?.kind).toBe('front');
    expect(sent.photos[0]?.dataUrl.startsWith('data:')).toBe(true);
  });

  it('never sends the same visit twice', async () => {
    await queueOne();
    let calls = 0;
    vi.stubGlobal('fetch', () => {
      calls += 1;
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    await syncReports();
    await syncReports();
    expect(calls).toBe(1);
  });
});

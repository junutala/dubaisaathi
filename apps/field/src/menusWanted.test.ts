import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneKeepingBlobs } from './blobHarness.js';
import { db } from './db.js';
import { metresBetween, normalSerial, sendPages } from './menusWanted.js';

/**
 * Menus wanted (27 September). What must hold: a page he photographed stays on the phone until the
 * server says the form holds it — a shop in Karama with no signal must not cost him the page.
 */

describe('the list', () => {
  it('measures a Karama street in metres', () => {
    // 0028 and 0029 were pinned about 55 m apart on 25 September.
    const d = metresBetween({ lat: 25.25342, lng: 55.30513 }, { lat: 25.25315, lng: 55.30558 });
    expect(d).toBeGreaterThan(45);
    expect(d).toBeLessThan(60);
  });
});

describe('pages for a form', () => {
  beforeEach(async () => {
    vi.stubGlobal('structuredClone', cloneKeepingBlobs);
    await db.wantedPages.clear();
    await db.wantedPages.bulkAdd([
      {
        id: '11111111-2222-4333-8444-000000000001',
        formSerial: '0027',
        bytes: new Blob(['page one'], { type: 'image/jpeg' }),
        takenAt: '2026-09-27T10:00:00.000Z',
      },
      {
        id: '11111111-2222-4333-8444-000000000002',
        formSerial: '0027',
        bytes: new Blob(['page two'], { type: 'image/jpeg' }),
        takenAt: '2026-09-27T10:00:01.000Z',
      },
    ]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends each page to its form and lets it go only when the server holds it', async () => {
    const sent: string[] = [];
    let held = 0;
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      sent.push(url);
      const body = JSON.parse(init.body as string) as { photos: { id: string }[] };
      expect(body.photos).toHaveLength(1);
      held += 1;
      return Promise.resolve(new Response(JSON.stringify({ form: '0027', pages: held })));
    });
    const outcome = await sendPages('0027');
    expect(outcome).toEqual({ ok: true, pages: 2 });
    expect(sent.every((url) => url.endsWith('?pages=0027'))).toBe(true);
    expect(await db.wantedPages.count()).toBe(0);
  });

  it('sends each page once when two sends start together', async () => {
    const ids: string[] = [];
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { photos: { id: string }[] };
      ids.push(body.photos[0]?.id ?? '');
      return Promise.resolve(new Response(JSON.stringify({ form: '0027', pages: ids.length })));
    });
    // Two photographs taken in quick succession each start a send.
    await Promise.all([sendPages('0027'), sendPages('0027')]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(await db.wantedPages.count()).toBe(0);
  });

  it('keeps every page when there is no signal', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    const outcome = await sendPages('0027');
    expect(outcome).toEqual({ ok: false, why: 'no connection' });
    expect(await db.wantedPages.count()).toBe(2);
  });

  it('gives up on a page that hangs, keeps it, and does not hold back the next send', async () => {
    // 27 September: an upload hung on a dropped signal and 0049's pages never left the phone.
    vi.stubGlobal('fetch', () => new Promise<Response>(() => undefined));
    const outcome = await sendPages('0027', 20);
    expect(outcome).toEqual({ ok: false, why: 'no connection' });
    expect(await db.wantedPages.count()).toBe(2);

    // The signal is back: the next send is not stuck behind the one that hung.
    let held = 0;
    vi.stubGlobal('fetch', () => {
      held += 1;
      return Promise.resolve(new Response(JSON.stringify({ form: '0027', pages: held })));
    });
    expect(await sendPages('0027', 20)).toEqual({ ok: true, pages: 2 });
    expect(await db.wantedPages.count()).toBe(0);
  });

  it('keeps the pages the server refused', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 502 })));
    const outcome = await sendPages('0027');
    expect(outcome.ok).toBe(false);
    expect(await db.wantedPages.count()).toBe(2);
  });
});

describe('normalSerial', () => {
  it('reads a form number as the paper prints it', () => {
    expect(normalSerial('81')).toBe('0081');
    expect(normalSerial(' 0081 ')).toBe('0081');
    expect(normalSerial('swades')).toBe('swades');
  });
});

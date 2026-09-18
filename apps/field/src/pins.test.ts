import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db.js';
import { waitingPins } from './pins.js';

/**
 * The list the long form opens on (decision 029). What matters is that a pin dropped a minute ago
 * on this phone is in it — the owner pins a door and fills the form standing there, often on a
 * street with no signal, and a list that only knows what the server knows would be empty exactly
 * when he needs it.
 */

async function pin(id: string, serial: string, extra: Record<string, unknown> = {}) {
  await db.reports.add({
    id,
    kind: 'restaurant',
    collectorId: 'arun',
    capturedAt: '2026-09-18T10:00:00.000Z',
    location: { lat: 25.2582, lng: 55.2979 },
    name: '',
    formSerial: serial,
    frontPhotoIds: [],
    menuPhotoIds: [],
    status: 'queued',
    uploaded: false,
    ...extra,
  });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('no signal'))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the pins waiting for their paper', () => {
  it('lists one this phone took, with no server involved', async () => {
    await pin('a', '0007');
    const waiting = await waitingPins();
    expect(waiting.map((one) => one.formSerial)).toEqual(['0007']);
    expect(waiting[0]?.lat).toBe(25.2582);
  });

  it('still lists a pin whose photograph will not read', async () => {
    // A frontage is how paper is matched to a shop, and it is never the pin: the pin is the fix
    // and the number. An unreadable blob — an old WebView, a shape the browser will not take
    // back — must cost the picture and not the row.
    await pin('a', '0007');
    await db.photos.add({
      id: 'a-front',
      reportId: 'a',
      kind: 'front',
      bytes: new Blob(['shopfront'], { type: 'image/jpeg' }),
    });
    const waiting = await waitingPins();
    expect(waiting).toHaveLength(1);
    expect(waiting[0]?.formSerial).toBe('0007');
  });

  it('drops one whose paper has been keyed in', async () => {
    // A kitchen kind is what the long form writes and a pin never has: it is what "filled" means.
    await pin('a', '0007', { kitchen: 'pure-veg', name: 'Veg World' });
    expect(await waitingPins()).toEqual([]);
  });

  it('ignores a full capture that never had a form number', async () => {
    await db.reports.add({
      id: 'b',
      kind: 'restaurant',
      collectorId: 'arun',
      capturedAt: '2026-09-18T10:00:00.000Z',
      location: { lat: 25.2, lng: 55.2 },
      name: 'Madhura',
      frontPhotoIds: [],
      menuPhotoIds: [],
      status: 'queued',
      uploaded: false,
    });
    expect(await waitingPins()).toEqual([]);
  });

  it('prefers this phone’s own copy over the server’s of the same pin', async () => {
    await pin('a', '0007');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              pins: [
                {
                  id: 'a',
                  formSerial: 'stale',
                  lat: 0,
                  lng: 0,
                  capturedAt: '2026-09-18T10:00:00.000Z',
                  collector: 'arun',
                  front: null,
                },
                {
                  id: 'c',
                  formSerial: '0042',
                  lat: 25.26,
                  lng: 55.3,
                  capturedAt: '2026-09-18T09:00:00.000Z',
                  collector: 'chand',
                  front: null,
                },
              ],
            }),
        }),
      ),
    );
    const waiting = await waitingPins();
    // Somebody else's pin as well as this phone's, oldest first, and no duplicate of 'a'.
    expect(waiting.map((one) => one.formSerial)).toEqual(['0042', '0007']);
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema.js';
import { forgetPacks, loadPacks, packBody } from './packs.js';
import { forgetOutlets, outlets, outletsAreFixture } from '../food/outlets.js';
import { attractions, forgetAttractions } from '../know/attractions.js';

/**
 * What the features read, and in which order (decision 030): the pack this phone downloaded, then
 * the copy compiled into this build. The second half is what keeps a first launch — and a launch
 * with the radio off — working exactly as it did before any of this existed.
 */

beforeEach(async () => {
  await db.delete();
  await db.open();
  forgetPacks();
  forgetOutlets();
  forgetAttractions();
});

afterEach(() => {
  forgetPacks();
  forgetOutlets();
  forgetAttractions();
});

async function store(id: string, body: unknown, version = 2) {
  await db.packs.put({
    id,
    version,
    publishedAt: '2026-09-19T06:00:00.000Z',
    sha: '',
    downloadedAt: '2026-09-19T06:05:00.000Z',
    body,
  });
  forgetPacks();
  await loadPacks();
  forgetOutlets();
  forgetAttractions();
}

describe('a phone that has downloaded nothing', () => {
  it('reads the copies in this build, as it always did', async () => {
    await loadPacks();
    expect(packBody('restaurants')).toBeUndefined();
    expect(outlets().length).toBeGreaterThan(0);
    expect(attractions().length).toBeGreaterThan(0);
  });
});

describe('a phone that has downloaded a pack', () => {
  it('serves the collected outlets over the fixture, with no new build', async () => {
    await store('restaurants', {
      status: 'collected',
      restaurants: [
        {
          id: 'veg-world',
          name: { en: 'Veg World', hi: 'वेज वर्ल्ड' },
          location: { lat: 25.2456, lng: 55.3034 },
          kitchen: 'pure-veg',
          tags: ['vegetarian'],
        },
      ],
    });
    expect(outlets().map((one) => one.id)).toEqual(['veg-world']);
    // And खाना stops saying these are places nobody has visited.
    expect(outletsAreFixture()).toBe(false);
  });

  it('keeps the build’s copy when the downloaded one has nothing in it', async () => {
    // An empty pack published by mistake must not empty a traveller's खाना.
    await store('restaurants', { status: 'collected', restaurants: [] });
    expect(outlets().length).toBeGreaterThan(0);
  });

  it('drops a row it cannot read rather than the whole pack', async () => {
    await store('attractions', {
      attractions: [
        { placeId: 'not-a-place-we-know', category: 'landmark' },
        { placeId: 'burj-khalifa', category: 'not-a-category' },
      ],
    });
    // Both rows are unreadable, so जानना falls back to what this build ships rather than to
    // an empty screen.
    expect(attractions().length).toBeGreaterThan(0);
  });
});

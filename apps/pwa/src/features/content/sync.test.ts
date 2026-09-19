import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema.js';
import { forgetPacks, loadPacks, packBody, packVersions } from './packs.js';
import { syncPacks } from './sync.js';

/**
 * Content arriving without a release (decision 030).
 *
 * What is checked here is what would cost a traveller something if it were wrong: a pack going
 * backwards, a damaged body being stored, a failed round taking away what the phone already had.
 * A missing pack is never an error — the copy compiled into the build answers for it.
 */

const RESTAURANTS = { restaurants: [{ id: 'veg-world' }], status: 'collected' };

async function digestOf(body: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The server, answering the manifest and one pack body. */
function serving(packs: { id: string; version: number; sha: string }[], body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const asked = new URL(url);
      const id = asked.searchParams.get('id');
      if (id === null) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              packs: packs.map((pack) => ({
                ...pack,
                publishedAt: '2026-09-19T06:00:00Z',
                bytes: 12,
              })),
            }),
        });
      }
      const found = packs.find((pack) => pack.id === id);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id,
            version: found?.version ?? 1,
            publishedAt: '2026-09-19T06:00:00Z',
            sha: found?.sha ?? '',
            body,
          }),
      });
    }),
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  forgetPacks();
  vi.stubGlobal('navigator', { onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bringing content down', () => {
  it('stores a pack the phone does not have, and reads it at the next launch', async () => {
    const sha = await digestOf(RESTAURANTS);
    serving([{ id: 'restaurants', version: 3, sha }], RESTAURANTS);

    expect((await syncPacks()).downloaded).toEqual(['restaurants']);
    // Not before the next launch: what is stored is picked up when the app next loads packs,
    // so a traveller reading a menu never has it change under them.
    forgetPacks();
    await loadPacks();
    expect(packVersions().restaurants).toBe(3);
    expect(packBody('restaurants')).toEqual(RESTAURANTS);
  });

  it('never walks a phone backwards', async () => {
    const sha = await digestOf(RESTAURANTS);
    serving([{ id: 'restaurants', version: 3, sha }], RESTAURANTS);
    await syncPacks();

    // Somebody republishes an older pack by mistake. The phone keeps what it has.
    serving([{ id: 'restaurants', version: 2, sha }], { restaurants: [] });
    expect((await syncPacks()).downloaded).toEqual([]);
    expect((await db.packs.get('restaurants'))?.version).toBe(3);
  });

  it('refuses a body that does not match the digest it was published with', async () => {
    // A truncated pack that still parses is the dangerous one: it would quietly remove outlets.
    serving([{ id: 'restaurants', version: 4, sha: 'a'.repeat(64) }], { restaurants: [] });
    expect((await syncPacks()).downloaded).toEqual([]);
    expect(await db.packs.get('restaurants')).toBeUndefined();
  });

  it('leaves the phone exactly as it was when there is no signal', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const calls = vi.fn();
    vi.stubGlobal('fetch', calls);
    expect(await syncPacks()).toEqual({ checked: false, downloaded: [] });
    expect(calls).not.toHaveBeenCalled();
  });

  it('is quiet when the server cannot answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('down'))),
    );
    expect(await syncPacks()).toEqual({ checked: false, downloaded: [] });
  });

  it('ignores a pack name this build does not know', async () => {
    serving([{ id: 'weather', version: 1, sha: '' }], { anything: true });
    expect((await syncPacks()).downloaded).toEqual([]);
  });
});

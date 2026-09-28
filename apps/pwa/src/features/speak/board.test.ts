import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBoard, scaledSize } from './board.js';

/**
 * घर.7's reader: the photograph drawn small before it leaves the phone, and every ending of the
 * `readboard` call turned into a value the screen has one line for.
 */

const PHOTO = { data: 'AAAA', type: 'image/jpeg' as const };

function answer(status: number, body: unknown) {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shrinking the photograph', () => {
  it('brings the long edge down to 1600 and keeps the shape', () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small photograph', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('reading a board', () => {
  it('returns the Arabic read and the Hindi given', async () => {
    answer(200, { arabic: 'ممنوع الوقوف', hindi: 'यहाँ गाड़ी खड़ी करना मना है' });
    expect(await readBoard(PHOTO)).toEqual({
      kind: 'read',
      arabic: 'ممنوع الوقوف',
      hindi: 'यहाँ गाड़ी खड़ी करना मना है',
    });
  });

  it('says so when the photograph had no Arabic it could read', async () => {
    answer(200, { arabic: '', hindi: '' });
    expect(await readBoard(PHOTO)).toEqual({ kind: 'none' });
  });

  it('tells a reader that is not switched on apart from a failure', async () => {
    answer(503, { error: 'reading is not configured' });
    expect(await readBoard(PHOTO)).toEqual({ kind: 'refused', reason: 'not-configured' });
    answer(429, { error: 'busy' });
    expect(await readBoard(PHOTO)).toEqual({ kind: 'refused', reason: 'busy' });
    answer(502, { error: 'reading failed' });
    expect(await readBoard(PHOTO)).toEqual({ kind: 'failed' });
  });

  it('never throws when the network does', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('network')));
    expect(await readBoard(PHOTO)).toEqual({ kind: 'failed' });
  });

  it('does not try without a signal', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(await readBoard(PHOTO)).toEqual({ kind: 'offline' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

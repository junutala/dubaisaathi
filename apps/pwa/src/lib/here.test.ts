import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SavedHotel } from '../features/info/index.js';

/**
 * Where "from" is, and — the part that was wrong until 19 September — whether it stays the same
 * thing from one launch to the next.
 *
 * The strip never asks for location, so before any pillar had asked it knew nothing and offered
 * to save a hotel; the first fix from India turned it into the BurJuman stand-in, and the next
 * cold launch forgot again. The owner: "it behaves erratically… the 'add hotel' remains, but
 * when we choose खाना or जाना, then it picks up BurJuman and thereafter BurJuman remains."
 *
 * The clock decides it now, which costs nothing and needs nobody's permission.
 */

const KARAMA = { lat: 25.2456, lng: 55.3034 };
const PUNE = { lat: 18.5204, lng: 73.8567 };

function inZone(zone: string) {
  // Only `resolvedOptions().timeZone` is read, so only that is provided; the cast is the shape
  // of a stub, and a whole Intl.DateTimeFormat built by hand would say nothing more.
  const stub = { resolvedOptions: () => ({ timeZone: zone }) } as Partial<Intl.DateTimeFormat>;
  vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue(stub as Intl.DateTimeFormat);
}

/** The phone answering, or not having been asked at all. */
function phoneSays(answer: 'nothing' | 'here-in-dubai' | 'here-at-home' | 'denied') {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (ok: (p: GeolocationPosition) => void, no: (e: unknown) => void) => {
        if (answer === 'nothing') return;
        if (answer === 'denied') {
          no({ code: 1 });
          return;
        }
        const at = answer === 'here-in-dubai' ? KARAMA : PUNE;
        ok({ coords: { latitude: at.lat, longitude: at.lng } } as GeolocationPosition);
      },
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function knownHere(hotel?: SavedHotel) {
  const { useKnownHere } = await import('./here.js');
  const { forgetLocation } = await import('./location.js');
  forgetLocation();
  return renderHook(() => useKnownHere(hotel)).result.current;
}

describe('the strip, which may never ask', () => {
  it('stands in at BurJuman from the first paint on a phone whose clock is not Dubai', async () => {
    inZone('Asia/Kolkata');
    phoneSays('nothing');
    // Nothing has been asked, nothing has answered — and it still says the same thing it will
    // say after खाना has had its fix. That is the whole fix.
    expect((await knownHere()).from).toBe('virtual');
  });

  it('asks for a hotel when the clock says the traveller is in Dubai', async () => {
    inZone('Asia/Dubai');
    phoneSays('nothing');
    expect((await knownHere()).from).toBe('none');
  });

  it('never overrides a hotel the traveller saved, wherever they are', async () => {
    inZone('Asia/Kolkata');
    phoneSays('nothing');
    const hotel: SavedHotel = {
      id: 'h',
      savedAt: '2026-09-19T06:00:00.000Z',
      name: 'Rolla Residence',
      pin: KARAMA,
    };
    expect((await knownHere(hotel)).from).toBe('hotel');
  });

  it('is not fooled by an engine that cannot name its zone', async () => {
    // Refusing to guess: an unreadable clock must not turn into "you are abroad".
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no Intl');
    });
    phoneSays('nothing');
    expect((await knownHere()).from).toBe('none');
  });
});

describe('a real fix always wins over the clock', () => {
  it('measures from the phone when it answers from inside Dubai', async () => {
    inZone('Asia/Kolkata');
    phoneSays('here-in-dubai');
    const { useHere } = await import('./here.js');
    const { forgetLocation } = await import('./location.js');
    forgetLocation();
    const { result } = renderHook(() => useHere(undefined));
    await vi.waitFor(() => {
      expect(result.current.from).toBe('phone');
    });
  });

  it('stands in when the phone answers from home', async () => {
    inZone('Asia/Dubai');
    phoneSays('here-at-home');
    const { useHere } = await import('./here.js');
    const { forgetLocation } = await import('./location.js');
    forgetLocation();
    const { result } = renderHook(() => useHere(undefined));
    await vi.waitFor(() => {
      expect(result.current.from).toBe('virtual');
    });
  });

  it('still stands in for a refusal abroad, and says it was a refusal', async () => {
    inZone('Asia/Kolkata');
    phoneSays('denied');
    const { useHere } = await import('./here.js');
    const { forgetLocation } = await import('./location.js');
    forgetLocation();
    const { result } = renderHook(() => useHere(undefined));
    await vi.waitFor(() => {
      expect(result.current.denied).toBe(true);
    });
    expect(result.current.from).toBe('virtual');
  });
});

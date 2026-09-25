import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from './db.js';
import { PinScreen } from './PinScreen.js';

/**
 * The rider's screen (decision 029), tested as the conditions it is used in: a footpath, one
 * hand, no signal, and a man who reads neither Hindi nor English. What is checked is that the
 * screen cannot save something useless, and that what it does save is honest about what was
 * captured.
 */

const position = {
  coords: { latitude: 25.2582, longitude: 55.2979, accuracy: 9 },
} as GeolocationPosition;

let watcher: ((p: GeolocationPosition) => void) | null = null;
/** What the phone answers when asked afresh at the tick; null is a phone that gives nothing. */
let fresh: GeolocationPosition | null = null;

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.collector', 'rider');
  watcher = null;
  fresh = null;
  vi.stubGlobal('navigator', {
    onLine: false,
    geolocation: {
      watchPosition: (ok: (p: GeolocationPosition) => void) => {
        watcher = ok;
        return 1;
      },
      clearWatch: () => undefined,
      getCurrentPosition: (ok: (p: GeolocationPosition) => void, fail: () => void) => {
        if (fresh === null) fail();
        else ok(fresh);
      },
    },
  });
});

afterEach(async () => {
  cleanup();
  // A tick goes on to sync the queue after the confirmation shows, and a test may end on the
  // confirmation. Let that finish here, before the next test deletes the database under it.
  await new Promise((resolve) => setTimeout(resolve, 100));
  vi.unstubAllGlobals();
});

describe('the rider’s pin', () => {
  it('shows the number to write, and nothing to type', () => {
    const { container } = render(<PinScreen />);
    expect(container.querySelector('.pin-number')?.textContent).toBe('0001');
    // Nothing to type: he holds a helmet. The one input is the menu's first page (the owner,
    // 25 September) — a camera for the menu handed over, never for the shop.
    const inputs = [...container.querySelectorAll('input')];
    expect(inputs.map((input) => input.type)).toEqual(['file']);
    expect(inputs[0]?.accept).toBe('image/*');
  });

  it('waits for a fix, which is the one thing it cannot do without', async () => {
    const { container } = render(<PinScreen />);
    expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(true);

    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
  });

  it('saves a pin with no photograph at all', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    // The fix arrives from outside React, so wait for the tick to come alive before pressing it.
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.frontPhotoIds).toEqual([]);
    expect(await db.photos.count()).toBe(0);
  });

  it('saves the serial and the fix — and no name it did not ask for', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.formSerial).toBe('0001');
    expect(report?.location).toEqual({ lat: 25.2582, lng: 55.2979 });
    expect(report?.collectorId).toBe('rider');
    // No name and no dietary answers: the name is on the stapled menu and the five answers are on
    // the paper. Absent is the honest value — a `false` here would say "no Jain food" about a
    // kitchen nobody asked.
    expect(report?.name).toBe('');
    expect(report?.dietary).toBeUndefined();
    expect(await db.photos.count()).toBe(0);
  });

  it('pins where he stands at the tick, not where the watch last reported', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    // Across the road: the watch has gone quiet, but a reading asked for now knows better.
    fresh = {
      coords: { latitude: 25.2607, longitude: 55.2953, accuracy: 7 },
    } as GeolocationPosition;
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.location).toEqual({ lat: 25.2607, lng: 55.2953 });
  });

  it('says where the menu is when it did not come with the pin', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    const [, photographed, fromQr] = [...container.querySelectorAll<HTMLElement>('.pin-menu-opt')];
    fireEvent.click(photographed!);
    fireEvent.click(fromQr!);
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.notes).toBe(
      'menu photographed on the collector’s phone; menu downloaded from the counter’s QR',
    );
    expect(report?.menuPhotoIds).toEqual([]);
    // …and the next form starts with both off.
    await waitFor(() => {
      expect(document.querySelectorAll('.pin-menu-on')).toHaveLength(0);
    });
  });

  it('shows the number back, then moves on to the next one', async () => {
    localStorage.setItem('saathi.pinCounter', '142');
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    // The one just written, said back to him on the confirmation — not the number waiting on
    // the form behind it, which is why this looks for the confirmation's own element.
    await waitFor(() => {
      expect(document.querySelector('.pin-done-serial')?.textContent).toBe('0142');
    });
    // …and the counter has moved on, so the next form gets the next number.
    await waitFor(() => {
      expect(localStorage.getItem('saathi.pinCounter')).toBe('143');
    });
  });

  it('hands the pin it just wrote on to the long form, for whoever holds the paper too', async () => {
    const carried: string[] = [];
    const { container } = render(
      <PinScreen
        onFillIn={(id) => {
          carried.push(id);
        }}
      />,
    );
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(() => {
      expect(document.querySelector('.pin-fill')).toBeTruthy();
    });
    fireEvent.click(document.querySelector<HTMLButtonElement>('.pin-fill')!);

    const [report] = await db.reports.toArray();
    // The same row, not a second one: the door was pinned once and the form completes that pin.
    expect(carried).toEqual([report?.id]);
  });

  it('offers no way on to a rider who has no long form to fill', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);
    await waitFor(() => {
      expect(document.querySelector('.pin-done-serial')).toBeTruthy();
    });
    expect(document.querySelector('.pin-fill')).toBeNull();
  });

  it('does not spend a number on a visit that was abandoned', () => {
    localStorage.setItem('saathi.pinCounter', '7');
    const { unmount } = render(<PinScreen />);
    unmount();
    render(<PinScreen />);
    expect(screen.getByText('0007')).toBeTruthy();
  });
});

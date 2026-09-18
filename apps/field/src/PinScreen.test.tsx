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

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.collector', 'rider');
  watcher = null;
  vi.stubGlobal('navigator', {
    onLine: false,
    geolocation: {
      watchPosition: (ok: (p: GeolocationPosition) => void) => {
        watcher = ok;
        return 1;
      },
      clearWatch: () => undefined,
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A photograph, the way the file input hands one over. */
function photograph(input: HTMLInputElement) {
  const file = new File(['frontage'], 'front.jpg', { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

describe('the rider’s pin', () => {
  it('shows the number to write, and nothing to type', () => {
    const { container } = render(<PinScreen />);
    expect(container.querySelector('.pin-number')?.textContent).toBe('0001');
    // The only inputs on the screen are the hidden camera and the tick: he holds a helmet.
    expect(container.querySelectorAll('input:not([type="file"])')).toHaveLength(0);
  });

  it('waits for a fix, which is the one thing it cannot do without', async () => {
    const { container } = render(<PinScreen />);
    expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(true);

    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
  });

  it('saves without a photograph, because sometimes he cannot take one', async () => {
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

  it('saves the serial, the fix and the frontage — and no name it did not ask for', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    photograph(container.querySelector<HTMLInputElement>('.pin-file')!);
    await waitFor(() => {
      expect(container.querySelector('.pin-camera-got')).toBeTruthy();
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.formSerial).toBe('0001');
    expect(report?.location).toEqual({ lat: 25.2582, lng: 55.2979 });
    expect(report?.collectorId).toBe('rider');
    // No name and no dietary answers: the board is in the photograph and the five answers are on
    // the paper. Absent is the honest value — a `false` here would say "no Jain food" about a
    // kitchen nobody asked.
    expect(report?.name).toBe('');
    expect(report?.dietary).toBeUndefined();
    expect(await db.photos.count()).toBe(1);
  });

  it('shows the number back, then moves on to the next one', async () => {
    localStorage.setItem('saathi.pinCounter', '142');
    const { container } = render(<PinScreen />);
    watcher?.(position);
    photograph(container.querySelector<HTMLInputElement>('.pin-file')!);
    await waitFor(() => {
      expect(container.querySelector('.pin-camera-got')).toBeTruthy();
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

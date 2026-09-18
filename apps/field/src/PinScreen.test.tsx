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

function type(serial: string) {
  fireEvent.change(document.querySelector<HTMLInputElement>('.pin-input')!, {
    target: { value: serial },
  });
}

describe('the rider’s pin', () => {
  it('will not save until there is a number, a photograph and a fix', async () => {
    const { container } = render(<PinScreen />);
    expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(true);

    type('0142');
    expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(true);

    photograph(container.querySelector<HTMLInputElement>('.pin-file')!);
    await waitFor(() => {
      expect(container.querySelector('.pin-camera-got')).toBeTruthy();
    });
    // Still no fix: the phone has not answered yet, and a pin without coordinates is the one
    // thing this screen exists to produce.
    expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(true);

    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
  });

  it('takes only digits, because that is the one script the rider reads', () => {
    const { container } = render(<PinScreen />);
    type('01A4b2');
    expect(container.querySelector<HTMLInputElement>('.pin-input')!.value).toBe('0142');
  });

  it('saves the serial, the fix and the frontage — and no name it did not ask for', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    type('0142');
    photograph(container.querySelector<HTMLInputElement>('.pin-file')!);
    await waitFor(() => {
      expect(container.querySelector('.pin-camera-got')).toBeTruthy();
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.formSerial).toBe('0142');
    expect(report?.location).toEqual({ lat: 25.2582, lng: 55.2979 });
    expect(report?.collectorId).toBe('rider');
    // No name and no dietary answers: the board is in the photograph and the five answers are on
    // the paper. Absent is the honest value — a `false` here would say "no Jain food" about a
    // kitchen nobody asked.
    expect(report?.name).toBe('');
    expect(report?.dietary).toBeUndefined();
    expect(await db.photos.count()).toBe(1);
  });

  it('shows the serial back and clears itself for the next shop', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    type('0143');
    photograph(container.querySelector<HTMLInputElement>('.pin-file')!);
    await waitFor(() => {
      expect(container.querySelector('.pin-camera-got')).toBeTruthy();
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    expect(await screen.findByText('0143')).toBeTruthy();
  });
});

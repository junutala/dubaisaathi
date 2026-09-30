import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from './db.js';
import { PinScreen } from './PinScreen.js';

/**
 * jsdom draws no canvas: a page is kept as it was picked. A test can hold the shrinking back, as a
 * phone does for a second or two, to press the tick inside that moment.
 */
const slow = vi.hoisted(() => ({ hold: null as Promise<void> | null }));
vi.mock('./shrink.js', () => ({
  MENU: { edge: 2000, quality: 0.82 },
  shrink: async (file: File) => {
    if (slow.hold !== null) await slow.hold;
    return file;
  },
}));

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
    // The menu's cover (the owner, 30 September) — never the shop — and one optional note. The
    // full menu is a button into the camera. No QR, no WhatsApp: they went the same morning.
    expect(container.querySelectorAll('textarea')).toHaveLength(1);
    const inputs = [...container.querySelectorAll('input')];
    expect(inputs.map((input) => input.type)).toEqual(['file']);
    expect(inputs[0]?.accept).toBe('image/*');
    expect(container.querySelectorAll('.pin-menu-opt')).toHaveLength(2);
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

    // The confirmation comes at once; the fresh reading moves the pin just after it.
    await waitFor(() => {
      expect(document.querySelector('.pin-done-serial')).toBeTruthy();
    });
    await waitFor(async () => {
      const [report] = await db.reports.toArray();
      expect(report?.location).toEqual({ lat: 25.2607, lng: 55.2953 });
    });
  });

  it('keeps the note as typed, and says nothing it was not told', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.change(container.querySelector('textarea')!, {
      target: { value: ' WhatsApp 050 123 4567 for the menu ' },
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.notes).toBe('WhatsApp 050 123 4567 for the menu');
    expect(report?.menuPhotoIds).toEqual([]);
  });

  it('keeps one cover apart from the pages: a second picture replaces the first', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    const cover = container.querySelector<HTMLInputElement>('input[type=file]')!;
    fireEvent.change(cover, { target: { files: [new File(['blurred'], 'a.jpg')] } });
    fireEvent.change(cover, { target: { files: [new File(['sharp'], 'b.jpg')] } });
    await waitFor(() => {
      expect(container.querySelector('.pin-menu-on')).toBeTruthy();
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.frontPhotoIds).toEqual([`${report!.id}-cover`]);
    expect(report?.menuPhotoIds).toEqual([]);
    // A cover is not a menu: it goes in its own slot, so the form stays on the Menus list.
    const photos = await db.photos.toArray();
    expect(photos.map((photo) => photo.kind)).toEqual(['front']);
  });

  it('takes the menu in the camera without leaving it, in order, and takes back the last', async () => {
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    const openCamera = () => {
      fireEvent.click(container.querySelectorAll<HTMLElement>('.pin-menu-opt')[1]!);
    };
    // jsdom has no camera to give, so the screen says so and offers the phone's own camera —
    // the path a phone that refuses takes. Several pages in a row, without leaving the screen.
    openCamera();
    const shoot = async (name: string, count: number) => {
      const phone = await waitFor(() => {
        const input = container.querySelector<HTMLInputElement>('.cam-fallback input');
        expect(input).toBeTruthy();
        return input!;
      });
      fireEvent.change(phone, { target: { files: [new File([name], `${name}.jpg`)] } });
      await waitFor(() => {
        expect(container.querySelector('.cam-count')?.textContent).toContain(String(count));
      });
    };
    await shoot('one', 1);
    await shoot('two', 2);
    await shoot('blurred', 3);
    fireEvent.click(container.querySelector('.cam-done')!);
    await waitFor(() => {
      expect(container.querySelectorAll('.pin-menu-opt')[1]?.textContent).toContain('3/40');
    });
    fireEvent.click(container.querySelector('.pin-menu-undo')!);
    openCamera();
    await shoot('three', 3);
    fireEvent.click(container.querySelector('.cam-done')!);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')).toBeTruthy();
    });
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.menuPhotoIds).toEqual([0, 1, 2].map((i) => `${report!.id}-menu-${String(i)}`));
    // Three pages stored, one per id — the blurred shot was taken back, not kept as a fourth.
    expect(await db.photos.count()).toBe(3);
    for (const id of report!.menuPhotoIds) expect(await db.photos.get(id)).toBeTruthy();
  });

  it('keeps a page on its own pin when the tick is pressed while it is still shrinking', async () => {
    // 27 September: 0048's menu arrived on 0049. The page was still shrinking when the tick was
    // pressed, so the pin saved without it and the page landed on the next form.
    const { container } = render(<PinScreen />);
    watcher?.(position);
    await waitFor(() => {
      expect(container.querySelector('.pin-done-btn')?.hasAttribute('disabled')).toBe(false);
    });
    let release: () => void = () => undefined;
    slow.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    fireEvent.click(container.querySelectorAll<HTMLElement>('.pin-menu-opt')[1]!);
    const phone = await waitFor(() => {
      const input = container.querySelector<HTMLInputElement>('.cam-fallback input');
      expect(input).toBeTruthy();
      return input!;
    });
    fireEvent.change(phone, { target: { files: [new File(['al musalla'], 'page.jpg')] } });
    // Out of the camera and the tick, at once — before the page is ready.
    fireEvent.click(container.querySelector('.cam-done')!);
    fireEvent.click(container.querySelector<HTMLButtonElement>('.pin-done-btn')!);
    slow.hold = null;
    release();

    await waitFor(async () => {
      expect(await db.reports.count()).toBe(1);
    });
    const [report] = await db.reports.toArray();
    expect(report?.formSerial).toBe('0001');
    expect(report?.menuPhotoIds).toEqual([`${report!.id}-menu-0`]);
    expect(await db.photos.count()).toBe(1);
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

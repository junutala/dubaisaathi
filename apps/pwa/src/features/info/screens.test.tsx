import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { cloneKeepingBlobs } from './blobHarness.js';
import { InfoScreen } from './InfoScreen.js';
import { DocumentAddScreen } from './DocumentAddScreen.js';
import { DocumentScreen } from './DocumentScreen.js';
import { HotelScreen } from './HotelScreen.js';
import { listDocuments, readHotel, saveDocument, saveHotelCapture } from './storage.js';
import type { CardReading } from './readCard.js';
import { startCardRetry } from './cardReading.js';

/**
 * The hotel and the documents never disappear (rule 6), and the way that rule breaks is never
 * theatrical: a screen quietly needs something it cannot have — a fetch, a permission, a
 * camera the app decided was not there — and the traveller finds out at the desk.
 *
 * So every test here runs under the conditions the screens are actually used in. The radio is
 * off in all of them: `fetch` throws, exactly as it does in aeroplane mode. Nothing sets up a
 * pass, a trial or a counter, because these screens must not read one.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

/**
 * The card reader, stood in for: jsdom has no canvas and no wasm, and what these tests prove is
 * what the screen does with each thing the reader can say — including that it could not read.
 */
const readCard = vi.fn<(photos: readonly Blob[]) => Promise<CardReading>>();
vi.mock('./readCard.js', () => ({
  readCard: (photos: readonly Blob[]) => readCard(photos),
}));

function show(ui: ReactElement) {
  return render(<SettingsProvider>{ui}</SettingsProvider>);
}

const noop = () => undefined;

function photo(bytes: string, name = 'photo.jpg'): File {
  return new File([bytes], name, { type: 'image/jpeg' });
}

/** Puts a chosen file on a file input the way a phone's camera does, then fires the change. */
function choose(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

beforeEach(async () => {
  navigate.mockClear();
  readCard.mockReset();
  readCard.mockResolvedValue({ lines: [], failed: true });
  // Without this the harness stores photographs and keeps none of them — see blobHarness.ts.
  vi.stubGlobal('structuredClone', cloneKeepingBlobs);
  await db.delete();
  await db.open();
  localStorage.clear();
  // The product's own language, pinned so the assertions read like the screens do.
  localStorage.setItem('saathi.locale', 'hi');
  // Aeroplane mode, as the app sees it.
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  vi.stubGlobal('fetch', () => Promise.reject(new Error('the radio is off')));
  // jsdom implements neither object-URL call, and the photograph paths under test use both.
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:photo' }));
  URL.revokeObjectURL = noop;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('घर.1 · मेरा होटल, with the radio off and no pass', () => {
  it('offers यहीं पिन लगाएँ before the phone has said anything', () => {
    // The rule this project paid a day for: nothing here queries a capability. On a browser
    // with no geolocation object at all the button is still live, because only the device gets
    // to say no — and it says it after being asked, not before.
    expect('geolocation' in navigator && navigator.geolocation).toBeFalsy();
    show(<HotelScreen hotel={undefined} />);
    const pin = screen.getByText('यहीं पिन लगाएँ').closest('button');
    expect(pin?.disabled).toBe(false);
  });

  it('puts the card, the pin and Submit on the first screen, and nothing else to fill in', () => {
    // The owner, 23 September: a pin below the fold is a pin nobody presses.
    const { container } = show(<HotelScreen hotel={undefined} />);
    expect(screen.getByText('कार्ड · आगे')).toBeTruthy();
    expect(screen.getByText('कार्ड · पीछे')).toBeTruthy();
    expect(screen.getByText('यहीं पिन लगाएँ')).toBeTruthy();
    expect(screen.getByText('सबमिट करें')).toBeTruthy();
    expect(container.querySelectorAll('input[type="file"]').length).toBe(2);
    expect(container.querySelectorAll('input:not([type="file"])').length).toBe(0);
  });

  it('says what happened and keeps everything else when the fix does not come', async () => {
    show(<HotelScreen hotel={undefined} />);
    fireEvent.click(screen.getByText('यहीं पिन लगाएँ').closest('button')!);
    expect(await screen.findByText(/अभी जगह नहीं मिली/)).toBeTruthy();
    expect(screen.getByText('कार्ड · आगे')).toBeTruthy();
    expect(screen.getByText('सबमिट करें')).toBeTruthy();
  });

  it('keeps both sides of the card with no pin and no permission', async () => {
    const { container } = show(<HotelScreen hotel={undefined} />);
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    choose(inputs[0]!, photo('card-front'));
    await waitFor(async () => {
      expect(await (await readHotel())?.cardPhoto?.text()).toBe('card-front');
    });
    choose(inputs[1]!, photo('card-back'));
    await waitFor(async () => {
      expect(await (await readHotel())?.cardBack?.text()).toBe('card-back');
    });
    expect(await (await readHotel())?.cardPhoto?.text()).toBe('card-front');
  });

  it('fills what the card says, leaves the room to be typed, and says it was read', async () => {
    readCard.mockResolvedValue({
      failed: false,
      lines: [
        { text: 'SABTBIR HOTEL APARTMENTS L.L.C', height: 30 },
        { text: 'Tel: 04 258 6682', height: 16 },
        { text: 'reservations@sabtbirhotelapts.com', height: 14 },
        { text: 'P.O. Box 184184, 23D St, Al Rigga, Dubai, UAE', height: 14 },
      ],
    });
    const hotel = await saveHotelCapture({ cardPhoto: photo('front'), cardBack: photo('back') });
    const { rerender } = show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByText('सबमिट करें'));
    await waitFor(async () => {
      expect((await readHotel())?.submittedAt).toBeDefined();
    });
    const saved = await readHotel();
    expect(readCard.mock.calls[0]?.[0]).toHaveLength(2);
    expect(saved?.name).toBe('Sabtbir Hotel Apartments');
    expect(saved?.phone).toBe('+971 4 258 6682');
    expect(saved?.address).toBe('23D St, Al Rigga, Dubai');
    expect(saved?.room).toBeUndefined();

    rerender(
      <SettingsProvider>
        <HotelScreen hotel={saved} />
      </SettingsProvider>,
    );
    expect(await screen.findByText(/आपके कार्ड से पढ़ा गया/)).toBeTruthy();
    expect(screen.getByDisplayValue('Sabtbir Hotel Apartments')).toBeTruthy();
    expect(screen.getByDisplayValue('23D St, Al Rigga, Dubai')).toBeTruthy();
    expect(screen.getByPlaceholderText('412')).toHaveProperty('value', '');
  });

  it('never writes a reading over what the traveller typed', async () => {
    readCard.mockResolvedValue({
      failed: false,
      lines: [
        { text: 'RIGGA PALM', height: 48 },
        { text: 'Tel: +971 4 268 0455', height: 16 },
        { text: 'www.riggapalminn.com', height: 14 },
      ],
    });
    const typed = await saveHotelCapture({ name: 'Rigga Palm, Deira', cardBack: photo('back') });
    show(<HotelScreen hotel={typed} />);
    // A hotel written into before the card screen opens on its fields; retaking a side reads it.
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    choose(inputs[1]!, photo('back-again'));
    await waitFor(async () => {
      expect((await readHotel())?.phone).toBe('+971 4 268 0455');
    });
    expect((await readHotel())?.name).toBe('Rigga Palm, Deira');
  });

  it('goes on to the boxes when the card cannot be read with the radio off, and says why', async () => {
    const hotel = await saveHotelCapture({ cardPhoto: photo('front') });
    const { rerender } = show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByText('सबमिट करें'));
    await waitFor(async () => {
      expect((await readHotel())?.submittedAt).toBeDefined();
    });
    rerender(
      <SettingsProvider>
        <HotelScreen hotel={await readHotel()} />
      </SettingsProvider>,
    );
    expect(await screen.findByText(/एक बार सिग्नल चाहिए/)).toBeTruthy();
    // The typing path is live: a way out that is also a way through.
    expect(screen.getByPlaceholderText('होटल का नाम')).toBeTruthy();
  });

  it('reads the card by itself when the signal comes back, even after leaving घर.1', async () => {
    const stop = startCardRetry();
    try {
      const hotel = await saveHotelCapture({ cardPhoto: photo('front') });
      const { rerender, unmount } = show(<HotelScreen hotel={hotel} />);
      fireEvent.click(screen.getByText('सबमिट करें'));
      await waitFor(async () => {
        expect((await readHotel())?.cardUnread).toBe(true);
      });
      rerender(
        <SettingsProvider>
          <HotelScreen hotel={await readHotel()} />
        </SettingsProvider>,
      );
      await screen.findByText(/एक बार सिग्नल चाहिए/);
      // The traveller goes elsewhere; the signal returns while nothing of घर.1 is on screen.
      unmount();
      readCard.mockResolvedValue({
        failed: false,
        lines: [
          { text: 'AL WASMI RESIDENCE', height: 44 },
          { text: 'T +971 4 335 7210', height: 16 },
          { text: 'www.alwasmiresidence.ae', height: 14 },
        ],
      });
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
      await waitFor(async () => {
        expect((await readHotel())?.name).toBe('Al Wasmi Residence');
      });
      expect((await readHotel())?.cardUnread).toBeUndefined();
    } finally {
      stop();
    }
  });

  it('keeps trying at every signal while the reading keeps failing', async () => {
    const stop = startCardRetry();
    try {
      await saveHotelCapture({ cardPhoto: photo('front'), cardUnread: true });
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
      await waitFor(() => {
        expect(readCard).toHaveBeenCalledTimes(1);
      });
      await waitFor(async () => {
        expect((await readHotel())?.cardUnread).toBe(true);
      });
      window.dispatchEvent(new Event('online'));
      await waitFor(() => {
        expect(readCard).toHaveBeenCalledTimes(2);
      });
    } finally {
      stop();
    }
  });

  it('does not bring back a hotel removed while its card was being read', async () => {
    let finish: (reading: CardReading) => void = () => undefined;
    readCard.mockReturnValue(
      new Promise<CardReading>((resolve) => {
        finish = resolve;
      }),
    );
    const hotel = await saveHotelCapture({ cardPhoto: photo('front') });
    show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByText('सबमिट करें'));
    await waitFor(() => {
      expect(readCard).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'होटल हटाएँ' }));
    await waitFor(async () => {
      expect(await readHotel()).toBeUndefined();
    });
    finish({ failed: false, lines: [{ text: 'www.alwasmiresidence.ae', height: 14 }] });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await readHotel()).toBeUndefined();
  });

  it('keeps a space typed before a pause, so the next word does not run into the last', async () => {
    const hotel = await saveHotelCapture({ submittedAt: '2026-09-23T06:00:00.000Z' });
    const { rerender } = show(<HotelScreen hotel={hotel} />);
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByPlaceholderText('होटल का नाम'), { target: { value: 'Al ' } });
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
    await waitFor(async () => {
      expect((await readHotel())?.name).toBe('Al');
    });
    // The saved hotel comes back trimmed, as it does in the app after every save.
    rerender(
      <SettingsProvider>
        <HotelScreen hotel={await readHotel()} />
      </SettingsProvider>,
    );
    expect(screen.getByPlaceholderText('होटल का नाम')).toHaveProperty('value', 'Al ');
  });

  it('keeps whatever is typed into two boxes in quick succession, without a button', async () => {
    const hotel = await saveHotelCapture({ submittedAt: '2026-09-23T06:00:00.000Z' });
    vi.useFakeTimers();
    try {
      show(<HotelScreen hotel={hotel} />);
      fireEvent.change(screen.getByPlaceholderText('होटल का नाम'), {
        target: { value: 'Citymax Bur Dubai' },
      });
      fireEvent.change(screen.getByPlaceholderText('412'), { target: { value: '412' } });
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
    const saved = await readHotel();
    expect(saved?.name).toBe('Citymax Bur Dubai');
    expect(saved?.room).toBe('412');
  });

  it('takes an emptied box off the hotel rather than keeping it as an empty name', async () => {
    const hotel = await saveHotelCapture({ name: 'Citymax', room: '412' });
    vi.useFakeTimers();
    try {
      show(<HotelScreen hotel={hotel} />);
      fireEvent.change(screen.getByDisplayValue('Citymax'), { target: { value: '  ' } });
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
    const saved = await readHotel();
    expect(saved !== undefined && 'name' in saved).toBe(false);
    expect(saved?.room).toBe('412');
  });

  it('keeps the photographs taken before the card screen, until the traveller removes one', async () => {
    // A release never takes something away from a phone: the front of the building and the
    // lift, photographed before 23 September, are still there and still the traveller's.
    const saved = await saveHotelCapture({
      room: '203',
      cardPhoto: photo('card'),
      gatePhoto: photo('gate'),
      photos: [photo('lift')],
    });
    show(<HotelScreen hotel={saved} />);
    expect(screen.getByDisplayValue('203')).toBeTruthy();
    expect(screen.getAllByAltText('होटल की पहले की फ़ोटो')).toHaveLength(2);
    // It asks first, because a photograph removed cannot be brought back.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getAllByRole('button', { name: /होटल की पहले की फ़ोटो/ })[1]!);
    await waitFor(async () => {
      expect((await readHotel())?.photos).toEqual([]);
    });
    const hotel = await readHotel();
    expect(await hotel?.gatePhoto?.text()).toBe('gate');
    expect(await hotel?.cardPhoto?.text()).toBe('card');
  });

  it('removes the hotel from the header, and only when asked, then goes home', async () => {
    const hotel = await saveHotelCapture({ name: 'Citymax', room: '412' });
    show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByRole('button', { name: 'होटल हटाएँ' }));
    await waitFor(async () => {
      expect(await readHotel()).toBeUndefined();
    });
    expect(navigate).toHaveBeenCalledWith({ screen: 'home' });
  });
});

describe('घर.2 · ज़रूरी जानकारी — दस्तावेज़', () => {
  /** The documents are the second capsule since 18 September (decision 028). */
  function openDocuments() {
    const rendered = show(<InfoScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'दस्तावेज़' }));
    return rendered;
  }

  it('lists what is kept and offers to add more, with the radio off', async () => {
    await saveDocument('यात्रा बीमा', photo('insurance'));
    openDocuments();
    expect(await screen.findByText('यात्रा बीमा')).toBeTruthy();
    fireEvent.click(screen.getByText(/दस्तावेज़ जोड़ें/));
    expect(navigate).toHaveBeenCalledWith({ screen: 'docAdd' });
  });

  it('opens a document from the list', async () => {
    const doc = await saveDocument('पासपोर्ट', photo('passport'));
    openDocuments();
    fireEvent.click(await screen.findByText('पासपोर्ट'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'docView', docId: doc.id });
  });
});

describe('घर.2 › जोड़ें', () => {
  it('offers फ़ोटो लें on a browser with no camera API to interrogate', () => {
    expect('mediaDevices' in navigator).toBe(false);
    show(<DocumentAddScreen />);
    expect(screen.getByText('फ़ोटो लें')).toBeTruthy();
  });

  it('keeps the document, and it is on the list afterwards', async () => {
    const { container } = show(<DocumentAddScreen />);
    choose(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo('passport'));
    fireEvent.change(screen.getByPlaceholderText('जैसे — यात्रा बीमा'), {
      target: { value: 'पासपोर्ट' },
    });
    fireEvent.click(screen.getByText('रख लें'));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'docs' });
    });
    const [saved] = await listDocuments();
    expect(saved?.name).toBe('पासपोर्ट');
    expect(await saved?.photo.text()).toBe('passport');
  });

  it('says what is still missing instead of leaving a dead button to puzzle over', () => {
    show(<DocumentAddScreen />);
    expect(screen.getByText('फ़ोटो लीजिए और नाम लिखिए — फिर रख लेंगे.')).toBeTruthy();
  });
});

describe('घर.3 · दस्तावेज़ › देखें', () => {
  it('shows the document and its name, with the radio off', async () => {
    const doc = await saveDocument('यात्रा बीमा', photo('insurance'));
    show(<DocumentScreen docId={doc.id} />);
    expect((await screen.findAllByText(/यात्रा बीमा/)).length).toBeGreaterThan(0);
    expect((await screen.findByRole('img')).getAttribute('src')).toBe('blob:photo');
  });

  it('actually removes the photograph when हटाएँ is pressed', async () => {
    const doc = await saveDocument('पासपोर्ट', photo('passport'));
    show(<DocumentScreen docId={doc.id} />);
    fireEvent.click(await screen.findByText('हटाएँ'));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'docs' });
    });
    expect(await db.documents.count()).toBe(0);
  });

  it('says where the document went rather than painting a blank rectangle', async () => {
    show(<DocumentScreen docId="a-document-that-was-deleted" />);
    expect(await screen.findByText('यह दस्तावेज़ अब इस फ़ोन में नहीं है.')).toBeTruthy();
  });
});

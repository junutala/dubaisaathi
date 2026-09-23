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
import {
  deleteHotel,
  listDocuments,
  readHotel,
  saveDocument,
  saveHotelCapture,
} from './storage.js';
import type { CardReading } from './readCard.js';
import { readHotelCard, startCardRetry } from './cardReading.js';
import { cardFields } from './cardFields.js';

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

/**
 * The QR reader, stood in for the same way: what it decoded off the card's sides is the input,
 * and what the screen and the hotel do with it is what is under test.
 */
const readQr = vi.fn<(photos: readonly Blob[]) => Promise<string[]>>();
vi.mock('./readQr.js', () => ({
  readQr: (photos: readonly Blob[]) => readQr(photos),
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
  readQr.mockReset();
  readQr.mockResolvedValue([]);
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
    expect(screen.getByPlaceholderText('लिखें')).toHaveProperty('value', '');
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
    // A hotel written into before the card screen opens on its fields. Tapping the photographed
    // side opens it full size; retaking it there reads it again.
    fireEvent.click(screen.getByRole('button', { name: /कार्ड · पीछे/ }));
    expect(screen.getByRole('dialog', { name: 'कार्ड · पीछे' })).toBeTruthy();
    const retake = screen.getByText('यह तरफ़ फिर से लें').closest('label')!;
    choose(retake.querySelector<HTMLInputElement>('input[type="file"]')!, photo('back-again'));
    await waitFor(async () => {
      expect((await readHotel())?.phone).toBe('+971 4 268 0455');
    });
    expect((await readHotel())?.name).toBe('Rigga Palm, Deira');
    expect(await (await readHotel())?.cardBack?.text()).toBe('back-again');
    // The viewer closes on the new photograph; nothing opened the camera from the card itself.
    expect(screen.queryByRole('dialog')).toBeNull();
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

  it('does not bring back a removed hotel through a reading queued behind another', async () => {
    let finish: (reading: CardReading) => void = () => undefined;
    readCard.mockReturnValue(
      new Promise<CardReading>((resolve) => {
        finish = resolve;
      }),
    );
    await saveHotelCapture({ cardPhoto: photo('front'), submittedAt: '2026-09-23T06:00:00.000Z' });
    const first = readHotelCard();
    // A side retaken while the first reading runs queues a second.
    await saveHotelCapture({ cardBack: photo('back') });
    void readHotelCard();
    await deleteHotel();
    finish({ failed: false, lines: [] });
    await first;
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
      fireEvent.change(screen.getByPlaceholderText('लिखें'), { target: { value: '412' } });
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

  it('names the metro station and the bus stop nearest the pin, with the radio off', async () => {
    const hotel = await saveHotelCapture({
      submittedAt: '2026-09-23T06:00:00.000Z',
      pin: { lat: 25.2637, lng: 55.3197 },
    });
    show(<HotelScreen hotel={hotel} />);
    expect(await screen.findByText('अल रिग्गा', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Ghurair City 1')).toBeTruthy();
    expect(screen.getByText(/^मेट्रो · \d+ मी$/)).toBeTruthy();
    expect(screen.getByText(/^बस स्टॉप · \d+ मी$/)).toBeTruthy();
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

/**
 * The QR code on the card (decision 032, the owner's addendum): read first, a maps link names
 * and pins the hotel, and anything else — the WhatsApp link most cards carry — changes nothing.
 */
describe('घर.1 · the card’s QR code, with the radio off', () => {
  const CITYMAX =
    'https://www.google.com/maps/place/Citymax+Hotel+Bur+Dubai/@25.2521937,55.2986377,17z/data=!3m1!4b1!4m9!3m8!8m2!3d25.2521889!4d55.3012126';
  const RIGGA = { lat: 25.2637, lng: 55.3197 };

  it('fills the name and the pin from a maps link before the print has been read', async () => {
    readQr.mockResolvedValue(['https://wa.me/971501234567', CITYMAX]);
    let finish: (reading: CardReading) => void = () => undefined;
    readCard.mockReturnValue(
      new Promise<CardReading>((resolve) => {
        finish = resolve;
      }),
    );
    const hotel = await saveHotelCapture({ cardPhoto: photo('front'), cardBack: photo('back') });
    show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByText('सबमिट करें'));
    // The print is still being read, and the hotel already has its name and its place.
    await waitFor(async () => {
      expect((await readHotel())?.name).toBe('Citymax Hotel Bur Dubai');
    });
    const early = await readHotel();
    expect(early?.pin).toEqual({ lat: 25.2521889, lng: 55.3012126 });
    expect(early?.pinFrom).toBe('card');
    expect(early?.area).toBeDefined();
    expect(early?.submittedAt).toBeDefined();
    expect(readQr.mock.calls[0]?.[0]).toHaveLength(2);

    // The print lands, with a name of its own: the code's name is kept, the rest is filled.
    finish({
      failed: false,
      lines: [
        { text: 'CITY MAX HOTELS', height: 40 },
        { text: 'Tel: 04 355 5000', height: 16 },
        { text: 'www.citymaxhotels.com', height: 14 },
      ],
    });
    await waitFor(async () => {
      expect((await readHotel())?.phone).toBe('+971 4 355 5000');
    });
    expect((await readHotel())?.name).toBe('Citymax Hotel Bur Dubai');
  });

  it('shows the name on step two while the print is still being read', async () => {
    readQr.mockResolvedValue([CITYMAX]);
    let finish: (reading: CardReading) => void = () => undefined;
    readCard.mockReturnValue(
      new Promise<CardReading>((resolve) => {
        finish = resolve;
      }),
    );
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
    expect(await screen.findByDisplayValue('Citymax Hotel Bur Dubai')).toBeTruthy();
    expect(screen.getByText('कार्ड पढ़ रहे हैं…')).toBeTruthy();
    expect(screen.getByText(/कार्ड से पिन/)).toBeTruthy();
    // The reading is let finish, so the next test starts with none running.
    finish({ failed: false, lines: [] });
    await waitFor(() => {
      expect(screen.queryByText('कार्ड पढ़ रहे हैं…')).toBeNull();
    });
  });

  it('never pins a place outside Dubai, even from the card', async () => {
    readQr.mockResolvedValue([
      'https://www.google.com/maps/place/Hotel+Sea+Princess/@19.1,72.8,17z/data=!3d19.1036!4d72.8266',
    ]);
    const hotel = await saveHotelCapture({ cardPhoto: photo('front') });
    show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByText('सबमिट करें'));
    await waitFor(async () => {
      expect((await readHotel())?.submittedAt).toBeDefined();
    });
    const saved = await readHotel();
    expect(saved?.pin).toBeUndefined();
    expect(saved?.pinFrom).toBeUndefined();
    expect(saved?.cardPin).toBeUndefined();
  });

  it('changes nothing for a WhatsApp code: the print fills the boxes and the pin stays the traveller’s', async () => {
    const fetched = vi.fn(() => Promise.reject(new Error('the radio is off')));
    vi.stubGlobal('fetch', fetched);
    readQr.mockResolvedValue(['https://wa.me/971501234567?text=Hello']);
    const lines = [
      { text: 'RIGGA PALM', height: 48 },
      { text: 'Tel: +971 4 268 0455', height: 16 },
      { text: 'www.riggapalminn.com', height: 14 },
    ];
    readCard.mockResolvedValue({ failed: false, lines });
    const hotel = await saveHotelCapture({ cardPhoto: photo('front') });
    show(<HotelScreen hotel={hotel} />);
    fireEvent.click(screen.getByText('सबमिट करें'));
    await waitFor(async () => {
      expect((await readHotel())?.phone).toBe('+971 4 268 0455');
    });
    const saved = await readHotel();
    // Exactly what the print alone gives.
    expect(saved?.name).toBe(cardFields(lines).name);
    expect(saved?.pin).toBeUndefined();
    expect(saved?.cardLink).toBeUndefined();
    // Nothing about a WhatsApp link is sent anywhere.
    expect(fetched).not.toHaveBeenCalled();
  });

  it('asks which place is right when the card is far from where the traveller pinned', async () => {
    readQr.mockResolvedValue([CITYMAX]);
    await saveHotelCapture({
      cardPhoto: photo('front'),
      pin: RIGGA,
      area: { hi: 'अल रिग्गा', en: 'Al Rigga' },
    });
    await readHotelCard();
    const saved = await readHotel();
    // The traveller's pin stands until they answer; the card's place waits beside it.
    expect(saved?.pin).toEqual(RIGGA);
    expect(saved?.cardPin?.at).toEqual({ lat: 25.2521889, lng: 55.3012126 });

    const { rerender } = show(<HotelScreen hotel={saved} />);
    expect(screen.getByText(/कार्ड होटल को कहीं और बताता है/)).toBeTruthy();
    expect(screen.getByText('जहाँ आप खड़े थे')).toBeTruthy();
    fireEvent.click(screen.getByText('कार्ड वाली जगह').closest('button')!);
    await waitFor(async () => {
      expect((await readHotel())?.cardPin).toBeUndefined();
    });
    const chosen = await readHotel();
    expect(chosen?.pin).toEqual({ lat: 25.2521889, lng: 55.3012126 });
    expect(chosen?.pinFrom).toBe('card');
    rerender(
      <SettingsProvider>
        <HotelScreen hotel={chosen} />
      </SettingsProvider>,
    );
    expect(screen.queryByText(/कार्ड होटल को कहीं और बताता है/)).toBeNull();
  });

  it('keeps the traveller’s pin when they say where they stood was right', async () => {
    readQr.mockResolvedValue([CITYMAX]);
    await saveHotelCapture({ cardPhoto: photo('front'), pin: RIGGA });
    await readHotelCard();
    show(<HotelScreen hotel={await readHotel()} />);
    fireEvent.click(screen.getByText('जहाँ आप खड़े थे').closest('button')!);
    await waitFor(async () => {
      expect((await readHotel())?.cardPin).toBeUndefined();
    });
    expect((await readHotel())?.pin).toEqual(RIGGA);
    expect((await readHotel())?.pinFrom).toBeUndefined();
  });

  it('does not ask when the card and the traveller agree within 200 m', async () => {
    readQr.mockResolvedValue(['https://maps.google.com/?q=25.2640,55.3199']);
    await saveHotelCapture({ cardPhoto: photo('front'), pin: RIGGA });
    await readHotelCard();
    const saved = await readHotel();
    expect(saved?.pin).toEqual(RIGGA);
    expect(saved?.cardPin).toBeUndefined();
  });

  it('asks when the traveller pins, standing far from the place the card gave', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({ coords: { latitude: RIGGA.lat, longitude: RIGGA.lng } } as GeolocationPosition);
        },
      },
    });
    try {
      readQr.mockResolvedValue([CITYMAX]);
      await saveHotelCapture({ cardPhoto: photo('front') });
      await readHotelCard();
      expect((await readHotel())?.pinFrom).toBe('card');
      show(<HotelScreen hotel={await readHotel()} />);
      fireEvent.click(screen.getByText('फिर से').closest('button')!);
      await waitFor(async () => {
        expect((await readHotel())?.pin).toEqual(RIGGA);
      });
      const saved = await readHotel();
      expect(saved?.pinFrom).toBeUndefined();
      expect(saved?.cardPin?.at).toEqual({ lat: 25.2521889, lng: 55.3012126 });
    } finally {
      Reflect.deleteProperty(navigator, 'geolocation');
    }
  });

  it('keeps a short maps link until there is a signal, then follows it and sends only the link', async () => {
    const stop = startCardRetry();
    try {
      readQr.mockResolvedValue(['https://maps.app.goo.gl/Xy12AbCd']);
      readCard.mockResolvedValue({
        failed: false,
        lines: [{ text: 'Tel: 04 355 5000', height: 16 }],
      });
      await saveHotelCapture({ cardPhoto: photo('front') });
      await readHotelCard();
      const waiting = await readHotel();
      expect(waiting?.cardLink).toBe('https://maps.app.goo.gl/Xy12AbCd');
      expect(waiting?.name).toBeUndefined();
      expect(waiting?.phone).toBe('+971 4 355 5000');

      const sent: { url: string; body: string }[] = [];
      vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
        sent.push({ url, body: typeof init.body === 'string' ? init.body : '' });
        return Promise.resolve(
          new Response(JSON.stringify({ url: CITYMAX }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      });
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
      await waitFor(async () => {
        expect((await readHotel())?.cardLink).toBeUndefined();
      });
      const followed = await readHotel();
      expect(followed?.name).toBe('Citymax Hotel Bur Dubai');
      expect(followed?.pinFrom).toBe('card');
      expect(sent).toHaveLength(1);
      expect(sent[0]?.url).toContain('/functions/v1/maplink');
      // The link printed on the card, and nothing else about the hotel or the traveller.
      expect(JSON.parse(sent[0]?.body ?? '')).toEqual({ url: 'https://maps.app.goo.gl/Xy12AbCd' });
      // The print was read at the time and is not read again for a link.
      expect(readCard).toHaveBeenCalledTimes(1);
    } finally {
      stop();
    }
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

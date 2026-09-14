import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { cloneKeepingBlobs } from './blobHarness.js';
import { DocumentAddScreen } from './DocumentAddScreen.js';
import { DocumentScreen } from './DocumentScreen.js';
import { HotelAddScreen } from './HotelAddScreen.js';
import { InfoHomeScreen } from './InfoHomeScreen.js';
import { listDocuments, saveDocument, saveHotelCapture } from './storage.js';

/**
 * Rule 6 says ज़रूरी जानकारी never disappears, and the way that rule breaks is never
 * theatrical: a screen quietly needs something it cannot have — a fetch, a permission, a
 * camera the app decided was not there — and the traveller finds out at the desk.
 *
 * So every test here runs the tile under the conditions it is actually used in. The radio is
 * off in all of them: `fetch` throws, exactly as it does in aeroplane mode, which means any
 * screen that reaches for the network fails the suite instead of failing a tourist. Nothing
 * sets up a pass, a trial or a counter, because the tile must not read one.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
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
  // Stubbed rather than avoided, so what is asserted is the real `<img>` a traveller sees.
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:photo' }));
  URL.revokeObjectURL = noop;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('4.1 · ज़रूरी जानकारी, with the radio off and no pass', () => {
  it('shows the hotel, the document, the consulate and the numbers', async () => {
    await saveHotelCapture({ cardPhoto: photo('reception-card') });
    await saveDocument('यात्रा बीमा', photo('insurance'));

    show(<InfoHomeScreen onMic={noop} />);

    expect(await screen.findByText('यात्रा बीमा')).toBeTruthy();
    expect(screen.getByText('मेरा होटल')).toBeTruthy();
    expect(screen.getByText('कार्ड की फ़ोटो')).toBeTruthy();
    expect(screen.getByText('पुलिस 999 · एम्बुलेंस 998 · दमकल 997')).toBeTruthy();

    // The consulate is handed to the dialler, which needs nothing from us and nothing from
    // the network (decision 002).
    const call = screen.getByLabelText('कॉन्सुलेट को फ़ोन करें');
    expect(call.getAttribute('href')).toBe('tel:+97143971222');
  });

  it('offers both hotel actions for a hotel that was only photographed', async () => {
    // No pin was ever taken. The card photo alone is a hotel, and both of the things a
    // traveller does with one have to work.
    await saveHotelCapture({ cardPhoto: photo('reception-card') });

    show(<InfoHomeScreen onMic={noop} />);

    const showDriver = await screen.findByText('ड्राइवर को दिखाएँ');
    fireEvent.click(showDriver);
    expect(navigate).toHaveBeenCalledWith({ screen: 'driver', phraseId: 'taxi-hotel' });

    fireEvent.click(screen.getByText('होटल वापस जाएँ'));
    // A hotel photographed but never pinned has no area, so रास्ता opens with an empty box
    // rather than a destination invented for it.
    expect(navigate).toHaveBeenCalledWith({ screen: 'transport' });
  });

  it('takes a traveller with no hotel yet straight to capturing one', async () => {
    show(<InfoHomeScreen onMic={noop} />);

    fireEvent.click(await screen.findByText('जोड़ लीजिए — पिन, कार्ड या गेट की फ़ोटो'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'hotelAdd' });
  });

  it('still opens 4.2 once a hotel exists, so a pin can gain the photo a driver needs', async () => {
    await saveHotelCapture({
      pin: { lat: 25.2697, lng: 55.3095 },
      area: { hi: 'देरा', en: 'Deira' },
    });

    show(<InfoHomeScreen onMic={noop} />);

    fireEvent.click(await screen.findByText('देरा'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'hotelAdd' });
  });
});

describe('4.2 · होटल जोड़ें, on a phone that may refuse', () => {
  it('offers यहीं पिन करें before the phone has said anything, and every time', () => {
    // The rule this project paid a day for: nothing here queries a capability. On a browser
    // with no geolocation object at all the button is still live, because only the device gets
    // to say no — and it says it after being asked, not before.
    expect('geolocation' in navigator && navigator.geolocation).toBeFalsy();

    show(<HotelAddScreen onMic={noop} />);

    const pin = screen.getByText('यहीं पिन करें').closest('button');
    expect(pin).toBeTruthy();
    expect(pin?.disabled).toBe(false);
  });

  it('says what happened and leaves both photo options live when the fix does not come', async () => {
    show(<HotelAddScreen onMic={noop} />);

    fireEvent.click(screen.getByText('यहीं पिन करें').closest('button')!);

    expect(
      await screen.findByText('अभी जगह नहीं मिली. नीचे से फ़ोटो ले लीजिए — वह भी काफ़ी है.'),
    ).toBeTruthy();
    // The way through, not just a way out: the two photo rows are the rest of the task.
    expect(screen.getByText('कार्ड की फ़ोटो')).toBeTruthy();
    expect(screen.getByText('गेट की फ़ोटो')).toBeTruthy();
    expect(screen.getByText('यहीं पिन करें').closest('button')?.disabled).toBe(false);
  });

  it('saves a card photo and returns to the shelf, with no pin and no permission', async () => {
    const { container } = show(<HotelAddScreen onMic={noop} />);

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(2);
    choose(inputs[0]!, photo('reception-card'));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'info' });
    });
    expect(await db.hotels.count()).toBe(1);
  });
});

describe('4.3 · दस्तावेज़ जोड़ें', () => {
  it('offers फ़ोटो लें on a browser with no camera API to interrogate', () => {
    // `navigator.mediaDevices` does not exist in this environment. The control is a file
    // input, so there is nothing to gate on and no way for the app to rule the phone out.
    expect('mediaDevices' in navigator).toBe(false);

    show(<DocumentAddScreen onMic={noop} />);
    expect(screen.getByText('फ़ोटो लें')).toBeTruthy();
  });

  it('keeps the document, and it is on the shelf afterwards', async () => {
    const { container } = show(<DocumentAddScreen onMic={noop} />);

    choose(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo('passport'));
    fireEvent.change(screen.getByPlaceholderText('जैसे — यात्रा बीमा'), {
      target: { value: 'पासपोर्ट' },
    });
    fireEvent.click(screen.getByText('रख लें'));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'info' });
    });
    const [saved] = await listDocuments();
    expect(saved?.name).toBe('पासपोर्ट');
    expect(await saved?.photo.text()).toBe('passport');
  });

  it('says what is still missing instead of leaving a dead button to puzzle over', () => {
    show(<DocumentAddScreen onMic={noop} />);
    expect(screen.getByText('फ़ोटो लीजिए और नाम लिखिए — फिर रख लेंगे.')).toBeTruthy();
  });
});

describe('4.4 · दस्तावेज़', () => {
  it('shows the document and its name, with the radio off', async () => {
    const doc = await saveDocument('यात्रा बीमा', photo('insurance'));

    show(<DocumentScreen docId={doc.id} />);

    expect((await screen.findAllByText('यात्रा बीमा')).length).toBeGreaterThan(0);
    // Awaited, not grabbed: the name comes from the row and the src from `useBlobUrl`, which
    // runs an effect later, so the photograph lands one render after the title. Asserting it
    // synchronously passed on a quiet machine and failed in a full suite — a harness race, not
    // a defect in the screen, but the kind that gets called a flake and then ignored.
    expect((await screen.findByRole('img')).getAttribute('src')).toBe('blob:photo');
  });

  it('actually removes the photograph when हटाएँ is pressed', async () => {
    const doc = await saveDocument('पासपोर्ट', photo('passport'));

    show(<DocumentScreen docId={doc.id} />);
    fireEvent.click(await screen.findByText('हटाएँ'));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'info' });
    });
    expect(await db.documents.count()).toBe(0);
  });

  it('says where the document went rather than painting a blank rectangle', async () => {
    show(<DocumentScreen docId="a-document-that-was-deleted" />);
    expect(await screen.findByText('यह दस्तावेज़ अब इस फ़ोन में नहीं है.')).toBeTruthy();
  });
});

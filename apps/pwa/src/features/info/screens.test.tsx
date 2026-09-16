import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { cloneKeepingBlobs } from './blobHarness.js';
import { DocsScreen } from './DocsScreen.js';
import { DocumentAddScreen } from './DocumentAddScreen.js';
import { DocumentScreen } from './DocumentScreen.js';
import { HotelScreen } from './HotelScreen.js';
import { listDocuments, readHotel, saveDocument, saveHotelCapture } from './storage.js';

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

  it('says what happened and keeps everything else when the fix does not come', async () => {
    show(<HotelScreen hotel={undefined} />);
    fireEvent.click(screen.getByText('यहीं पिन लगाएँ').closest('button')!);
    expect(await screen.findByText(/अभी जगह नहीं मिली/)).toBeTruthy();
    expect(screen.getByText('रिसेप्शन का कार्ड')).toBeTruthy();
    expect(screen.getByText('होटल का सामने का हिस्सा')).toBeTruthy();
  });

  it('keeps a card photo with no pin and no permission', async () => {
    const { container } = show(<HotelScreen hotel={undefined} />);
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    choose(inputs[0]!, photo('reception-card'));
    await waitFor(async () => {
      expect(await db.hotels.count()).toBe(1);
    });
    expect(await (await readHotel())?.cardPhoto?.text()).toBe('reception-card');
  });

  it('keeps whatever is typed — room, desk number, a note — without a button', async () => {
    vi.useFakeTimers();
    try {
      show(<HotelScreen hotel={undefined} />);
      fireEvent.change(screen.getByPlaceholderText('होटल का नाम'), {
        target: { value: 'Citymax Bur Dubai' },
      });
      fireEvent.change(screen.getByPlaceholderText('412'), { target: { value: '412' } });
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
    const hotel = await readHotel();
    expect(hotel?.name).toBe('Citymax Bur Dubai');
    expect(hotel?.room).toBe('412');
  });

  it('shows a saved hotel back, and adds a third photograph without losing the first two', async () => {
    const saved = await saveHotelCapture({
      name: 'Citymax',
      cardPhoto: photo('card'),
      gatePhoto: photo('gate'),
    });
    const { container } = show(<HotelScreen hotel={saved} />);
    expect(screen.getByDisplayValue('Citymax')).toBeTruthy();
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    choose(inputs[inputs.length - 1]!, photo('lift'));
    await waitFor(async () => {
      expect((await readHotel())?.photos?.length).toBe(1);
    });
    const hotel = await readHotel();
    expect(await hotel?.cardPhoto?.text()).toBe('card');
    expect(await hotel?.gatePhoto?.text()).toBe('gate');
  });
});

describe('घर.2 · दस्तावेज़', () => {
  it('lists what is kept and offers to add more, with the radio off', async () => {
    await saveDocument('यात्रा बीमा', photo('insurance'));
    show(<DocsScreen />);
    expect(await screen.findByText('यात्रा बीमा')).toBeTruthy();
    fireEvent.click(screen.getByText(/दस्तावेज़ जोड़ें/));
    expect(navigate).toHaveBeenCalledWith({ screen: 'docAdd' });
  });

  it('opens a document from the list', async () => {
    const doc = await saveDocument('पासपोर्ट', photo('passport'));
    show(<DocsScreen />);
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

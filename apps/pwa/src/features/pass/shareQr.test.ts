import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubCanvas } from './canvas.fixture.js';
import { shareFamilyQr } from './shareQr.js';

/**
 * भेजें, as the owner met it: he wanted something to send on WhatsApp and got "a huge URL".
 * What is tested here is the order the ways are tried in, and that each ending is the one the
 * phone actually gave — never a guess made before the sheet was opened.
 *
 * The canvas and the navigator are stubbed; jsdom has neither a 2D context nor a share sheet.
 */

const REQUEST = {
  url: 'https://dubai.saafarsaathi.in/#/pass/eyJhbGciOi.averylongsignedtoken',
  title: 'फ़ोन 2',
  text: 'दुबई साथी का पास — एक फ़ोन के लिए.',
  caption: 'Dubaisaathi · फ़ोन 2',
  fileName: 'dubaisaathi-pass-2.png',
};

/** A navigator with exactly the capabilities this phone is pretending to have. */
function stubNavigator(parts: {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
}) {
  vi.stubGlobal('navigator', parts);
}

const png = () => new Blob(['png'], { type: 'image/png' });

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('भेजें', () => {
  it('sends the QR as a picture when the phone will share a file', async () => {
    stubCanvas(png());
    const shared: ShareData[] = [];
    stubNavigator({
      canShare: () => true,
      share: (data) => {
        shared.push(data);
        return Promise.resolve();
      },
    });

    expect(await shareFamilyQr(REQUEST)).toBe('image');
    const [data] = shared;
    expect(data?.files?.[0]?.name).toBe('dubaisaathi-pass-2.png');
    expect(data?.files?.[0]?.type).toBe('image/png');
    expect(data?.title).toBe('फ़ोन 2');
    // The picture carries the pass; the wall of characters is exactly what must not go with it.
    expect(data?.text).toBe(REQUEST.text);
    expect(data?.text).not.toContain('https://');
    expect(data?.url).toBeUndefined();
  });

  it('falls back to the link when the phone refuses files', async () => {
    stubCanvas(png());
    const shared: ShareData[] = [];
    stubNavigator({
      canShare: () => false,
      share: (data) => {
        shared.push(data);
        return Promise.resolve();
      },
    });

    expect(await shareFamilyQr(REQUEST)).toBe('link');
    expect(shared[0]?.url).toBe(REQUEST.url);
    expect(shared[0]?.files).toBeUndefined();
  });

  it('leaves the traveller the link when the picture cannot be made at all', async () => {
    // `toBlob` answering `null` is a phone that would not encode it — not a reason to give up.
    stubCanvas(null);
    const shared: ShareData[] = [];
    stubNavigator({
      canShare: () => true,
      share: (data) => {
        shared.push(data);
        return Promise.resolve();
      },
    });

    expect(await shareFamilyQr(REQUEST)).toBe('link');
    expect(shared[0]?.url).toBe(REQUEST.url);
    expect(shared[0]?.files).toBeUndefined();
  });

  it('copies the link when there is no share sheet on this browser', async () => {
    stubCanvas(png());
    const copied: string[] = [];
    stubNavigator({
      clipboard: {
        writeText: (text) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });

    expect(await shareFamilyQr(REQUEST)).toBe('copied');
    expect(copied).toEqual([REQUEST.url]);
  });

  it('says nothing when the traveller closes the sheet, and does not copy behind their back', async () => {
    stubCanvas(png());
    const copied: string[] = [];
    stubNavigator({
      canShare: () => true,
      share: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
      clipboard: {
        writeText: (text) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });

    expect(await shareFamilyQr(REQUEST)).toBe('dismissed');
    expect(copied).toEqual([]);
  });

  it('walks a failing file share to the link, and a failing link share to the clipboard', async () => {
    stubCanvas(png());
    const copied: string[] = [];
    const seen: ShareData[] = [];
    stubNavigator({
      canShare: () => true,
      share: (data) => {
        seen.push(data);
        return Promise.reject(new Error('NotAllowedError'));
      },
      clipboard: {
        writeText: (text) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });

    expect(await shareFamilyQr(REQUEST)).toBe('copied');
    // Both ways were actually tried on the device before anything was called impossible.
    expect(seen).toHaveLength(2);
    expect(seen[0]?.files).toBeDefined();
    expect(seen[1]?.url).toBe(REQUEST.url);
    expect(copied).toEqual([REQUEST.url]);
  });

  it('says so plainly when the phone offers neither a sheet nor a clipboard', async () => {
    stubCanvas(png());
    stubNavigator({});

    expect(await shareFamilyQr(REQUEST)).toBe('refused');
  });
});

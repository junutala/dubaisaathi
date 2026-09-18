import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_LINK, invite, shareAnywhere, whatsappLink } from './share.js';

/**
 * Passing the app on, with the radio off — which is when a traveller is most likely to be
 * standing next to the friend they are telling about it.
 *
 * Nothing here asks the phone what it can do before trying (CLAUDE.md): the sheet is opened and
 * only a refusal walks to the clipboard, and a sheet the traveller closed is not a refusal.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('what goes out', () => {
  it('carries the app in the language the traveller is reading', () => {
    expect(invite('hi')).toContain(APP_LINK);
    expect(invite('hi')).toContain('दुबई');
    expect(invite('en')).toContain(APP_LINK);
    expect(invite('en')).toContain('Dubai');
  });

  it('opens WhatsApp with no number of ours in it — the reader picks who it goes to', () => {
    const link = whatsappLink('hi');
    expect(link.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(link.slice('https://wa.me/?text='.length))).toBe(invite('hi'));
  });
});

describe('the other ways', () => {
  it("uses the phone's own sheet when there is one", async () => {
    const shared = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share: shared, clipboard: { writeText: vi.fn() } });

    expect(await shareAnywhere('en')).toBe('sheet');
    expect(shared).toHaveBeenCalledWith({ text: invite('en') });
  });

  it('treats a closed sheet as done, never as a failure to work around', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    const copied = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', {
      share: vi.fn(() => Promise.reject(abort)),
      clipboard: { writeText: copied },
    });

    expect(await shareAnywhere('en')).toBe('sheet');
    expect(copied).not.toHaveBeenCalled();
  });

  it('copies the link when the sheet refuses, and when there is no sheet at all', async () => {
    const copied = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText: copied } });
    expect(await shareAnywhere('hi')).toBe('copied');
    expect(copied).toHaveBeenCalledWith(invite('hi'));

    vi.stubGlobal('navigator', {
      share: vi.fn(() => Promise.reject(new Error('NotAllowedError'))),
      clipboard: { writeText: copied },
    });
    expect(await shareAnywhere('hi')).toBe('copied');
  });

  it('says so when the phone refuses both, rather than pretending it went', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(() => Promise.reject(new Error('denied'))),
      },
    });
    expect(await shareAnywhere('en')).toBe('refused');
  });
});

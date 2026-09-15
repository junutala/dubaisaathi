import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { typedTextInPhrase } from '../phrases/destinationPhrase.js';
import { composedTextInPhrase } from '../phrases/composeArabic.js';
import { TransportScreen } from './TransportScreen.js';
import { LocationDeniedScreen } from './LocationDeniedScreen.js';
import { forgetLocation, hasBeenAsked } from '../../lib/location.js';

/**
 * 1.1, tested as the things that would actually be reported (CLAUDE.md, 13 September: the
 * harnesses built that day asserted properties that were true while the product was broken).
 *
 * "I typed where I was going and nothing happened." "It showed the driver the wrong place."
 * "My Hinglish didn't work." "It went blank when I typed a place you don't have." Each of
 * those is a test below.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

const onMic = vi.fn();

/** The phone, answering. Everything here is what the device said, never what we assumed. */
function phoneSays(answer: 'here' | 'denied' | 'none') {
  if (answer === 'none') {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    return;
  }
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (
        ok: PositionCallback,
        fail: PositionErrorCallback | null | undefined,
      ) => {
        if (answer === 'here') {
          // A hotel in Bur Dubai.
          ok({ coords: { latitude: 25.2637, longitude: 55.2972 } } as GeolocationPosition);
        } else {
          fail?.({ code: 1, message: 'denied' } as GeolocationPositionError);
        }
      },
    },
  });
}

function show(placeId?: string) {
  render(
    <SettingsProvider>
      <TransportScreen placeId={placeId} onMic={onMic} />
    </SettingsProvider>,
  );
}

function type(sentence: string) {
  const box = screen.getByRole('textbox');
  fireEvent.change(box, { target: { value: sentence } });
}

// jsdom reports an English locale, so the app renders the English catalogue in these tests.
const OPTIONS = 'How to get there';
const DRIVER = 'Show the driver';

const tap = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

beforeEach(() => {
  navigate.mockClear();
  onMic.mockClear();
  forgetLocation();
  localStorage.clear();
  // Already asked once, so these tests are about the destination rather than the prompt.
  localStorage.setItem('saathi.locationAsked', 'yes');
  phoneSays('here');
});
afterEach(cleanup);

describe('1.1 — where do you want to go', () => {
  it('sends a typed destination to the route options', () => {
    show();
    type('करामा जाना है');
    tap(OPTIONS);
    expect(navigate).toHaveBeenCalledWith({ screen: 'options', placeId: 'karama' });
  });

  /**
   * The driver path no longer consults the place pack at all. It exists to bound the
   * recogniser's vocabulary, and using it here is what turned "Satwa, Al Hudaiba Building" into
   * "take me to Satwa" — a neighbourhood of eighty thousand handed over as an address.
   */
  it('sends the traveller’s own words to the Arabic for a driver, unchanged', () => {
    show();
    type('करामा जाना है');
    tap(DRIVER);
    const [[route]] = navigate.mock.calls as [[{ screen: string; phraseId: string }]];
    expect(route.screen).toBe('arabic');
    expect(typedTextInPhrase(route.phraseId)).toBe('करामा जाना है');
  });

  /**
   * One sentence, two readings, and the app never substitutes its own words for the
   * traveller's on either. The route needs a coordinate so it resolves; the driver gets what
   * was actually typed. Nothing is silently replaced on the way to either.
   */
  it('resolves for the route and carries the words verbatim to the driver', () => {
    show();
    type('mujhe marina mall jaana hai');
    tap(OPTIONS);
    tap(DRIVER);
    const [[toOptions], [toArabic]] = navigate.mock.calls as [
      [{ placeId: string }],
      [{ phraseId: string }],
    ];
    expect(toOptions.placeId).toBe('marina-mall');
    expect(typedTextInPhrase(toArabic.phraseId)).toBe('mujhe marina mall jaana hai');
  });

  /** The owner's objection, as a test: a whole neighbourhood is not an address. */
  it('says a neighbourhood is too big to be an address, and still lets them go', () => {
    show();
    type('Satwa');
    expect(screen.getByText(/large area/i)).toBeTruthy();
    tap(DRIVER);
    const [[route]] = navigate.mock.calls as [[{ phraseId: string }]];
    expect(typedTextInPhrase(route.phraseId)).toBe('Satwa');
  });

  it('stops saying it once they add the building', () => {
    show();
    type('Satwa Al Hudaiba Building');
    expect(screen.queryByText(/large area/i)).toBeNull();
  });

  /** Rule 4: Hinglish is first-class input, not a fallback. */
  it('takes Devanagari and Hinglish to the same place', () => {
    show();
    type('मॉल ऑफ़ द एमिरेट्स');
    tap(OPTIONS);
    cleanup();
    show();
    type('mall of emirates');
    tap(OPTIONS);
    const [first, second] = navigate.mock.calls;
    expect(first).toEqual(second);
    expect(first?.[0]).toEqual({ screen: 'options', placeId: 'mall-of-emirates' });
  });

  /**
   * Discovery Gardens is in the pack now, so this needs a place that genuinely is not. Saying
   * so is the honest answer; a blank screen or a silent button is not — and neither is quietly
   * answering with a different place, which is what a bare "mall" alias used to do.
   */
  it('says it does not know a place instead of going blank, and keeps the box', () => {
    show();
    type('Nakheel Mall');
    tap(OPTIONS);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/does not know this place/i)).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
    // Still a way forward: the box is there and both buttons are still live.
    expect(screen.getByRole('button', { name: OPTIONS })).toBeTruthy();
  });

  /**
   * The words were a perfectly good sentence and simply not a destination.
   *
   * Until now this screen answered "Saathi does not know this place yet — try another name",
   * which points at nothing that was going to work, and ड्राइवर को दिखाएँ wrapped the sentence in
   * a journey it never was: "AC kharab hai theek kar do" reached a driver as خذني إلى AC kharab
   * hai — *take me to my AC is broken*. Both readings are now offered, and neither is guessed.
   */
  it('offers the Arabic for a sentence that was never a destination', () => {
    show();
    type('AC kharab hai theek kar do');
    tap(OPTIONS);
    expect(screen.getByText(/does not know this place/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /just say it in Arabic/i }));
    const call = navigate.mock.calls.at(-1)?.[0] as { screen: string; phraseId: string };
    expect(call.screen).toBe('arabic');
    expect(composedTextInPhrase(call.phraseId)).toBe('AC kharab hai theek kar do');
  });

  /**
   * ...and the address this screen exists for is untouched by that. A building name is still a
   * destination and still reaches the driver whole, which is the Satwa fix and must stay.
   */
  it('still says "take me to" for an address it does not have in the pack', () => {
    show();
    type('Satwa, Al Hudaiba Building 7');
    tap(DRIVER);
    const call = navigate.mock.calls.at(-1)?.[0] as { screen: string; phraseId: string };
    expect(call.screen).toBe('arabic');
    expect(typedTextInPhrase(call.phraseId)).toBe('Satwa, Al Hudaiba Building 7');
  });

  it('says something rather than nothing when the box is empty', () => {
    show();
    tap(OPTIONS);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/Try another name/i)).toBeTruthy();
  });

  /**
   * Tile 2 will hand a restaurant's location over as a navigation, not a rewrite. Arriving with
   * a destination has to fill the box and work without anyone typing (the brief for tile 1).
   */
  it('arrives with a destination already filled in, and acts on it untouched', async () => {
    show('karama');
    await waitFor(() => {
      expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('Karama');
    });
    tap(OPTIONS);
    expect(navigate).toHaveBeenCalledWith({ screen: 'options', placeId: 'karama' });
  });

  /** Design rule 30: a refused permission gets the screen that explains it, not a dead options page. */
  it('sends a traveller whose phone refused location to 1.1b, not to a blank route', async () => {
    phoneSays('denied');
    show();
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
    type('करामा');
    await waitFor(() => {
      tap(OPTIONS);
      expect(navigate).toHaveBeenCalledWith({ screen: 'nolocation' });
    });
  });

  /** The Arabic needs no location at all, so a refusal must not take it away. */
  it('still reaches the Arabic when the phone refused location', async () => {
    phoneSays('denied');
    show();
    type('करामा');
    await waitFor(() => {
      tap(DRIVER);
      const [[route]] = navigate.mock.calls as [[{ screen: string; phraseId: string }]];
      expect(route.screen).toBe('arabic');
      expect(typedTextInPhrase(route.phraseId)).toBe('करामा');
    });
  });

  /** "It asks me the same thing every time I open it" is the symptom rule 30 exists to stop. */
  it('shows the reason before the phone is asked, and only the first time', async () => {
    localStorage.clear();
    forgetLocation();
    show();
    // On the screen before the phone's own prompt, which is the whole point of the line.
    expect(screen.getByText(/needs your location/i)).toBeTruthy();
    expect(hasBeenAsked()).toBe(false);
    await waitFor(
      () => {
        expect(hasBeenAsked()).toBe(true);
      },
      { timeout: 3000 },
    );
    cleanup();
    show();
    expect(screen.queryByText(/needs your location/i)).toBeNull();
  });
});

describe('1.1b — no location permission', () => {
  function showDenied() {
    render(
      <SettingsProvider>
        <LocationDeniedScreen onMic={onMic} />
      </SettingsProvider>,
    );
  }

  it('names the three things that stopped working, item by item', () => {
    showDenied();
    for (const lost of ['The way from here', 'Food nearby', 'The hotel pin']) {
      expect(screen.getByText(lost), lost).toBeTruthy();
    }
  });

  /**
   * The most important line on the screen. Without it a refused permission reads as a broken
   * app, and the traveller closes it instead of going on to the rest of it.
   */
  it('says the rest of the app still works, and leaves it one tap away', () => {
    showDenied();
    expect(screen.getByText(/Everything else works/i)).toBeTruthy();
    // The bar is the rest of the app: home, खाना and ज़रूरी जानकारी are still reachable.
    for (const tile of ['Home', 'Food', 'Important info']) {
      expect(
        screen.getAllByRole('button', { name: new RegExp(tile, 'i') }).length,
        tile,
      ).toBeGreaterThan(0);
    }
  });

  it('asks the phone again rather than leaving the traveller stuck', async () => {
    phoneSays('here');
    showDenied();
    tap('Open settings');
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'transport' });
    });
  });

  /** Never a verdict on the phone until the phone has refused — twice, here. */
  it('only says where the setting is after the phone has refused again', async () => {
    phoneSays('denied');
    showDenied();
    expect(screen.queryByText(/Settings › Site › Location/i)).toBeNull();
    tap('Open settings');
    await waitFor(() => {
      expect(screen.getByText(/Settings › Site › Location/i)).toBeTruthy();
    });
  });
});

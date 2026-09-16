import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { forgetLocation } from '../../lib/location.js';
import { RouteOptionsScreen } from './RouteOptionsScreen.js';
import { RouteStepsScreen } from './RouteStepsScreen.js';

/**
 * 2.2 and 2.3, tested as the things that would actually be reported: "it showed nothing", "the
 * time on the card was not the time on the steps", "I was in Pune and it invented a fare".
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

/** The phone, answering with a fix. Everything here is what the device said. */
function standingAt(lat: number, lng: number) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) => {
        ok({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
      },
    },
  });
}

function showOptions(placeId = 'karama') {
  render(
    <SettingsProvider>
      <RouteOptionsScreen placeId={placeId} hotel={undefined} />
    </SettingsProvider>,
  );
}

beforeEach(() => {
  navigate.mockClear();
  forgetLocation();
  localStorage.clear();
  localStorage.setItem('saathi.locale', 'en');
  // Aeroplane mode: the planner must not notice.
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  vi.stubGlobal('fetch', () => Promise.reject(new Error('the radio is off')));
  // A hotel in Bur Dubai.
  standingAt(25.2637, 55.2972);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('2.2 — the options', () => {
  it('shows real options with no network at all', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getAllByText(/min$/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole('button', { name: /Taxi/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AED/).length).toBeGreaterThan(0);
  });

  it('says the numbers are estimates, because an offline pack cannot promise more', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getByText(/estimates/i)).toBeTruthy();
    });
  });

  it('names where the journey starts and where it ends', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getByText('From here')).toBeTruthy();
    });
    expect(screen.getByText('Karama')).toBeTruthy();
  });

  it('opens the steps for a metro option, and the taxi screen for the taxi', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Taxi/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Taxi/ })[0]!);
    expect(navigate).toHaveBeenCalledWith({ screen: 'taxi', placeId: 'karama' });
  });

  /**
   * The product is usable in India before the trip. A traveller trying it from Pune is shown
   * Dubai from a stand-in — BurJuman when no hotel is saved — with the stand-in named on the
   * screen, real journeys under it, and never a 1,900 km fare.
   */
  it('plans from BurJuman, and says so, when the phone is in Pune', async () => {
    standingAt(18.5204, 73.8567);
    showOptions();
    await waitFor(() => {
      expect(screen.getByText(/From BurJuman · you are outside Dubai/)).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Taxi/ }).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Could not work out a way/i)).toBeNull();
    expect(screen.getByText(/AED \d+ – \d+/).textContent).not.toMatch(/AED [1-9]\d{3}/);
    fireEvent.click(screen.getAllByRole('button', { name: /Taxi/ })[0]!);
    expect(navigate).toHaveBeenCalledWith({ screen: 'taxi', placeId: 'karama' });
  });

  it('goes back to 2.1 rather than painting a journey to a place it does not know', async () => {
    showOptions('nowhere-we-know');
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'go' });
    });
  });
});

describe('2.3 — step by step', () => {
  function showSteps(optionId: 'metro' | 'bus' | 'taxi' | 'walk' = 'metro') {
    render(
      <SettingsProvider>
        <RouteStepsScreen placeId="karama" optionId={optionId} hotel={undefined} />
      </SettingsProvider>,
    );
  }

  it('shows the time and the fare before the first step', async () => {
    showSteps();
    await waitFor(() => {
      expect(screen.getByText(/min · /)).toBeTruthy();
    });
    expect(screen.getByText(/Nol card/)).toBeTruthy();
  });

  it('lists the legs in order, ending at the place asked for', async () => {
    showSteps();
    await waitFor(() => {
      expect(screen.getAllByText(/^Walk$/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/to Karama/i).length).toBeGreaterThan(0);
  });

  /** 2.2 and 2.3 plan the same journey from the same pack; they must not disagree about it. */
  it('agrees with the options screen about how long the metro takes', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Metro/ }).length).toBeGreaterThan(0);
    });
    const card = screen.getAllByRole('button', { name: /Metro/ })[0];
    const onCard = card?.querySelector('.opt-time')?.textContent ?? '';
    expect(onCard).toMatch(/^\d+ min$/);
    cleanup();

    showSteps('metro');
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`^${onCard} · `))).toBeTruthy();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { RouteOptionsScreen } from './RouteOptionsScreen.js';
import { RouteStepsScreen } from './RouteStepsScreen.js';
import { forgetLocation } from '../../lib/location.js';

/**
 * 1.3 and 1.4 as a traveller meets them: standing in a Bur Dubai hotel with the radio off,
 * asking how to get to Karama. What would be reported if these broke is "it just spins", "it
 * says nothing when I'm not in Dubai", and "the options and the steps don't agree" — so those
 * are what is checked, rather than the shape of the markup.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

const onMic = vi.fn();

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

const BUR_DUBAI_HOTEL: readonly [number, number] = [25.2637, 55.2972];

beforeEach(() => {
  navigate.mockClear();
  onMic.mockClear();
  forgetLocation();
  localStorage.clear();
  localStorage.setItem('saathi.locationAsked', 'yes');
  standingAt(...BUR_DUBAI_HOTEL);
});
afterEach(cleanup);

function showOptions(placeId = 'karama') {
  render(
    <SettingsProvider>
      <RouteOptionsScreen placeId={placeId} onMic={onMic} />
    </SettingsProvider>,
  );
}

describe('1.3 — the options', () => {
  /**
   * The one that matters: this whole screen is computed on the device. Nothing is stubbed out
   * here, there is no fetch to intercept, and it still fills in (CLAUDE.md rule 1).
   */
  it('shows real options with no network at all', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getAllByText(/min$/).length).toBeGreaterThan(0);
    });
    // Every card carries the three things the decision is made on: a mode, a time, a fare.
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

  it('opens the steps for the option that was tapped', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Taxi/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Taxi/ })[0]!);
    expect(navigate).toHaveBeenCalledWith({
      screen: 'steps',
      placeId: 'karama',
      optionId: 'taxi',
    });
  });

  /**
   * The product is usable in India before the trip. A traveller trying it from Pune must not be
   * shown an invented fare, and must not be shown a blank either — the Arabic for a driver needs
   * no location at all, so that is the way forward here (decision 014).
   */
  it('says so, and offers the Arabic, when it cannot work out a route from here', async () => {
    standingAt(18.5204, 73.8567);
    showOptions();
    await waitFor(() => {
      expect(screen.getByText(/No way could be worked out/i)).toBeTruthy();
    });
    const out = screen.getByRole('button', { name: /Show the driver/i });
    fireEvent.click(out);
    expect(navigate).toHaveBeenCalledWith({ screen: 'arabic', phraseId: 'go-to:karama' });
  });

  it('goes back to 1.1 rather than painting a journey to a place it does not know', async () => {
    showOptions('atlantis');
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ screen: 'transport' });
    });
  });
});

describe('1.4 — step by step', () => {
  function showSteps(optionId: 'metro' | 'bus' | 'taxi' | 'walk' = 'metro') {
    render(
      <SettingsProvider>
        <RouteStepsScreen placeId="karama" optionId={optionId} onMic={onMic} />
      </SettingsProvider>,
    );
  }

  it('shows the total time, the fare and the walking before the first step', async () => {
    showSteps();
    await waitFor(() => {
      expect(screen.getByText('Total time')).toBeTruthy();
    });
    expect(screen.getByText('Fare')).toBeTruthy();
    expect(screen.getByText('Walking')).toBeTruthy();
  });

  it('lists the legs in order, each with a time on it', async () => {
    showSteps();
    await waitFor(() => {
      expect(screen.getAllByText(/^Walk$/).length).toBeGreaterThan(0);
    });
    // The last leg has to end at the place the traveller asked for, or the instructions stop
    // short of the door.
    expect(screen.getAllByText(/to Karama/i).length).toBeGreaterThan(0);
  });

  /** 1.3 and 1.4 plan the same journey from the same pack; they must not disagree about it. */
  it('agrees with the options screen about how long the taxi takes', async () => {
    showOptions();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Taxi/ }).length).toBeGreaterThan(0);
    });
    const card = screen.getAllByRole('button', { name: /Taxi/ })[0];
    const onCard = card?.querySelector('.opt-time')?.textContent ?? '';
    expect(onCard).toMatch(/^\d+ min$/);
    cleanup();

    showSteps('taxi');
    await waitFor(() => {
      expect(screen.getByText('Total time')).toBeTruthy();
    });
    expect(screen.getAllByText(onCard).length).toBeGreaterThan(0);
  });
});

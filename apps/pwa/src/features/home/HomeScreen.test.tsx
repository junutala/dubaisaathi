import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { HomeScreen } from './HomeScreen.js';

/**
 * घर is the tiles and nothing else, and this is the guard on that.
 *
 * A box lived here for most of 14 September and had to come off. It could not do what the boxes
 * on रास्ता and खाना do, because those screens give a sentence its meaning and home cannot:
 * "Discovery Gardens jaana hai" is *show me the transport* in a hotel room and *tell the driver*
 * at a taxi door (decision 014). रास्ता serves both readings by asking; home would have to guess,
 * and that question was never settled because it cannot be.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

function show() {
  render(
    <SettingsProvider>
      <HomeScreen />
    </SettingsProvider>,
  );
}

beforeEach(() => {
  navigate.mockClear();
});
afterEach(cleanup);

describe('घर', () => {
  /** The regression this file exists for. */
  it('offers no box and no mic, because neither can resolve here', () => {
    show();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /speaking|साथी से पूछिए|mic/i })).toBeNull();
  });

  it('shows three tiles, and बोलना is not one of them', () => {
    show();
    expect(screen.getByText('Getting around')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Important info')).toBeTruthy();
    expect(screen.queryByText('Speaking')).toBeNull();
    expect(screen.queryByText('बोलना')).toBeNull();
  });

  /** Each tile opens the screen whose box already knows what a sentence typed into it is for. */
  it.each([
    ['Getting around', { screen: 'transport' }],
    ['Food', { screen: 'food' }],
    ['Important info', { screen: 'info' }],
  ])('%s opens its own screen', (label, route) => {
    show();
    fireEvent.click(screen.getByText(label));
    expect(navigate).toHaveBeenCalledWith(route);
  });
});

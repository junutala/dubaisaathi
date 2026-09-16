import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { HomeScreen } from './HomeScreen.js';

/**
 * घर is the three pillars and, from the twentieth hour, the nudge. Nothing else: no box and no
 * microphone, which is the regression this file exists to catch.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

function show(nudge = false, hours = 18) {
  render(
    <SettingsProvider>
      <HomeScreen validity={{ state: 'trial', percent: 50, hours }} nudge={nudge} />
    </SettingsProvider>,
  );
}

beforeEach(() => {
  navigate.mockClear();
});
afterEach(cleanup);

describe('घर', () => {
  it('offers no box and no mic', () => {
    show();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /mic|बोल/i })).toBeNull();
  });

  it('shows the three pillars by their Devanagari names in the English interface too', () => {
    show();
    for (const name of ['खाना', 'जाना', 'जानना']) expect(screen.getByText(name)).toBeTruthy();
  });

  it.each([
    ['खाना', { screen: 'food' }],
    ['जाना', { screen: 'go' }],
    ['जानना', { screen: 'know' }],
  ])('%s opens its own screen', (label, route) => {
    show();
    fireEvent.click(screen.getByText(label));
    expect(navigate).toHaveBeenCalledWith(route);
  });

  it('nudges toward a pass only when told to, and the nudge opens घर.4', () => {
    show(false);
    expect(screen.queryByText(/free day/)).toBeNull();
    cleanup();
    show(true, 4);
    expect(screen.getByText('Your free day ends in 4 hours')).toBeTruthy();
    fireEvent.click(screen.getByText('Get pass'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'pass' });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { parseRoute, href } from '../../app/routes.js';
import { db } from '../../db/schema.js';
import shipped from '../../../../../data/transport/fares.v1.json';
import { parseFarePack } from '../transport/index.js';
import { KnowScreen } from './KnowScreen.js';
import { NolScreen } from './NolScreen.js';

/**
 * जानना on tabs, and 3.4 · Nol कार्ड (decision 037), tested with the radio off — every figure
 * on the page is the fares pack's, so a traveller in a metro station with no signal reads the
 * same prices the machine in front of them charges.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

beforeEach(async () => {
  navigate.mockClear();
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.locale', 'en');
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('जानना · the tabs', () => {
  it('shows the tabs that have something behind them, and no empty one', () => {
    render(
      <SettingsProvider>
        <KnowScreen tab="places" />
      </SettingsProvider>,
    );
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual(['Attractions', 'Local travel']);
  });

  it('lists the Nol card under Local travel and opens it', () => {
    render(
      <SettingsProvider>
        <KnowScreen tab="travel" />
      </SettingsProvider>,
    );
    fireEvent.click(screen.getByText('Nol card'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'tip', tipId: 'nol' });
  });

  it('keeps the tab in the address, so the back arrow returns to it', () => {
    expect(parseRoute(href({ screen: 'know', tab: 'travel' }))).toEqual({
      screen: 'know',
      tab: 'travel',
    });
    expect(parseRoute('#/tip/nol')).toEqual({ screen: 'tip', tipId: 'nol' });
    expect(parseRoute('#/tip/nothing')).toEqual({ screen: 'know', tab: 'travel' });
  });
});

describe('3.4 · Nol कार्ड', () => {
  it('prints the board’s figures, from the pack, with no network', () => {
    render(
      <SettingsProvider>
        <NolScreen />
      </SettingsProvider>,
    );
    const page = document.body.textContent;
    // The red ticket's issue charge, the day ticket, a pass and the children's rule — the four
    // things the BurJuman board says that a route's fare alone does not.
    expect(page).toContain('It costs AED 2 to issue');
    expect(page).toContain('AED 20, or AED 40 in Gold Class');
    expect(page).toContain('Children under 5, or shorter than 90 cm');
    const silverPasses = screen.getAllByRole('table')[1]!;
    expect(silverPasses.textContent).toContain('7 days');
    expect(silverPasses.textContent).toContain('AED 50');
    expect(silverPasses.textContent).toContain('AED 2670');
  });
});

describe('the fares pack', () => {
  it('refuses a pass that costs less for more zones', () => {
    const bad = structuredClone(shipped) as {
      passes: { regular: { days7: { twoZones: number } } };
    };
    bad.passes.regular.days7.twoZones = 10;
    expect(() => parseFarePack(bad)).toThrow(/charges less/);
  });

  it('still reads a pack published before the passes were added', () => {
    const old = structuredClone(shipped) as Record<string, unknown>;
    delete old.passes;
    delete old.dayTicket;
    delete old.redTicketIssueAed;
    expect(() => parseFarePack(old)).not.toThrow();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../../app/settings.js';
import { HomeScreen } from './HomeScreen.js';
import type { HomeTileState } from './HomeTile.js';

/**
 * घर is the three pillars with the tiles under them (decisions 018 and 020). No box, and no
 * microphone on घर itself — बोलना is a tile that leads to its own screen, and it is on घर only
 * while the phone is online, which is what the last two tests here hold to. The pass tile says
 * the right thing in every state of the counter, because it is the one place the revenue action
 * is seen without looking for it.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

const TRIAL: HomeTileState = {
  validity: { state: 'trial', percent: 50, hours: 18 },
  nudge: false,
  paid: false,
  slots: 1,
  online: false,
};

function show(tile: Partial<HomeTileState> = {}) {
  render(
    <SettingsProvider>
      <HomeScreen tile={{ ...TRIAL, ...tile }} />
    </SettingsProvider>,
  );
}

beforeEach(() => {
  navigate.mockClear();
  localStorage.setItem('saathi.locale', 'hi');
});
afterEach(cleanup);

describe('घर', () => {
  it('offers no box, and no way to speak when there is no signal', () => {
    show();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /mic|बोल/i })).toBeNull();
  });

  it('shows the three pillars by their Devanagari names in the English interface too', () => {
    localStorage.setItem('saathi.locale', 'en');
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

  it('puts the pass tile after the pillars, and a tap opens घर.4', () => {
    show();
    const tile = screen.getByText('18 घंटे बाक़ी · पास लें');
    const pillars = screen.getByText('जानना');
    // The tile comes after the last pillar in the document, above the bar.
    expect(pillars.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(tile);
    expect(navigate).toHaveBeenCalledWith({ screen: 'pass' });
  });

  it.each<[string, Partial<HomeTileState>, string]>([
    [
      'before landing',
      { validity: { state: 'before', percent: 100 } },
      'दुबई में 24 घंटे मुफ़्त · पास ₹199 से',
    ],
    ['in the trial', {}, '18 घंटे बाक़ी · पास लें'],
    [
      'when the free day is over',
      { validity: { state: 'expired', percent: 0 }, nudge: true },
      'मुफ़्त दिन पूरा · पास लें',
    ],
    [
      'with a free code waiting',
      { pendingCode: { code: 'SS7K3M2X', free: true } },
      'आपका कोड SS7K3M2X · मुफ़्त पास लें',
    ],
    [
      'with a partial code waiting',
      { pendingCode: { code: 'OP4HXR9B', free: false } },
      'आपका कोड OP4HXR9B · पास लें',
    ],
    [
      'paid, one phone',
      { paid: true, validity: { state: 'pass', percent: 80, days: 12 } },
      'पास · 12 दिन बाक़ी',
    ],
    [
      'paid, a family',
      { paid: true, slots: 3, validity: { state: 'pass', percent: 80, days: 12 } },
      'पास · 12 दिन बाक़ी · परिवार के लिए QR',
    ],
    [
      'paid and over',
      { paid: true, validity: { state: 'expired', percent: 0 } },
      'पास पूरा · सब चलता रहेगा',
    ],
  ])('says the right thing %s', (_name, tile, line) => {
    show(tile);
    expect(screen.getByText(line)).toBeTruthy();
  });

  it('shows बोलना while the phone is online, and never without a signal', () => {
    show({ online: true });
    expect(screen.getByText('बोलना — किसी भी भाषा में')).toBeTruthy();
    fireEvent.click(screen.getByText('बोलना — किसी भी भाषा में'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'bolna' });
    cleanup();
    show({ online: false });
    expect(screen.queryByText('बोलना — किसी भी भाषा में')).toBeNull();
  });

  it('puts बोलना on घर the moment the signal comes back, with no reload', () => {
    // The wiring App itself uses: the settings provider listens for `online` and `offline`, and
    // the tile's `visible` predicate reads what it heard. A tile that lied about being available
    // is the defect this arrangement exists to avoid.
    function Live() {
      const { online } = useSettings();
      return <HomeScreen tile={{ ...TRIAL, online }} />;
    }
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(
      <SettingsProvider>
        <Live />
      </SettingsProvider>,
    );
    expect(screen.queryByText('बोलना — किसी भी भाषा में')).toBeNull();

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByText('बोलना — किसी भी भाषा में')).toBeTruthy();

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.queryByText('बोलना — किसी भी भाषा में')).toBeNull();
  });

  it('warms from the twentieth hour and is never red', () => {
    show({ validity: { state: 'trial', percent: 17, hours: 4 }, nudge: true });
    const tile = screen.getByText('4 घंटे बाक़ी · पास लें').closest('button');
    expect(tile?.className).toBe('home-tile home-tile-warm');
    cleanup();
    show();
    expect(screen.getByText('18 घंटे बाक़ी · पास लें').closest('button')?.className).toBe(
      'home-tile',
    );
  });
});

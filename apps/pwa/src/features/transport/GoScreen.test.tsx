import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { GoScreen } from './GoScreen.js';

/**
 * 2.1, tested as the things a traveller would report: "I typed the place and nothing happened",
 * "I mistyped it and it took me somewhere else", "it went blank on a place you don't have".
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

function show(placeId?: string) {
  render(
    <SettingsProvider>
      <GoScreen placeId={placeId} />
    </SettingsProvider>,
  );
}

function type(words: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: words } });
}

beforeEach(async () => {
  navigate.mockClear();
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.locale', 'hi');
});
afterEach(cleanup);

describe('2.1 · जाना', () => {
  it('opens the options for a place we know, in either script', () => {
    show();
    type('करामा');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith({ screen: 'options', placeId: 'karama' });
  });

  it('asks before acting on a near spelling, with the place in Devanagari', () => {
    show();
    type('Burjman');
    expect(screen.getByText(/क्या आपका मतलब बुरजुमान है\?/)).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('हाँ'));
    expect(navigate).toHaveBeenCalledWith({ screen: 'options', placeId: 'burjuman' });
  });

  it('says plainly when the place is not one we have, and offers the taxi with the words as typed', () => {
    show();
    type('Wafi Mall ko jaana hai');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.getByText(/यह जगह अभी साथी के पास नहीं है/)).toBeTruthy();
    fireEvent.click(screen.getByText('टैक्सी से जाएँ'));
    expect(navigate).toHaveBeenCalledWith({
      screen: 'taxi',
      placeId: `text:${encodeURIComponent('Wafi Mall ko jaana hai')}`,
    });
  });

  it('arrives with the box filled when a place is handed in', () => {
    show('burj-khalifa');
    expect(screen.getByDisplayValue('बुर्ज ख़लीफ़ा')).toBeTruthy();
  });

  it('lists the places of Dubai under the box, each a tap away', () => {
    show();
    fireEvent.click(screen.getAllByText('दुबई फ़्रेम')[0]!);
    expect(navigate).toHaveBeenCalledWith({ screen: 'options', placeId: 'dubai-frame' });
  });
});

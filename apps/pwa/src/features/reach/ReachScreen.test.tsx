import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { ReachScreen } from './ReachScreen.js';
import { invite } from './share.js';

/**
 * घर.7, with the radio off — which is the condition it exists for. A traveller in a Karama
 * basement who has just failed to find a dish is exactly the person with something to tell us,
 * and a box that refuses them is worse than no box.
 *
 * So `fetch` throws in every test here, as it does in aeroplane mode, and the screen still has
 * to take the message, say it has it, and say what happens next.
 */

function show() {
  return render(
    <SettingsProvider>
      <ReachScreen />
    </SettingsProvider>,
  );
}

function type(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function fillIn() {
  type(/नाम/, 'अरुण');
  type(/नंबर/, '+91 98765 43210');
  type(/आपकी बात/, 'करामा में साबूदाना खिचड़ी कहाँ मिलेगी?');
  fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));
  await waitFor(async () => {
    expect(await db.messages.count()).toBe(1);
  });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.locale', 'hi');
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('telling us something', () => {
  it('keeps the message on the phone when there is no signal, and says so', async () => {
    show();
    await fillIn();

    const kept = await db.messages.toArray();
    expect(kept[0]?.name).toBe('अरुण');
    // Digits only, the dialling code taken off — the function will not take it otherwise.
    expect(kept[0]?.phone).toBe('9876543210');
    expect(kept[0]?.country).toBe('IN');
    expect(kept[0]?.synced).toBe(false);

    expect(await screen.findByText(/मिल गई/)).toBeTruthy();
    expect(await screen.findByText(/सिग्नल आते ही/)).toBeTruthy();
  });

  it('says it has reached us only once the server has taken it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{"saved":true}', { status: 200 }))),
    );
    show();
    await fillIn();

    expect(await screen.findByText(/हम तक पहुँच गई/)).toBeTruthy();
    expect(await db.messages.where('id').notEqual('').first()).toMatchObject({ synced: true });
  });

  it('asks for what is missing, one field at a time, and never loses what was typed', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));
    expect(screen.getByText(/नाम लिख दीजिए/)).toBeTruthy();

    type(/नाम/, 'अरुण');
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));
    expect(screen.getByText(/नंबर पूरा लिख दीजिए/)).toBeTruthy();

    type(/नंबर/, '9876543210');
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));
    expect(screen.getByText(/कहना क्या है/)).toBeTruthy();

    // Nothing was thrown away on the way through.
    expect(screen.getByLabelText(/नाम/).getAttribute('value')).toBe('अरुण');
  });

  it('takes a UAE number when that is the code picked', async () => {
    show();
    fireEvent.change(screen.getByLabelText(/देश का कोड/), { target: { value: 'AE' } });
    type(/नाम/, 'चांद');
    type(/नंबर/, '050 123 4567');
    type(/आपकी बात/, 'अपनी दुकान जुड़वानी है.');
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));

    await waitFor(async () => {
      expect((await db.messages.toArray())[0]?.phone).toBe('501234567');
    });
    expect((await db.messages.toArray())[0]?.country).toBe('AE');
  });

  it('never asks the traveller to write it again once it is on the phone', async () => {
    show();
    await fillIn();
    expect(screen.queryByRole('button', { name: /भेज दीजिए/ })).toBeNull();
  });
});

describe('passing the app on', () => {
  it('shows what will be sent, in full, before it is sent', () => {
    show();
    expect(screen.getByText(invite('hi'))).toBeTruthy();
  });

  it('opens WhatsApp with nobody chosen, so the traveller picks who gets it', () => {
    show();
    const link = screen.getByRole('link', { name: /व्हाट्सऐप/ });
    expect(link.getAttribute('href')).toBe(
      `https://wa.me/?text=${encodeURIComponent(invite('hi'))}`,
    );
  });

  it('offers the phone’s own way as well, for a friend who is not on WhatsApp', () => {
    show();
    expect(screen.getByRole('button', { name: /किसी और तरह से/ })).toBeTruthy();
  });
});

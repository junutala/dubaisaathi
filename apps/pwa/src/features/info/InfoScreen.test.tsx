import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { InfoScreen } from './InfoScreen.js';
import { invite } from './share.js';

/**
 * घर.2 — three capsules (decision 028), tested with the radio off, because that is the state
 * the screen exists for: a traveller who needs the police number or their passport photograph
 * is not, at that moment, on hotel wifi.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

function show() {
  return render(
    <SettingsProvider>
      <InfoScreen />
    </SettingsProvider>,
  );
}

const open = (name: string) => {
  fireEvent.click(screen.getByRole('tab', { name }));
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.locale', 'hi');
  navigate.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the three capsules', () => {
  it('opens on संपर्क, because that is what somebody in a hurry came for', () => {
    show();
    expect(screen.getByRole('tab', { name: 'संपर्क' }).getAttribute('aria-selected')).toBe('true');
  });

  it('carries all three, in the order they were asked for', () => {
    show();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'संपर्क',
      'दस्तावेज़',
      'फ़ीडबैक',
    ]);
  });
});

describe('संपर्क', () => {
  it('shows the four numbers, each one tap from dialling', () => {
    show();
    const dials = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href) => href?.startsWith('tel:'));
    expect(dials).toEqual(['tel:+97143971222', 'tel:999', 'tel:998', 'tel:997']);
  });

  it('says what an Indian traveller would otherwise get wrong', () => {
    show();
    // The whole reason decision 002 wanted a line of numbers: 100 reaches nobody in Dubai.
    expect(screen.getByText(/भारत का 100 यहाँ नहीं लगता/)).toBeTruthy();
  });

  it('needs no network for any of it', () => {
    show();
    expect(screen.getByText('भारतीय कॉन्सुलेट')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('फ़ीडबैक', () => {
  it('keeps what was written when there is no signal, and says so', async () => {
    show();
    open('फ़ीडबैक');
    fireEvent.change(screen.getByLabelText(/नाम/), { target: { value: 'अरुण' } });
    fireEvent.change(screen.getByLabelText(/नंबर/), { target: { value: '+91 98765 43210' } });
    fireEvent.change(screen.getByLabelText(/आपकी बात/), { target: { value: 'करामा में थाली?' } });
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));

    await waitFor(async () => {
      expect(await db.messages.count()).toBe(1);
    });
    const kept = await db.messages.toArray();
    // Digits only, the dialling code off — the function will not take it otherwise.
    expect(kept[0]?.phone).toBe('9876543210');
    expect(kept[0]?.synced).toBe(false);
    expect(await screen.findByText(/सिग्नल आते ही/)).toBeTruthy();
  });

  it('asks for what is missing rather than swallowing the tap', () => {
    show();
    open('फ़ीडबैक');
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));
    expect(screen.getByText(/नाम लिख दीजिए/)).toBeTruthy();
  });

  it('shows the invitation in full, and opens WhatsApp with nobody chosen', () => {
    show();
    open('फ़ीडबैक');
    expect(screen.getByText(invite('hi'))).toBeTruthy();
    expect(screen.getByRole('link', { name: /व्हाट्सऐप/ }).getAttribute('href')).toBe(
      `https://wa.me/?text=${encodeURIComponent(invite('hi'))}`,
    );
  });
});

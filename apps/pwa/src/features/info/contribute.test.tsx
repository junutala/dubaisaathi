import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { db } from '../../db/schema.js';
import { ContributeScreen } from './ContributeScreen.js';
import { ShareScreen } from './ShareScreen.js';
import { APP_LINK, invite } from './share.js';

/**
 * The bar's two new places (decision 046), tested with the radio off: सुझाव keeps what was
 * written for a signal that will come, and ऐप शेयर draws its QR on the phone.
 */

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

function show(node: React.ReactNode) {
  return render(<SettingsProvider>{node}</SettingsProvider>);
}

describe('घर.9 · सुझाव', () => {
  it('arrives with the words a search found nothing for, already written in', () => {
    show(<ContributeScreen about="करामा में मटन कीमा" />);
    expect(screen.getByLabelText('क्या नहीं मिला')).toHaveProperty('value', 'करामा में मटन कीमा');
  });

  it('sends a missing place to the question log, with no name attached', async () => {
    show(<ContributeScreen about="Rolla Residence" />);
    fireEvent.click(screen.getByRole('button', { name: /भेजें/ }));
    await waitFor(async () => {
      expect(await db.voiceEvents.count()).toBe(1);
    });
    const [event] = await db.voiceEvents.toArray();
    expect(event?.transcript).toBe('Rolla Residence');
    expect(event?.intent).toBe('suggest-place');
    expect(await screen.findByText(/शुक्रिया/)).toBeTruthy();
  });

  it('keeps a suggestion written with no signal, and says so', async () => {
    show(<ContributeScreen />);
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
    show(<ContributeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /भेज दीजिए/ }));
    expect(screen.getByText(/जवाब किसे देना है/)).toBeTruthy();
  });
});

describe('घर.8 · ऐप शेयर', () => {
  it('draws the QR on the phone, with no network', () => {
    show(<ShareScreen />);
    const qr = screen.getByRole('img', { name: /QR/ });
    expect(qr.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(100);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('says under it what we are, what it costs, and where to find us', () => {
    show(<ShareScreen />);
    expect(screen.getByText('Dubai Saathi')).toBeTruthy();
    expect(screen.getByText('दुबई में आपका हिंदी साथी — खाना, रास्ता, बोर्ड पढ़ना')).toBeTruthy();
    expect(screen.getByText('24 घंटे मुफ़्त')).toBeTruthy();
    expect(screen.getByText(APP_LINK.replace('https://', ''))).toBeTruthy();
  });

  it('opens WhatsApp with nobody chosen and the same line in it', () => {
    show(<ShareScreen />);
    expect(screen.getByRole('link', { name: /WhatsApp पर भेजें/ }).getAttribute('href')).toBe(
      `https://wa.me/?text=${encodeURIComponent(invite('hi'))}`,
    );
  });
});

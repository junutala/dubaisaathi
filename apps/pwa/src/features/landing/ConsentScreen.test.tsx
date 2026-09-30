import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { ConsentScreen } from './ConsentScreen.js';

/**
 * The data-use notice for a phone that started before it existed (decision 045): the line says
 * text only, never voice or photos, and not tied to a name or a number; one button accepts it.
 */

afterEach(cleanup);

describe('the one-time data-use notice', () => {
  it('says what is kept and what is not, and one tap accepts it', () => {
    localStorage.setItem('saathi.locale', 'hi');
    const accept = vi.fn();
    render(
      <SettingsProvider>
        <ConsentScreen onAccept={accept} />
      </SettingsProvider>,
    );
    expect(screen.getByText(/आपकी आवाज़ या फ़ोटो नहीं/)).toBeTruthy();
    expect(screen.getByText(/नाम या नंबर से नहीं जुड़ता/)).toBeTruthy();
    // The terms go with it (decision 048), with the way to read them before accepting.
    expect(screen.getByText('जारी रखकर आप नियम और शर्तें मानते हैं।')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'नियम और शर्तें पढ़ें' }).getAttribute('href')).toBe(
      '#/terms',
    );
    fireEvent.click(screen.getByRole('button', { name: 'मंज़ूर है, आगे बढ़ें' }));
    expect(accept).toHaveBeenCalledOnce();
  });
});

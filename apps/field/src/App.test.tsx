import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { App } from './App.js';
import { BUILD } from './version.js';

/**
 * The build line, on every screen the collectors' app opens on (the owner, 30 September): after
 * a deploy the only question is "is my phone on the new one?", and it must be answerable on the
 * Menus screen and the pin as well as the long form.
 */

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('saathi.collector', 'Arun');
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  );
  // The pin watches the GPS from the moment it opens; a test has no GPS, so it waits quietly.
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: () => 1,
      clearWatch: () => undefined,
      getCurrentPosition: () => undefined,
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the build line', () => {
  it.each(['full', 'pin', 'menus'])('is on the %s screen', (mode) => {
    localStorage.setItem('saathi.fieldMode', mode);
    const { container } = render(<App />);
    expect(container.querySelector('.build')?.textContent).toBe(BUILD);
  });
});

import { describe, expect, it } from 'vitest';
import { hi } from './hi.js';
import { en } from './en.js';
import { LOCALES, translate } from './index.js';

describe('the interface catalogues', () => {
  it('carry the same keys, so no screen can fall back to a blank label', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
  });

  it('leave no string empty in either language', () => {
    for (const locale of LOCALES) {
      const catalogue = locale === 'hi' ? hi : en;
      for (const [key, value] of Object.entries(catalogue)) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('keeps the strip and bar labels short enough for a 390px phone', () => {
    // English runs longer than Hindi and the strip has five things on it; a label that wraps
    // pushes the theme switch off the edge.
    for (const key of ['strip.offline', 'strip.online', 'strip.pass', 'nav.docs'] as const) {
      expect(translate('en', key).length, key).toBeLessThanOrEqual(10);
      expect(translate('hi', key).length, key).toBeLessThanOrEqual(10);
    }
  });

  it('keeps the three pillar names in Devanagari in both catalogues', () => {
    for (const key of ['pillar.food', 'pillar.go', 'pillar.know'] as const) {
      expect(translate('en', key)).toBe(translate('hi', key));
    }
  });

  it('substitutes counts into both languages', () => {
    expect(translate('hi', 'home.tile.trial', { hours: 4 })).toBe('4 घंटे बाक़ी · पास लें');
    expect(translate('en', 'home.tile.trial', { hours: 4 })).toBe('4 hours left · get pass');
  });

  it('leaves an unknown placeholder visible rather than printing "undefined"', () => {
    expect(translate('en', 'pass.state.pass', {})).toContain('{days}');
  });
});

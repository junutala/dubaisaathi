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

  it('keeps the strip labels short enough for a 390px phone', () => {
    // English runs longer than Hindi and the strip has four things on it; a truncated
    // countdown is the one thing on that strip nobody can afford to lose.
    for (const key of ['strip.before', 'strip.trial', 'strip.pass', 'strip.expired'] as const) {
      expect(translate('en', key, { hours: 18, days: 5 }).length, key).toBeLessThanOrEqual(20);
      expect(translate('hi', key, { hours: 18, days: 5 }).length, key).toBeLessThanOrEqual(24);
    }
  });

  it('substitutes counts into both languages', () => {
    expect(translate('hi', 'strip.trial', { hours: 18 })).toBe('18 घंटे बाकी');
    expect(translate('en', 'strip.trial', { hours: 18 })).toBe('18 hrs left');
  });

  it('leaves an unknown placeholder visible rather than printing "undefined"', () => {
    expect(translate('en', 'strip.pass', {})).toContain('{days}');
  });
});

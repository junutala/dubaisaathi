import { beforeEach, describe, expect, it } from 'vitest';
import { TERMS_VERSION, acceptTerms, hasAcceptedTerms } from './consent.js';

/**
 * The terms are accepted once per version (decision 048): a phone that accepted only the
 * data-use line (decision 045), or an older version of the terms, is asked once more — and a
 * phone that has accepted today's terms never is.
 */

beforeEach(() => {
  localStorage.clear();
});

describe('what this phone has accepted', () => {
  it('asks a new phone', () => {
    expect(hasAcceptedTerms()).toBe(false);
  });

  it('asks once more a phone that accepted only the data-use line', () => {
    localStorage.setItem('saathi.dataConsent', '2026-09-28T10:00:00.000Z');
    expect(hasAcceptedTerms()).toBe(false);
    acceptTerms();
    expect(hasAcceptedTerms()).toBe(true);
  });

  it('never asks again for the same version', () => {
    acceptTerms(new Date('2026-09-30T08:00:00Z'));
    expect(hasAcceptedTerms()).toBe(true);
    expect(JSON.parse(localStorage.getItem('saathi.terms') ?? '{}')).toEqual({
      version: TERMS_VERSION,
      at: '2026-09-30T08:00:00.000Z',
    });
    expect(localStorage.getItem('saathi.dataConsent')).toBe('2026-09-30T08:00:00.000Z');
  });

  it('asks again when the terms have changed since', () => {
    localStorage.setItem('saathi.dataConsent', '2026-09-28T10:00:00.000Z');
    localStorage.setItem('saathi.terms', JSON.stringify({ version: '2026-01-01', at: 'x' }));
    expect(hasAcceptedTerms()).toBe(false);
  });

  it('reads something that is not ours as not accepted, never as a crash', () => {
    localStorage.setItem('saathi.dataConsent', '2026-09-28T10:00:00.000Z');
    localStorage.setItem('saathi.terms', 'not json');
    expect(hasAcceptedTerms()).toBe(false);
  });
});

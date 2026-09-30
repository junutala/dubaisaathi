import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { translate, type Locale } from '../../i18n/index.js';
import { TermsScreen } from './TermsScreen.js';
import { TERMS_CONTACT, TERMS_PAGES, termsVars, type TermsPage } from './terms.js';

/**
 * घर.10 · नियम और शर्तें (decision 048): the screen reads in both languages, the prices come from
 * the one price rule, and the website's three pages say exactly what the app says — no more,
 * no less — because a traveller who reads one and then the other must not find two sets of terms.
 */

afterEach(cleanup);

function renderIn(locale: Locale) {
  localStorage.setItem('saathi.locale', locale);
  render(
    <SettingsProvider>
      <TermsScreen />
    </SettingsProvider>,
  );
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('the terms screen', () => {
  it('reads in Hindi, जाना’s line first among the pillars and the prices filled in', () => {
    renderIn('hi');
    expect(screen.getByText('नियम और शर्तें')).toBeTruthy();
    expect(screen.getByText('जाना — सिर्फ़ हमारी सूची की जगहें')).toBeTruthy();
    expect(screen.getByText(/जाना हर पते वाला ऑफ़लाइन नक्शा नहीं है/)).toBeTruthy();
    expect(screen.getByText(/1 फ़ोन ₹199, 2 फ़ोन ₹299, 3 फ़ोन ₹399, 4 फ़ोन ₹499/)).toBeTruthy();
    expect(screen.getByText('निजता')).toBeTruthy();
    expect(screen.getByText('पैसे वापसी और रद्द करना')).toBeTruthy();
    expect(screen.getByText(/Sixera Software Solutions ·/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\{\w+\}/);
  });

  it('reads in English', () => {
    renderIn('en');
    expect(screen.getByText('Terms and conditions')).toBeTruthy();
    expect(screen.getByText(/is not an offline map of every address/)).toBeTruthy();
    expect(
      screen.getByText(/1 phone ₹199, 2 phones ₹299, 3 phones ₹399, 4 phones ₹499/),
    ).toBeTruthy();
    expect(screen.getByText('Privacy')).toBeTruthy();
    expect(screen.getByText('Refunds and cancellation')).toBeTruthy();
    expect(screen.getByText(/courts of Chennai/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\{\w+\}/);
  });
});

describe('the website’s pages', () => {
  const site = join(dirname(fileURLToPath(import.meta.url)), '../../../../site');
  const siteFile = (id: TermsPage['id']) => readFileSync(join(site, `${id}.html`), 'utf-8');

  /** Every paragraph on a page, as the page's own `.hi` and `.en` halves. */
  function paragraphs(html: string, lang: Locale): string[] {
    const found: string[] = [];
    for (const [, body = ''] of html.matchAll(/<p class="terms-p">([\s\S]*?)<\/p\s*>/g)) {
      const half = new RegExp(`<span class="${lang}"\\s*>([\\s\\S]*?)</span\\s*>`).exec(body);
      found.push(squash(half?.[1] ?? ''));
    }
    return found;
  }

  for (const page of TERMS_PAGES) {
    for (const lang of ['hi', 'en'] as const) {
      it(`/${page.id} says what the app says, in ${lang}`, () => {
        const html = siteFile(page.id);
        const expected = [...page.sections, TERMS_CONTACT].flatMap((section) =>
          section.paras.map((key) => translate(lang, key, termsVars())),
        );
        expect(paragraphs(html, lang)).toEqual(expected);
        for (const section of [...page.sections, TERMS_CONTACT]) {
          expect(squash(html)).toContain(translate(lang, section.head));
        }
        expect(squash(html)).toContain(translate(lang, 'terms.updated'));
      });
    }
  }
});

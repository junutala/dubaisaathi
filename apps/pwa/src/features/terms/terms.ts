import { listPriceInr } from '@saathi/shared';
import type { StringKey } from '../../i18n/index.js';

/**
 * घर.10 · नियम और शर्तें (decision 048): the terms, the privacy note and the refund rule, in the
 * order the app shows them. The words live in the two catalogues; this is only their shape, so
 * the app's screen and the website's three pages (`apps/site/terms.html`, `privacy.html`,
 * `refund.html`) read from one list — and `terms.test.tsx` fails when a page says something the
 * catalogue does not, or leaves out something it does.
 */

export interface TermsSection {
  readonly head: StringKey;
  readonly paras: readonly StringKey[];
  /** The owner's line (30 September): जाना is not a map of every address. Set apart, not buried. */
  readonly callout?: boolean;
}

export interface TermsPage {
  /** The website's page for this part: saafarsaathi.in/terms, /privacy, /refund. */
  readonly id: 'terms' | 'privacy' | 'refund';
  readonly head: StringKey;
  readonly sections: readonly TermsSection[];
}

export const TERMS_PAGES: readonly TermsPage[] = [
  {
    id: 'terms',
    head: 'terms.title',
    sections: [
      { head: 'terms.about.head', paras: ['terms.about.p1', 'terms.about.p2', 'terms.about.p3'] },
      {
        head: 'terms.go.head',
        paras: ['terms.go.p1', 'terms.go.p2', 'terms.go.p3'],
        callout: true,
      },
      { head: 'terms.food.head', paras: ['terms.food.p1', 'terms.food.p2', 'terms.food.p3'] },
      { head: 'terms.know.head', paras: ['terms.know.p1'] },
      { head: 'terms.speak.head', paras: ['terms.speak.p1'] },
      { head: 'terms.sos.head', paras: ['terms.sos.p1'] },
      {
        head: 'terms.pass.head',
        paras: [
          'terms.pass.p1',
          'terms.pass.p2',
          'terms.pass.p3',
          'terms.pass.p4',
          'terms.pass.p5',
        ],
      },
      { head: 'terms.change.head', paras: ['terms.change.p1'] },
      { head: 'terms.law.head', paras: ['terms.law.p1'] },
    ],
  },
  {
    id: 'privacy',
    head: 'privacy.head',
    sections: [
      { head: 'privacy.id.head', paras: ['privacy.id.p1'] },
      {
        head: 'privacy.text.head',
        paras: ['privacy.text.p1', 'privacy.text.p2', 'privacy.text.p3'],
      },
      {
        head: 'privacy.phone.head',
        paras: ['privacy.phone.p1', 'privacy.phone.p2', 'privacy.phone.p3'],
      },
      { head: 'privacy.place.head', paras: ['privacy.place.p1'] },
      { head: 'privacy.usage.head', paras: ['privacy.usage.p1'] },
      { head: 'privacy.site.head', paras: ['privacy.site.p1'] },
      { head: 'privacy.pay.head', paras: ['privacy.pay.p1'] },
      { head: 'privacy.msg.head', paras: ['privacy.msg.p1'] },
      { head: 'privacy.delete.head', paras: ['privacy.delete.p1'] },
    ],
  },
  {
    id: 'refund',
    head: 'refund.head',
    sections: [{ head: 'refund.head', paras: ['refund.p1', 'refund.p2', 'refund.p3'] }],
  },
];

/** Who we are and how to reach us, at the foot of the screen and of every website page. */
export const TERMS_CONTACT: TermsSection = { head: 'contact.head', paras: ['contact.p1'] };

/** The prices in the pass section, from the one price rule the order and the coupons use. */
export function termsVars(): Record<string, number> {
  return { p1: listPriceInr(1), p2: listPriceInr(2), p3: listPriceInr(3), p4: listPriceInr(4) };
}

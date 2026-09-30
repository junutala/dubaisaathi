/**
 * What the traveller has accepted, and whether it is what we ask for today (decisions 045, 048).
 *
 * Two things are accepted together by the landing page's one button, or by the one-time notice
 * for a phone that was already past the landing page: the data-use line (045) and the terms
 * (048). The terms carry a version — the day they were last changed — so a phone that accepted
 * an older version, or only the data-use line, sees the notice once more, and never again for
 * the same version. Kept in localStorage, beside `saathi.started`, because it is read before
 * the first paint.
 */

/** The terms as they stand. Change it only with the words: it asks every phone once more. */
export const TERMS_VERSION = '2026-09-30';

const CONSENT_KEY = 'saathi.dataConsent';
const TERMS_KEY = 'saathi.terms';

interface TermsAcceptance {
  readonly version: string;
  readonly at: string;
}

function acceptedVersion(raw: string | null): string | undefined {
  if (raw === null) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<TermsAcceptance> | null;
    return typeof parsed?.version === 'string' ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

/** Whether this phone has accepted the data-use line and today's terms. */
export function hasAcceptedTerms(): boolean {
  try {
    return (
      localStorage.getItem(CONSENT_KEY) !== null &&
      acceptedVersion(localStorage.getItem(TERMS_KEY)) === TERMS_VERSION
    );
  } catch {
    // Private mode: better to show the app than to trap someone on a notice for ever.
    return true;
  }
}

/** The one button pressed: both are accepted, with the day and the version. */
export function acceptTerms(now: Date = new Date()): void {
  try {
    localStorage.setItem(CONSENT_KEY, now.toISOString());
    const record: TermsAcceptance = { version: TERMS_VERSION, at: now.toISOString() };
    localStorage.setItem(TERMS_KEY, JSON.stringify(record));
  } catch {
    /* it will simply be shown once more */
  }
}

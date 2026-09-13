import { hi, type StringKey } from './hi.js';
import { en } from './en.js';

/**
 * Two interface languages, Hindi and English (decision 007). One catalogue each, every key
 * present in both — the type on `en` makes a missing key a build failure rather than a blank
 * label in a taxi.
 *
 * This is separate from what the app *produces*: that is always Arabic for a Dubai local,
 * and the phrase pack carries all four languages regardless of this setting.
 */
export const LOCALES = ['hi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

const CATALOGUES: Record<Locale, Record<StringKey, string>> = { hi, en };

/** The label each language uses for itself — never translated. */
export const LOCALE_LABEL: Record<Locale, string> = { hi: 'हिंदी', en: 'English' };

const STORAGE_KEY = 'saathi.locale';

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

/**
 * The phone's own language decides, until the traveller says otherwise — the same rule the
 * theme follows. A Hindi-set phone gets Hindi; everyone else gets English.
 */
export function detectLocale(): Locale {
  const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages;
  return languages.some((lang) => lang.toLowerCase().startsWith('hi')) ? 'hi' : 'en';
}

export function storeLocale(locale: Locale): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, locale);
}

/** `translate('hi', 'strip.trial', { hours: 18 })` → "18 घंटे बाकी". */
export function translate(
  locale: Locale,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const raw = CATALOGUES[locale][key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export type { StringKey };

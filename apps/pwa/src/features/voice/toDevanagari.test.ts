import { describe, expect, it } from 'vitest';
import { isPersoArabic, toDevanagari } from './toDevanagari.js';
import { placeNamesInDevanagari } from './intentPacks.js';

const shown = (said: string) => toDevanagari(said, placeNamesInDevanagari);

/**
 * The screen above this box asks "Is this right?".
 *
 * The offline recogniser heard the owner correctly and wrote it in the other alphabet — "مجھے
 * برجمان جنا ہے" for "mujhe BurJuman jana hai". Hindi and Urdu are one spoken language with two
 * writing systems, so nothing was mistranslated; but a question in an alphabet the traveller
 * cannot read is not a question, and there is no way to answer it except by guessing.
 *
 * Display only. Matching works in every script already and the learning loop keeps what the model
 * really produced, so a letter this gets wrong costs legibility and never correctness.
 */
describe('Hindi written in Urdu script', () => {
  it('is shown to the traveller in their own alphabet', () => {
    // Recorded from the owner's phone, verbatim.
    expect(shown('مجھے برجمان جنا ہے')).toBe('मुझे बुरजुमान जाना है');
  });

  /** A place we ship in both alphabets is looked up, never approximated. */
  it('spells a place exactly, from the pack', () => {
    expect(shown('مجھے الكرامة جانا ہے')).toBe('मुझे करामा जाना है');
    expect(shown('برجمان')).toBe('बुरजुमान');
  });

  it('reads the ordinary words of a traveller sentence', () => {
    expect(shown('کھانا کہاں ملے گا')).toContain('खाना कहाँ');
    expect(shown('میرا اے سی خراب ہے')).toBe('मेरा ए सी ख़राब है');
  });

  /**
   * Urdu writes no short vowels, so a word we have not listed comes out vowel-light rather than
   * wrong: readable, and visibly an approximation. That is the honest outcome for display and
   * would not be acceptable anywhere a decision depended on it.
   */
  it('still produces something readable for a word it does not know', () => {
    const out = shown('والتق');
    expect(isPersoArabic(out)).toBe(false);
    expect(out).not.toBe('');
  });

  it('leaves Devanagari and Roman exactly as they are', () => {
    expect(shown('मुझे बुरजुमान जाना है')).toBe('मुझे बुरजुमान जाना है');
    expect(shown('mujhe burjuman jana hai')).toBe('mujhe burjuman jana hai');
    expect(isPersoArabic('mujhe burjuman jana hai')).toBe(false);
  });

  it('keeps the spacing a traveller typed', () => {
    expect(shown('مجھے  برجمان')).toBe('मुझे  बुरजुमान');
  });
});

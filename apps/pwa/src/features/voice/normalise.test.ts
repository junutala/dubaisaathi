import { describe, expect, it } from 'vitest';
import { fold, skeleton, SKELETON_MIN, tokenise, transliterate } from './normalise.js';

describe('transliterate', () => {
  it('drops the inherent vowel at the end of a word, as Hindi does', () => {
    expect(transliterate('बुर')).toBe('bur');
    expect(transliterate('करामा')).toBe('karama');
  });

  it('lets a virama kill the inherent vowel mid-word', () => {
    expect(transliterate('बुर्ज')).toBe('burj');
  });

  it('reads a nukta as changing the consonant it sits under', () => {
    // NFC pulls ख़ and फ़ apart, so the nukta arrives on its own. Without handling it, this
    // word transliterates with a 'p' and never meets "khalifa".
    expect(fold('ख़लीफ़ा')).toBe(fold('khalifa'));
    expect(fold('ज़रूरी')).toBe(fold('zaroori'));
  });

  it('leaves Roman text alone', () => {
    expect(transliterate('metro se Karama')).toBe('metro se Karama');
  });
});

describe('fold', () => {
  it.each([
    ['मुझे करामा जाना है', 'mujhe Karama jaana hai'],
    ['मुझे करामा जाना है', 'Mujhe kaarama jana hai!'],
    ['बुर दुबई', 'bur dubai'],
    ['हवाई अड्डा', 'hawai adda'],
    ['सोना बाज़ार', 'sona bazaar'],
    ['भूख लगी', 'bhookh lagi'],
    ['मेट्रो से करामा', 'metro se Karama'],
  ])('reads %s and %s as the same words', (devanagari, roman) => {
    expect(fold(devanagari)).toBe(fold(roman));
  });

  it('smooths the letters Indians swap freely', () => {
    expect(fold('Qarama')).toBe(fold('Karama'));
    expect(fold('Hawai')).toBe(fold('Havai'));
    expect(fold('bazaar')).toBe(fold('bajar'));
    expect(fold('taxi')).toBe(fold('taksi'));
  });

  it('keeps ch and sh, which are real sounds, and folds the rest', () => {
    expect(fold('chai')).toBe('chai');
    expect(fold('shakahari')).toBe('shakahari');
    expect(fold('khana')).toBe(fold('kana'));
  });

  it('is empty for a sentence with nothing in it', () => {
    expect(fold('  …!!  ')).toBe('');
    expect(tokenise('')).toEqual([]);
  });
});

describe('skeleton', () => {
  it('meets across the spellings folding cannot reach', () => {
    // The vowels genuinely differ between the scripts here — मॉल carries the English 'o' where
    // "mall" is written with an 'a', and टैक्सी has a diphthong "taxi" does not. The consonants
    // agree, which is enough to offer and not enough to assume.
    expect(fold('दुबई मॉल')).not.toBe(fold('dubai mall'));
    expect(skeleton('दुबई मॉल')).toBe(skeleton('dubai mall'));
    expect(skeleton('टैक्सी')).toBe(skeleton('taxi'));
    expect(skeleton('जुमेरा')).toBe(skeleton('jumeirah'));
  });

  it('ignores a skeleton too short to mean anything', () => {
    // "deira" leaves just "dr" — which is why a skeleton under SKELETON_MIN is never matched
    // on, and why that place carries curated aliases in both scripts instead.
    expect(skeleton('deira').length).toBeLessThan(SKELETON_MIN);
  });
});

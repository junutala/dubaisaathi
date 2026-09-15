import { describe, expect, it } from 'vitest';
import type { ParsedIntent } from '@saathi/shared';
import { composeArabic, destinationWords } from './composeArabic.js';

const intent = (over: Partial<ParsedIntent>): ParsedIntent => ({
  kind: 'unknown',
  confidence: 0.9,
  transcript: '',
  ...over,
});

/** The place pack, as far as these tests are concerned. */
const ARABIC = (id: string) => (id === 'bur-dubai' ? 'بر دبي' : undefined);

describe('a destination becomes a sentence, known or not', () => {
  it('uses the place pack Arabic when we have it', () => {
    const out = composeArabic(
      intent({
        kind: 'route',
        destination: { spoken: 'Bur Dubai', placeId: 'bur-dubai', confidence: 1 },
      }),
      ARABIC,
    );
    expect(out?.ar).toBe('أريد الذهاب إلى بر دبي');
  });

  it("carries the traveller's own words when the place is unknown", () => {
    // The whole answer to a closed list: a friend's flat in Satwa is still a destination.
    const out = composeArabic(
      intent({ kind: 'route', destination: { spoken: 'Satwa building 7', confidence: 0.4 } }),
      ARABIC,
    );
    expect(out?.ar).toBe('أريد الذهاب إلى Satwa building 7');
  });

  it('never invents a name for a place it does not know', () => {
    // "Burjuman" once resolved to "Dubai Mall" on a driver's screen. Never by guessing again.
    const out = composeArabic(
      intent({
        kind: 'route',
        destination: { spoken: 'Burjuman', placeId: 'burjuman', confidence: 1 },
      }),
      ARABIC,
    );
    expect(out?.ar).toContain('Burjuman');
  });
});

describe('the address a driver reads is the one the traveller wrote', () => {
  it('keeps the building when the parser resolved only the area', () => {
    // The defect this exists for: "Satwa building 7" became "take me to Satwa", a neighbourhood
    // of tens of thousands, with the building number silently dropped.
    const out = composeArabic(
      intent({
        kind: 'route',
        transcript: 'Satwa building 7 jaana hai',
        destination: { spoken: 'Satwa', placeId: 'satwa', confidence: 1 },
      }),
      () => 'السطوة',
    );
    expect(out?.ar).toContain('building 7');
    expect(out?.ar).not.toBe('أريد الذهاب إلى السطوة');
  });

  it('still uses the proper Arabic name when the place is all they wrote', () => {
    const out = composeArabic(
      intent({
        kind: 'route',
        transcript: 'Bur Dubai jaana hai',
        destination: { spoken: 'Bur Dubai', placeId: 'bur-dubai', confidence: 1 },
      }),
      ARABIC,
    );
    expect(out?.ar).toBe('أريد الذهاب إلى بر دبي');
  });
});

describe('stripping the travelling verb', () => {
  it('takes the verb off and leaves the address', () => {
    expect(destinationWords('Satwa building 7 jaana hai')).toBe('Satwa building 7');
    expect(destinationWords('mujhe Karama le chalo')).toBe('Karama');
    expect(destinationWords('अल फहीदी जाना है')).toBe('अल फहीदी');
  });

  it('takes the longer verb first, so nothing is left behind', () => {
    expect(destinationWords('Marina Mall ko jaana hai')).toBe('Marina Mall');
  });

  it('leaves a bare address alone', () => {
    expect(destinationWords('Al Fahidi Street')).toBe('Al Fahidi Street');
  });
});

describe('food composes rather than looks up', () => {
  it('asks for what they want', () => {
    const out = composeArabic(intent({ kind: 'food', foodTags: ['jain'] }));
    expect(out?.ar).toBe('أريد طعام جايني');
  });

  it('asks to avoid what they cannot eat', () => {
    const out = composeArabic(intent({ kind: 'food', foodTags: ['no-onion', 'no-garlic'] }));
    expect(out?.ar).toBe('لا أريد البصل والثوم');
  });

  it('combines want and avoid in one sentence nobody stored', () => {
    // This is the difference from a phrasebook: no row exists for this combination.
    const out = composeArabic(intent({ kind: 'food', foodTags: ['jain', 'no-onion'] }));
    expect(out?.ar).toBe('أريد طعام جايني بدون البصل');
  });

  it('handles three constraints at once', () => {
    const out = composeArabic(
      intent({ kind: 'food', foodTags: ['vegetarian', 'no-onion', 'no-garlic'] }),
    );
    expect(out?.ar).toBe('أريد طعام نباتي بدون البصل والثوم');
  });
});

describe('what it refuses, so the model can take over', () => {
  it('returns null for an intent with no template', () => {
    expect(composeArabic(intent({ kind: 'unknown', transcript: 'mera AC kharab hai' }))).toBeNull();
    expect(composeArabic(intent({ kind: 'document', documentName: 'passport' }))).toBeNull();
  });

  it('returns null for a route with no destination', () => {
    expect(composeArabic(intent({ kind: 'route' }))).toBeNull();
  });

  it('returns null for food with no constraint stated', () => {
    expect(composeArabic(intent({ kind: 'food', foodTags: [] }))).toBeNull();
  });
});

describe('the traveller can read what they are about to show a stranger', () => {
  it('builds each language from its own words, not from the Arabic', () => {
    // The first version filled every template from the Arabic slot and produced
    // "मुझे طعام جايني चाहिए" — a Hindi sentence nobody could check.
    const out = composeArabic(intent({ kind: 'food', foodTags: ['jain'] }));
    expect(out?.hi).toBe('मुझे जैन खाना चाहिए');
    expect(out?.en).toBe('I want Jain food');
    expect(out?.ar).toBe('أريد طعام جايني');
  });

  it('keeps Hindi free of Arabic even when several tags combine', () => {
    const out = composeArabic(intent({ kind: 'food', foodTags: ['jain', 'no-onion'] }));
    expect(out?.hi).toBe('मुझे जैन खाना चाहिए, प्याज़ के बिना');
    expect(/[\u0600-\u06FF]/.test(out?.hi ?? '')).toBe(false);
  });

  it('shows the driver Arabic but shows the traveller their own words', () => {
    const out = composeArabic(
      intent({
        kind: 'route',
        destination: { spoken: 'Bur Dubai', placeId: 'bur-dubai', confidence: 1 },
      }),
      ARABIC,
    );
    expect(out?.ar).toBe('أريد الذهاب إلى بر دبي');
    expect(out?.hi).toBe('Bur Dubai जाना है');
  });
});

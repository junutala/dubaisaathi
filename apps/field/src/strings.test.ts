import { describe, expect, it } from 'vitest';
import { CATALOGUES, translate } from './strings.js';

describe('the two catalogues', () => {
  it('carry the same keys, so no button goes blank in one language', () => {
    expect(Object.keys(CATALOGUES.hi).sort()).toEqual(Object.keys(CATALOGUES.en).sort());
  });

  it('use the same placeholders, so a number never goes missing in Hindi', () => {
    for (const key of Object.keys(CATALOGUES.en) as (keyof typeof CATALOGUES.en)[]) {
      const holes = (text: string) => (text.match(/\{[a-z]+\}/g) ?? []).sort();
      expect(holes(CATALOGUES.hi[key]), key).toEqual(holes(CATALOGUES.en[key]));
    }
  });

  it('fills a placeholder', () => {
    expect(translate('hi', 'waiting', { n: 3 })).toBe('3 अपलोड बाक़ी');
  });
});

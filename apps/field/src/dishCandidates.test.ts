import { describe, expect, it } from 'vitest';
import { dishCandidates } from './dishCandidates.js';

/** What a camera actually returns from a laminated board in a Karama side street. */
const REAL = `
        MENU
  STARTERS
1) Masala Dosa ............ 12
2. Idli Sambar    AED 8
 • Medu Vada 9/-
   Sabudana Khichadi   14.50
BEVERAGES
  Masala Chai .... 4
  Filter Coffee 5
We accept cards
Tel: 04 355 1234
FREE DELIVERY ABOVE 30 AED
Thank You
`;

describe('reading a menu board', () => {
  const found = dishCandidates(REAL);
  const names = found.map((c) => c.text);

  it('finds the dishes', () => {
    expect(names).toContain('Masala Dosa');
    expect(names).toContain('Idli Sambar');
    expect(names).toContain('Medu Vada');
    expect(names).toContain('Sabudana Khichadi');
    expect(names).toContain('Masala Chai');
    expect(names).toContain('Filter Coffee');
  });

  it('drops the section headers, which look exactly like food', () => {
    expect(names).not.toContain('MENU');
    expect(names).not.toContain('STARTERS');
    expect(names).not.toContain('BEVERAGES');
  });

  it('drops the shop furniture', () => {
    expect(names.join(' ')).not.toMatch(/Tel|accept|DELIVERY|Thank/i);
  });

  it('strips the price but remembers there was one', () => {
    const dosa = found.find((c) => c.text === 'Masala Dosa');
    expect(dosa?.hadPrice).toBe(true);
    // The price itself must not survive into the name.
    expect(names.every((n) => !/\d/.test(n))).toBe(true);
  });

  it('keeps the order of the board, so a collector can follow down the menu', () => {
    expect(names.indexOf('Masala Dosa')).toBeLessThan(names.indexOf('Masala Chai'));
  });
});

describe('what must never become a candidate', () => {
  it('a phone number', () => {
    expect(dishCandidates('04 355 1234')).toHaveLength(0);
  });

  it('a line of prices', () => {
    expect(dishCandidates('12  15  18  20')).toHaveLength(0);
  });

  it('a sentence', () => {
    expect(dishCandidates('All our food is prepared fresh every single morning here')).toHaveLength(
      0,
    );
  });

  it('OCR noise', () => {
    expect(dishCandidates('!!  ~~  ##')).toHaveLength(0);
  });

  it('the same dish twice, however it was cased', () => {
    expect(dishCandidates('Masala Dosa 12\nMASALA DOSA 12')).toHaveLength(1);
  });
});

describe('a dish with no price still counts', () => {
  it('keeps it, and says no price was seen', () => {
    const [only] = dishCandidates('Jain Sambar');
    expect(only?.text).toBe('Jain Sambar');
    expect(only?.hadPrice).toBe(false);
  });
});

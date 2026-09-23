import { describe, expect, it } from 'vitest';
import { isPdf } from './pdfPages.js';

describe('a picked file that is a PDF', () => {
  it('is known by its type, or by its name when the system gave it none', () => {
    expect(isPdf(new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' }))).toBe(true);
    expect(isPdf(new File(['%PDF'], 'Menu Scan.PDF', { type: '' }))).toBe(true);
    expect(isPdf(new File(['jpeg'], 'page.jpg', { type: 'image/jpeg' }))).toBe(false);
  });
});

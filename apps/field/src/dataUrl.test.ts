import { describe, expect, it } from 'vitest';
import { asDataUrl } from './dataUrl.js';

/**
 * The one place a photograph becomes a string. Both callers depend on the prefix as much as the
 * bytes: the function reads the kind off it before storing, and an `<img>` will not show a data
 * URL that lies about its type.
 */
describe('a photograph as a string', () => {
  it('keeps the type the camera gave it', async () => {
    const url = await asDataUrl(new Blob(['shopfront'], { type: 'image/jpeg' }));
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(atob(url.slice('data:image/jpeg;base64,'.length))).toBe('shopfront');
  });

  it('calls a blob with no type a photograph, because that is what this app reads', async () => {
    expect(await asDataUrl(new Blob(['x']))).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('survives a photograph too big for one call', async () => {
    // btoa takes a string and String.fromCharCode takes arguments: a 300 KB menu page sent in
    // one go is what overflows the argument list, and a menu is the whole reason for the upload.
    const big = new Uint8Array(300_000).fill(65);
    const url = await asDataUrl(new Blob([big], { type: 'image/jpeg' }));
    expect(atob(url.slice('data:image/jpeg;base64,'.length))).toHaveLength(300_000);
  });
});

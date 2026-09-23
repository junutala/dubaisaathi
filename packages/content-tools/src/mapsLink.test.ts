import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isGoogleMapsUrl, isShortMapsLink, mapsPlaceOf, nextHop } from '@saathi/shared';

/**
 * The QR code on a hotel's card (decision 032, addendum): what the phone reads off a maps link
 * with the radio off, and the allowlist that keeps the `maplink` function from fetching anything
 * but Google's own short links. Every link here is the shape a real card prints.
 */

const here = dirname(fileURLToPath(import.meta.url));

describe('a long maps link, read on the phone', () => {
  it('takes the place Google pinned and its name from a place link', () => {
    const place = mapsPlaceOf(
      'https://www.google.com/maps/place/Citymax+Hotel+Bur+Dubai/@25.2521937,55.2986377,17z/data=!3m1!4b1!4m9!3m8!1s0x3e5f433d6c4b5c5b:0x6f5a0f8d2c1e0c1a!5m2!4m1!1i2!8m2!3d25.2521889!4d55.3012126!16s%2Fg%2F1tf2l4sq',
    );
    // The pin (!3d!4d), not the view (@), which is where the map happened to be centred.
    expect(place).toEqual({
      at: { lat: 25.2521889, lng: 55.3012126 },
      name: 'Citymax Hotel Bur Dubai',
    });
  });

  it('falls back to the view when a place link carries no pin', () => {
    expect(
      mapsPlaceOf('https://www.google.ae/maps/place/Rigga+Palm+Inn/@25.2637,55.3197,18z'),
    ).toEqual({ at: { lat: 25.2637, lng: 55.3197 }, name: 'Rigga Palm Inn' });
  });

  it('decodes escapes and keeps the name, not the address Google adds after it', () => {
    expect(
      mapsPlaceOf(
        'https://www.google.com/maps/place/Al+Wasmi+%26+Sons+Residence,+23D+St+-+Al+Rigga+-+Dubai/@25.26,55.32,17z',
      )?.name,
    ).toBe('Al Wasmi & Sons Residence');
  });

  it('reads q=, query=, ll= and a maps.google host', () => {
    expect(mapsPlaceOf('https://maps.google.com/?q=25.2637,55.3197')).toEqual({
      at: { lat: 25.2637, lng: 55.3197 },
    });
    expect(mapsPlaceOf('https://www.google.com/maps/search/?api=1&query=25.2521,55.3012')).toEqual({
      at: { lat: 25.2521, lng: 55.3012 },
    });
    expect(mapsPlaceOf('https://maps.google.com/maps?ll=25.2,55.3&z=16')).toEqual({
      at: { lat: 25.2, lng: 55.3 },
    });
    expect(mapsPlaceOf('https://www.google.co.in/maps?q=Sabtbir+Hotel+Apartments,+Deira')).toEqual({
      name: 'Sabtbir Hotel Apartments',
    });
  });

  it('reads a place segment that is coordinates as coordinates, never as a name', () => {
    expect(mapsPlaceOf('https://www.google.com/maps/place/25.2637,55.3197')).toEqual({
      at: { lat: 25.2637, lng: 55.3197 },
    });
    expect(
      mapsPlaceOf(
        "https://www.google.com/maps/place/25%C2%B015'49.3%22N+55%C2%B019'10.9%22E/@25.2637,55.3197,17z",
      ),
    ).toEqual({ at: { lat: 25.2637, lng: 55.3197 } });
  });

  it('reads a geo: link', () => {
    expect(mapsPlaceOf('geo:25.2637,55.3197?z=17')).toEqual({ at: { lat: 25.2637, lng: 55.3197 } });
  });

  it('says nothing about anything that is not a maps link', () => {
    for (const text of [
      'https://wa.me/971501234567',
      'https://api.whatsapp.com/send?phone=971501234567',
      'https://www.riggapalminn.com/?q=25.2,55.3',
      'https://google.com/search?q=25.2,55.3',
      'https://evil.example/maps/place/X/@25.2,55.3',
      'https://google.com.evil.example/maps/@25.2,55.3',
      'BEGIN:VCARD\nVERSION:3.0\nFN:Rigga Palm\nEND:VCARD',
      'garbage ###',
      '',
    ]) {
      expect(mapsPlaceOf(text)).toBeUndefined();
    }
    expect(isGoogleMapsUrl('https://user:pw@www.google.com/maps/@25.2,55.3')).toBe(false);
    expect(mapsPlaceOf('https://maps.google.com/?q=999,999')).toEqual({});
  });
});

describe('a short maps link, and where the function may follow it', () => {
  it('knows Google’s short links and nothing else', () => {
    expect(isShortMapsLink('https://maps.app.goo.gl/Xy12AbCdEfGh3')).toBe(true);
    expect(isShortMapsLink('http://maps.app.goo.gl/Xy12AbCdEfGh3')).toBe(true);
    expect(isShortMapsLink('https://goo.gl/maps/abcd1234')).toBe(true);
    expect(isShortMapsLink('https://g.co/kgs/AbCd12')).toBe(true);

    expect(isShortMapsLink('https://maps.app.goo.gl/')).toBe(false);
    expect(isShortMapsLink('https://goo.gl/abcd1234')).toBe(false);
    expect(isShortMapsLink('https://maps.app.goo.gl.evil.example/X')).toBe(false);
    expect(isShortMapsLink('https://maps.app.goo.gl:8443/X')).toBe(false);
    expect(isShortMapsLink('https://me@maps.app.goo.gl/X')).toBe(false);
    expect(isShortMapsLink('ftp://maps.app.goo.gl/X')).toBe(false);
    expect(isShortMapsLink('https://bit.ly/hotel')).toBe(false);
    expect(isShortMapsLink('https://wa.me/971501234567')).toBe(false);
  });

  it('stops at a Maps page, follows another short link, and refuses everything else', () => {
    const from = 'https://maps.app.goo.gl/Xy12';
    expect(nextHop('https://www.google.com/maps/place/X/@25.2,55.3,17z', from)).toEqual({
      kind: 'maps',
      url: 'https://www.google.com/maps/place/X/@25.2,55.3,17z',
    });
    expect(nextHop('https://maps.app.goo.gl/Other', 'https://goo.gl/maps/abc')).toEqual({
      kind: 'short',
      url: 'https://maps.app.goo.gl/Other',
    });
    expect(nextHop('https://attacker.example/', from)).toEqual({ kind: 'refused' });
    expect(nextHop('http://169.254.169.254/latest/meta-data', from)).toEqual({ kind: 'refused' });
    expect(nextHop('https://www.google.com/search?q=hotel', from)).toEqual({ kind: 'refused' });
    // A relative Location stays on the short-link host it came from; a scheme-relative one leaves.
    expect(nextHop('/Other', from)).toEqual({
      kind: 'short',
      url: 'https://maps.app.goo.gl/Other',
    });
    expect(nextHop('//attacker.example/x', from)).toEqual({ kind: 'refused' });
    expect(nextHop('https://www.google.com:444/maps/@25.2,55.3', from)).toEqual({
      kind: 'refused',
    });
  });

  it('takes the Maps address off Google’s consent page without fetching the page', () => {
    const maps = 'https://www.google.com/maps/place/X/@25.2,55.3,17z';
    expect(
      nextHop(
        `https://consent.google.com/m?continue=${encodeURIComponent(maps)}&gl=AE`,
        'https://maps.app.goo.gl/X',
      ),
    ).toEqual({ kind: 'maps', url: maps });
    expect(
      nextHop(
        `https://consent.google.com/m?continue=${encodeURIComponent('https://attacker.example/')}`,
        'https://maps.app.goo.gl/X',
      ),
    ).toEqual({ kind: 'refused' });
  });

  /**
   * The edge functions run on Deno and cannot import the workspace, so the rule is mirrored. One
   * definition means the mirror is a copy, not a rewrite: this fails on the first byte of
   * difference — and the allowlist is exactly the part that must not drift.
   */
  it('is one definition: the Deno mirror is byte for byte the shared file', async () => {
    const shared = await readFile(
      resolve(here, '..', '..', 'shared', 'src', 'mapsLink.ts'),
      'utf8',
    );
    const mirror = await readFile(
      resolve(here, '..', '..', '..', 'supabase', 'functions', '_shared', 'mapsLink.ts'),
      'utf8',
    );
    expect(mirror).toBe(shared);
  });
});

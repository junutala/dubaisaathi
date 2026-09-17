import encodeQR from 'qr';
import { encodePass, type SignedPass } from './signedPass.js';

/**
 * The family QR (decision 005): the pass, as a link the other phone's own camera opens.
 *
 * There is no scanner in this app — every phone already has one in its camera, and a page that
 * says "your phone cannot scan" to a phone that can is exactly the mistake CLAUDE.md warns
 * against. So the QR carries a URL: the camera opens it, the app installs the pass offline from
 * the hash, and nothing has to be downloaded or permitted first.
 *
 * `qr` is a dependency-free encoder; the drawing is ours so the colours are the app's own.
 */

export const APP_ORIGIN = 'https://dubai.saafarsaathi.in';

export function passLink(pass: SignedPass): string {
  return `${APP_ORIGIN}/#/pass/${encodePass(pass)}`;
}

/** The modules as one SVG path, so a QR is one element and inherits `currentColor`. */
export function qrPath(text: string): { readonly size: number; readonly d: string } {
  // The quiet zone the standard requires is drawn into the matrix: two modules of white.
  const matrix = encodeQR(text, 'raw', { ecc: 'medium', border: 2 });
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${String(x)} ${String(y)}h1v1h-1z`);
    });
  });
  return { size: matrix.length, d: parts.join('') };
}

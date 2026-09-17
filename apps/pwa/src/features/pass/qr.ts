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

/** The picture's own geometry: the QR square, the white margin round it, the caption's band. */
const IMAGE_SIZE = 640;
const MARGIN = 40;
const CAPTION_BAND = 76;

/**
 * The same QR as a PNG, for sending rather than showing.
 *
 * A link is a wall of characters in a chat; a picture is the thing itself, and whoever receives
 * it points their camera at it exactly as they would at this screen. 640px scans off a phone
 * held at arm's length, the ground is white with a quiet zone on every side because a QR on a
 * dark card does not scan, and the app's name sits under it so the picture still says what it is
 * a week later in someone's gallery.
 *
 * Returns `null` rather than throwing when this browser has no 2D canvas or refuses the blob —
 * the caller then has a link to fall back to, which is a send that still works.
 */
export async function qrPng(text: string, caption: string): Promise<Blob | null> {
  try {
    const { size, d } = qrPath(text);
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE + CAPTION_BAND;
    const context = canvas.getContext('2d');
    if (context === null) return null;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // A whole number of pixels per module, or every edge is a grey smear and a camera in a
    // hotel corridor has to work harder than it should. The rounding goes into the margin,
    // which the matrix's own two modules of quiet zone are already part of.
    const module = Math.floor((IMAGE_SIZE - MARGIN * 2) / size);
    const offset = (IMAGE_SIZE - module * size) / 2;
    context.fillStyle = '#141826';
    context.save();
    context.translate(offset, offset);
    context.scale(module, module);
    context.fill(new Path2D(d));
    context.restore();

    // Mukta rather than the headline face: Anek swallows the space after the middle dot when
    // Devanagari follows it, and "Dubaisaathi ·फ़ोन 2" reads as a mistake in someone's gallery.
    context.font = "600 26px 'Mukta', 'Anek Devanagari', sans-serif";
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(caption, IMAGE_SIZE / 2, IMAGE_SIZE + CAPTION_BAND / 2);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  } catch {
    return null;
  }
}

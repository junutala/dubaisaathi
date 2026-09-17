/**
 * Draws the WhatsApp QR the website shows, as an SVG committed next to the page.
 *
 *   npm run site:qr
 *
 * saafarsaathi.in is static and has no build step (decision 012), so this cannot be generated
 * at request time — and a QR of a number that changes twice a year has no business being
 * fetched from a third party at page load either. It is drawn here with the same encoder the
 * app's family QR uses, so there is one QR implementation in the repository and not two.
 *
 * On a laptop the QR is the only way through: a reader cannot tap `wa.me` on a screen that has
 * no WhatsApp on it, so they point their phone at it. On a phone the button beside it is the
 * way, because nobody can scan their own screen.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import encodeQR from 'qr';

/** The same number the page prints under the button, in the form WhatsApp opens. */
const CHAT = 'https://wa.me/917842178350';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../apps/site/whatsapp-qr.svg');

const matrix = encodeQR(CHAT, 'raw', { ecc: 'medium', border: 2 });
const size = matrix.length;

const parts: string[] = [];
matrix.forEach((row, y) => {
  row.forEach((dark, x) => {
    if (dark) parts.push(`M${String(x)} ${String(y)}h1v1h-1z`);
  });
});

// No width or height: the page sizes it, and the viewBox carries the quiet zone the encoder
// already drew into the matrix. `shape-rendering` keeps the modules square at any scale.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(size)} ${String(size)}" shape-rendering="crispEdges" role="img" aria-label="WhatsApp +91 78421 78350"><rect width="${String(size)}" height="${String(size)}" fill="#ffffff"/><path d="${parts.join('')}" fill="#141826"/></svg>\n`;

writeFileSync(OUT, svg);
console.log(`${OUT}  ${String(size)}×${String(size)} modules  →  ${CHAT}`);

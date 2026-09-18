/**
 * Draws the referral QR the website shows, as an SVG committed next to the page.
 *
 *   npm run site:qr
 *
 * It used to carry our own number, which made it a second way to start a conversation with us —
 * and the button beside it already was one. The owner's call on 18 September: the QR is a
 * referral tool and nothing else. It now carries `wa.me/?text=…`, which opens the reader's OWN
 * WhatsApp with the message written and a contact picker, so the thing they send is the app.
 *
 * saafarsaathi.in is static and has no build step (decision 012), so this cannot be generated
 * at request time — and a QR has no business being fetched from a third party at page load
 * either. It is drawn here with the same encoder the app's family QR uses, so there is one QR
 * implementation in the repository and not two.
 *
 * On a laptop the QR is the only way through: a reader cannot tap `wa.me` on a machine with no
 * WhatsApp on it, so they point their phone at it. On a phone the button beside it is the way,
 * because nobody can scan their own screen.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import encodeQR from 'qr';

/**
 * What a reader sends on, kept deliberately short.
 *
 * A QR grows with what is in it, and Devanagari costs nine characters per letter once it is
 * percent-encoded: the first draft of this line came to 97 modules, which at the size the page
 * shows it is 1.5 pixels a module — a picture of a QR rather than one that scans. This is 57,
 * and the page renders it at 210px, so each module is a comfortable 3.7. The button beside it
 * carries a longer line, because a tap has no such budget.
 */
const INVITE = 'दुबई जा रहे हैं? https://dubai.saafarsaathi.in';

const CHAT = `https://wa.me/?text=${encodeURIComponent(INVITE)}`;

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../apps/site/share-qr.svg');

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
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(size)} ${String(size)}" shape-rendering="crispEdges" role="img" aria-label="dubai.saafarsaathi.in, ready to send on WhatsApp"><rect width="${String(size)}" height="${String(size)}" fill="#ffffff"/><path d="${parts.join('')}" fill="#141826"/></svg>\n`;

writeFileSync(OUT, svg);
console.log(`${OUT}  ${String(size)}×${String(size)} modules  →  the invite`);

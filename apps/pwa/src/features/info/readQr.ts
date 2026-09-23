/**
 * The QR codes on the card's two sides, decoded on the phone before the card is read (decision
 * 032, the owner's addendum): a QR code is read in a fraction of a second, where the print takes
 * the engine many.
 *
 * **The browser's own reader first, then ours.** Chrome on Android carries a QR reader
 * (`BarcodeDetector`); many other browsers do not, and some carry one that finds nothing on a
 * phone without Google's services. So a side the browser's reader found nothing on — or that the
 * browser could not look at at all — is handed to jsQR, a small decoder loaded only when needed
 * and kept by the app's own worker, so it works with the radio off. Nothing here decides the
 * phone cannot read a QR code: each reader is tried, and the next one is tried after it.
 *
 * **On the phone, never sent.** The photographs go nowhere. What a code says is handed back as
 * text, and `cardQr.ts` decides what it is worth.
 */

/** Large enough for a QR code a centimetre wide on a photographed card; the second try is finer. */
const SIDES = [1200, 2000] as const;

export async function readQr(photos: readonly Blob[]): Promise<string[]> {
  const texts: string[] = [];
  for (const photo of photos) {
    let found = await withBrowser(photo);
    if (found.length === 0) found = await withJsQr(photo);
    texts.push(...found);
  }
  return texts;
}

/** The browser's own reader. Absent, or unable, is an empty answer — and the next reader's turn. */
async function withBrowser(photo: Blob): Promise<string[]> {
  try {
    const Detector = window.BarcodeDetector;
    if (Detector === undefined) return [];
    const bitmap = await createImageBitmap(photo, { imageOrientation: 'from-image' });
    try {
      const codes = await new Detector({ formats: ['qr_code'] }).detect(bitmap);
      return codes.map((code) => code.rawValue).filter((text) => text.trim() !== '');
    } finally {
      bitmap.close();
    }
  } catch {
    return [];
  }
}

/** jsQR, on the photograph's pixels, at a coarse size and then a finer one. */
async function withJsQr(photo: Blob): Promise<string[]> {
  try {
    const { default: jsQR } = await import('jsqr');
    const bitmap = await createImageBitmap(photo, { imageOrientation: 'from-image' });
    try {
      for (const longest of SIDES) {
        const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context === null) return [];
        context.drawImage(bitmap, 0, 0, width, height);
        const code = jsQR(context.getImageData(0, 0, width, height).data, width, height);
        if (code !== null && code.data.trim() !== '') return [code.data];
        // A photograph no larger than the coarse size has nothing finer to try.
        if (scale === 1) break;
      }
      return [];
    } finally {
      bitmap.close();
    }
  } catch {
    return [];
  }
}

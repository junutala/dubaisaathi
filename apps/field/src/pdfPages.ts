/**
 * A menu that arrives as a PDF, turned into the photographs the rest of the form already takes.
 *
 * The owner keys forms on a laptop from scans, and a scanning app writes one PDF per menu — form
 * 0002's is 24 pages (23 September). Each page is drawn in the browser and becomes a menu photo
 * at the same size and quality as one from the camera, so the upload, the review and whichever
 * reader is chosen later see one kind of thing. Nothing about the PDF is sent anywhere else.
 *
 * The renderer is loaded only when a PDF is picked: a phone at a shop door never pays for it.
 */

import { fitWithin } from './shrink.js';

export function isPdf(file: File): boolean {
  // Some systems hand a PDF over with no type at all; the name is then the only word on it.
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export async function pdfPages(
  file: File,
  { edge, quality }: { edge: number; quality: number },
): Promise<Blob[]> {
  // The legacy build: the modern one needs a newer browser than a collector's phone may carry.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: Blob[] = [];
  try {
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number);
      const natural = page.getViewport({ scale: 1 });
      // A PDF page is measured in points; draw it at the size a menu photograph is kept.
      const size = fitWithin(natural.width * 4, natural.height * 4, edge);
      const viewport = page.getViewport({ scale: size.width / natural.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('no canvas');
      // A page with no background of its own is transparent, and JPEG turns transparent black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });
      if (blob === null) throw new Error('page not encoded');
      pages.push(blob);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}

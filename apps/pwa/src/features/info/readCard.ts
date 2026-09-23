import type { CardLine } from './cardFields.js';
import { readable, textRunsSideways, toGrey, type Grey } from './cardImage.js';

/**
 * Reading the reception card's two sides, on the phone (decision 032).
 *
 * **On the phone, never on a server.** घर.1 promises under every hotel that nothing is sent
 * anywhere, and the website promises it too. The card is read here or not at all.
 *
 * **Loaded only when asked.** The engine and its English are about 3.4 MB over the wire, and a
 * traveller who never presses Submit with a card on the screen never pays for them. The import
 * is inside the function for that reason.
 *
 * **Served from our own origin**, like the collectors' menu reader (apps/field/src/readMenu.ts):
 * the engine's defaults fetch from a CDN, which the app's security policy refuses and which would
 * make the hotel depend on somebody else's host. The build puts the files under /ocr/v7/.
 *
 * **Kept once fetched.** The English data goes into IndexedDB the first time (the engine's own
 * store), and the worker and core into a cache of their own that no release and no repair clears
 * (vite.config.ts, app/updates.ts) — so the second card is read with the radio off.
 *
 * **Never a dead end.** If the engine cannot be fetched or cannot read, this says so and returns
 * nothing, and the traveller types the three boxes — which is what they did before this existed.
 */

/** Where the Dockerfile puts the worker, the core and eng.traineddata.gz. Versioned, so immutable. */
const OCR_PATH = '/ocr/v7/';

export interface CardReading {
  readonly lines: readonly CardLine[];
  /** The engine could not be fetched or could not read, so the screen can say so plainly. */
  readonly failed: boolean;
}

/** The longest side a photograph is read at: large enough for a card's small print, no larger. */
const LONGEST_SIDE = 1800;
/**
 * A reading with fewer sure words than this is the card the wrong way round, or not a card. On
 * 23 September the right way round gave 9 to 30 and the wrong ways 0 to 5 — four was too few,
 * and stopped on an upside-down reading of a card turned the other way.
 */
const SURE_WORDS = 8;

/**
 * Every way round a card can be held, the likeliest first, and each tried only while the ones
 * before it read too little. The sideways check orders them and never rules one out: it is a
 * guess from the ink, and on 23 September it guessed "sideways" for upright cards whose logo
 * panel or lamp-lit half outweighed the print — a guess that is allowed to skip the upright
 * reading is a fallback nobody reaches.
 */
export function turnsFor(looksSideways: boolean): readonly number[] {
  return looksSideways ? [90, 270, 0, 180] : [0, 90, 270, 180];
}

/**
 * How long the engine may take to start: the first time it is ~4.5 MB over the phone's own
 * connection; after that it comes off the phone in seconds. Without a limit, an engine whose
 * English could not be fetched never answers at all, and Submit would say "Reading…" for ever.
 */
const START_MS = { online: 120_000, offline: 25_000 };
/** How long one reading of one side may take on a slow phone. */
const READ_MS = 60_000;

/** The promise, or a refusal after `ms` — the engine's silence is an answer too. */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('the card reader did not answer'));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function readCard(photos: readonly Blob[]): Promise<CardReading> {
  if (photos.length === 0) return { lines: [], failed: false };
  try {
    const { createWorker } = await import('tesseract.js');
    const starting = createWorker('eng', 1, {
      workerPath: `${OCR_PATH}worker.min.js`,
      corePath: OCR_PATH,
      langPath: OCR_PATH,
      gzip: true,
      // A worker from our own origin, not from a blob: the app's policy allows the first only.
      workerBlobURL: false,
    });
    let worker: Awaited<typeof starting>;
    try {
      worker = await within(starting, navigator.onLine ? START_MS.online : START_MS.offline);
    } catch (error) {
      // Given up on: if it starts after all, it is stopped rather than left holding a thread.
      void starting.then((late) => late.terminate()).catch(() => undefined);
      throw error;
    }
    try {
      // A phone photograph carries no resolution the engine believes, and it guesses 25 dpi —
      // at which a photographed card read as noise on 23 September and read whole at 300. The
      // engine's own threshold, not a local one: measured the same day, the local one misread
      // three desk numbers in twelve cards and the whole-card one misread none.
      await worker.setParameters({ user_defined_dpi: '300' });
      const lines: CardLine[] = [];
      for (const photo of photos) {
        const grey = readable(await greyOf(photo));
        let best: { lines: CardLine[]; sure: number } | undefined;
        for (const turn of turnsFor(textRunsSideways(grey))) {
          // `rotateAuto` straightens the few degrees a hand tilts a card; the turns do the rest.
          const { data } = await within(
            worker.recognize(canvasOf(grey, turn), { rotateAuto: true }, { blocks: true }),
            READ_MS,
          );
          const read = linesOf(data.blocks ?? []);
          if (best === undefined || read.sure > best.sure) best = read;
          if (read.sure >= SURE_WORDS) break;
        }
        lines.push(...(best?.lines ?? []));
      }
      return { lines, failed: false };
    } finally {
      // Always, including when a photo throws: the worker holds a thread and a few MB of wasm.
      await worker.terminate();
    }
  } catch {
    return { lines: [], failed: true };
  }
}

/** A photograph as grey levels, upright as the camera meant it and no larger than it needs. */
async function greyOf(photo: Blob): Promise<Grey> {
  // `from-image` applies the camera's own rotation flag, which a raw JPEG leaves to the viewer.
  const bitmap = await createImageBitmap(photo, { imageOrientation: 'from-image' });
  const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return toGrey(context.getImageData(0, 0, width, height).data, width, height);
}

/** Grey levels back onto a canvas, turned clockwise by `turn` degrees. */
function canvasOf(grey: Grey, turn: number): HTMLCanvasElement {
  const flat = document.createElement('canvas');
  flat.width = grey.width;
  flat.height = grey.height;
  const flatContext = flat.getContext('2d');
  if (flatContext === null) throw new Error('no 2d context');
  const image = flatContext.createImageData(grey.width, grey.height);
  for (let index = 0; index < grey.pixels.length; index += 1) {
    const value = grey.pixels[index] ?? 255;
    image.data[index * 4] = value;
    image.data[index * 4 + 1] = value;
    image.data[index * 4 + 2] = value;
    image.data[index * 4 + 3] = 255;
  }
  flatContext.putImageData(image, 0, 0);
  if (turn === 0) return flat;

  const quarter = turn % 180 !== 0;
  const turned = document.createElement('canvas');
  turned.width = quarter ? grey.height : grey.width;
  turned.height = quarter ? grey.width : grey.height;
  const context = turned.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.translate(turned.width / 2, turned.height / 2);
  context.rotate((turn * Math.PI) / 180);
  context.drawImage(flat, -grey.width / 2, -grey.height / 2);
  return turned;
}

interface ReadBlock {
  readonly paragraphs: readonly {
    readonly lines: readonly {
      readonly text: string;
      readonly bbox: { readonly y0: number; readonly y1: number };
      readonly words: readonly { readonly text: string; readonly confidence: number }[];
    }[];
  }[];
}

/** The lines the engine found, each with its height, and how many words it was sure of. */
export function linesOf(blocks: readonly ReadBlock[]): { lines: CardLine[]; sure: number } {
  const lines: CardLine[] = [];
  let sure = 0;
  for (const block of blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        sure += line.words.filter(
          (word) => word.confidence >= 70 && /[A-Za-z0-9]{3,}/.test(word.text),
        ).length;
        lines.push({ text: line.text.trim(), height: line.bbox.y1 - line.bbox.y0 });
      }
    }
  }
  return { lines, sure };
}

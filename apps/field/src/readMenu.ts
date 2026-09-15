import { dishCandidates, type Candidate } from './dishCandidates.js';

/**
 * Reading the menu photographs a collector has just taken.
 *
 * Typing 400 menus by hand is not a job anybody finishes, so the camera does the typing and the
 * collector does the knowing: this returns candidate lines, and nothing becomes a dish until a
 * person standing in front of the board taps it. That ordering is the point — OCR read three
 * days later has nobody left who can tell whether it said "Sabudana" or "Sambudana".
 *
 * **Loaded only when asked.** The engine and its language data are about 10 MB, and a collector
 * who never opens a menu should never pay for them. The import is inside the function for that
 * reason; it is not an accident of style.
 *
 * **Served from our own origin**, like the Hindi speech model (deploy/Dockerfile). The engine's
 * own defaults fetch the worker, the wasm and the language data from a CDN, which would mean a
 * staff tool that stops working when somebody else's host has a bad day, and a third-party
 * request from a street in Meena Bazaar. The build puts all three under /ocr/ instead.
 */

/** Where the Dockerfile puts the worker, the wasm core and eng.traineddata.gz. */
const OCR_PATH = '/ocr/';

export interface MenuReading {
  readonly candidates: readonly Candidate[];
  /** True when the engine could not be reached at all, so the screen can say so plainly. */
  readonly failed: boolean;
}

export async function readMenu(
  photos: readonly Blob[],
  onProgress?: (fraction: number) => void,
): Promise<MenuReading> {
  if (photos.length === 0) return { candidates: [], failed: false };

  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      workerPath: `${OCR_PATH}worker.min.js`,
      corePath: OCR_PATH,
      langPath: OCR_PATH,
      gzip: true,
    });

    try {
      let text = '';
      for (const [index, photo] of photos.entries()) {
        const { data } = await worker.recognize(photo);
        text += `\n${data.text}`;
        onProgress?.((index + 1) / photos.length);
      }
      return { candidates: dishCandidates(text), failed: false };
    } finally {
      // Always, including when a photo throws: the worker holds a web worker and ~10 MB of wasm,
      // and a collector fills this form thirty times a day.
      await worker.terminate();
    }
  } catch {
    // The engine did not load or could not read. The collector can still type the dishes, which
    // is exactly what they did before this existed — so this is a slower path, never a dead end.
    return { candidates: [], failed: true };
  }
}

import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';

/**
 * घर.7's two halves: the photograph made small on the phone, and the `readboard` function that
 * says what the Arabic on it means, in Hindi.
 *
 * Making it small is also what makes it private. Drawing the photograph onto a canvas and saving
 * that keeps the pixels and nothing else — no place, no time, no phone model — so what leaves the
 * phone is the board and not where the traveller stood. The server keeps no photograph at all.
 */

const READ_BOARD = `${PROJECT_URL}/functions/v1/readboard`;

/** The long edge after shrinking: plenty for a board's letters, a few hundred kB as a JPEG. */
export const MAX_EDGE = 1600;

/** The size a photograph is drawn at: the long edge at most MAX_EDGE, never enlarged. */
export function scaledSize(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export interface Photo {
  /** Base64 JPEG, without the `data:` prefix. */
  readonly data: string;
  readonly type: 'image/jpeg';
}

/** Draws the photograph small and upright, and returns it as a JPEG with nothing else in it. */
export async function shrinkPhoto(file: Blob): Promise<Photo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const size = scaledSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no canvas');
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (made) => {
        if (made === null) reject(new Error('no image'));
        else resolve(made);
      },
      'image/jpeg',
      0.85,
    );
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { data: btoa(binary), type: 'image/jpeg' };
}

export type BoardRead =
  | { readonly kind: 'read'; readonly arabic: string; readonly hindi: string }
  /** The photograph had no Arabic that could be read. */
  | { readonly kind: 'none' }
  | { readonly kind: 'offline' }
  | { readonly kind: 'refused'; readonly reason: 'not-configured' | 'too-large' | 'busy' }
  | { readonly kind: 'failed' };

/** Every ending is a value the screen has one line for; nothing throws. */
export async function readBoard(photo: Photo): Promise<BoardRead> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline' };

  let response: Response;
  try {
    response = await fetch(READ_BOARD, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ image: photo.data, type: photo.type }),
    });
  } catch {
    return { kind: 'failed' };
  }

  if (response.status === 503) return { kind: 'refused', reason: 'not-configured' };
  if (response.status === 413) return { kind: 'refused', reason: 'too-large' };
  if (response.status === 429) return { kind: 'refused', reason: 'busy' };
  if (!response.ok) return { kind: 'failed' };

  let body: { arabic?: unknown; hindi?: unknown };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return { kind: 'failed' };
  }
  const arabic = typeof body.arabic === 'string' ? body.arabic.trim() : '';
  const hindi = typeof body.hindi === 'string' ? body.hindi.trim() : '';
  return arabic === '' || hindi === '' ? { kind: 'none' } : { kind: 'read', arabic, hindi };
}

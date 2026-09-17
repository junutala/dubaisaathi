import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';

/**
 * The English sentence, in Arabic, through the `translate` function that already exists.
 *
 * Nothing about that function changes for बोलना: it takes `{ text }` and answers `{ ar, from }`,
 * and it holds the Google key so no key is ever in the bundle. The same outcome discipline as
 * `listen` — every ending is a value the screen has one line for, and nothing throws.
 */

const TRANSLATE = `${PROJECT_URL}/functions/v1/translate`;

export type Translated =
  | { readonly kind: 'arabic'; readonly ar: string }
  /** No radio. The Arabic cannot be fetched; whatever is already on the screen still reads aloud. */
  | { readonly kind: 'offline' }
  | { readonly kind: 'refused'; readonly reason: 'not-configured' | 'too-long' | 'nothing' }
  | { readonly kind: 'failed' };

export async function toArabic(text: string): Promise<Translated> {
  if (text.trim() === '') return { kind: 'refused', reason: 'nothing' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline' };

  let response: Response;
  try {
    response = await fetch(TRANSLATE, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ text }),
    });
  } catch {
    return { kind: 'failed' };
  }

  if (response.status === 503) return { kind: 'refused', reason: 'not-configured' };
  if (response.status === 413) return { kind: 'refused', reason: 'too-long' };
  if (!response.ok) return { kind: 'failed' };

  let body: { ar?: unknown };
  try {
    body = (await response.json()) as { ar?: unknown };
  } catch {
    return { kind: 'failed' };
  }

  const ar = typeof body.ar === 'string' ? body.ar.trim() : '';
  return ar === '' ? { kind: 'failed' } : { kind: 'arabic', ar };
}

import { PROJECT_URL, PUBLISHABLE_KEY } from '../../lib/supabase.js';
import { audioFormData, type Recording } from './recordAudio.js';

/**
 * The recording goes to the `listen` edge function, and English text comes back (decision 020).
 *
 * Nothing here throws. Every way this can end is one of the outcomes below, because every one of
 * them has to become one honest line on the screen — the app is the only place anyone sees this
 * work or fail, and a traveller holding a phone at a shop counter cannot open a console.
 */

const LISTEN = `${PROJECT_URL}/functions/v1/listen`;

export type Heard =
  /** Words came back. */
  | { readonly kind: 'heard'; readonly text: string }
  /** The upload worked and there were no words in it — silence, or too far from the phone. */
  | { readonly kind: 'nothing' }
  /** The radio is off. बोलना is the one online-only thing in the app; it says so. */
  | { readonly kind: 'offline' }
  /** The server turned it away, for a reason the screen has a line for. */
  | { readonly kind: 'refused'; readonly reason: 'not-configured' | 'too-long' | 'no-audio' }
  /** Everything else: a dead connection mid-upload, a 500, a body that is not what we expect. */
  | { readonly kind: 'failed' };

/**
 * Multipart carries its own `content-type`, with the boundary in it, and the browser writes that
 * header itself when the body is a `FormData`. Sending the shared JSON headers here would label
 * the audio as JSON and the function would never find the file — so the project's two keys are
 * sent without it, rather than `supabaseHeaders()` with a header deleted afterwards.
 */
function multipartHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${PUBLISHABLE_KEY}`,
    apikey: PUBLISHABLE_KEY,
  };
}

export async function listen(
  recording: Recording,
  seconds: number,
  language?: string,
): Promise<Heard> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline' };

  let response: Response;
  try {
    response = await fetch(LISTEN, {
      method: 'POST',
      headers: multipartHeaders(),
      body: audioFormData(recording.blob, recording.ext, language, seconds),
    });
  } catch {
    return { kind: 'failed' };
  }

  if (response.status === 503) return { kind: 'refused', reason: 'not-configured' };
  if (response.status === 413) return { kind: 'refused', reason: 'too-long' };
  if (response.status === 400) return { kind: 'refused', reason: 'no-audio' };
  if (!response.ok) return { kind: 'failed' };

  let body: { transcript?: unknown };
  try {
    body = (await response.json()) as { transcript?: unknown };
  } catch {
    return { kind: 'failed' };
  }

  const text = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  return text === '' ? { kind: 'nothing' } : { kind: 'heard', text };
}

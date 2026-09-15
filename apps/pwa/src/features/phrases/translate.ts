/**
 * Hindi and Hinglish into Arabic — any sentence, not a list of sentences.
 *
 * The sixteen ready phrases are shortcuts for things people tap rather than type. They were
 * never the answer to "say this for me", and a product that can only repeat sixteen sentences is
 * a parrot: _"I would rather ask them to buy a parrot than download our app."_
 *
 * So this is real translation. A seam, not an implementation — the same shape as `stt.ts`
 * (decision 010), because the engine that does the work is going to change and no screen should
 * notice. Engines are tried in order and the first that can answer, answers.
 *
 * **On grammar.** The owner settled this: _"as long as my arabic conveys the meaning, I think
 * its better than a sign language in the middle of the road at 50C."_ Machine output ships as
 * it comes. We do not hand-correct articles or gender, and nothing here waits on a reviewer.
 *
 * **Everything translated is kept.** A sentence a traveller has already said works with the
 * radio off for the rest of their trip, because the Arabic sits in IndexedDB next to the phrase
 * pack. That is what makes an online translator useful to an offline product: the second time
 * is always free, and people repeat themselves more than they think.
 */

export interface Translation {
  readonly ar: string;
  /** Which engine produced it, so a regression is traceable — as with `VoiceEvent.sttEngine`. */
  readonly engine: string;
}

export interface TranslationEngine {
  readonly id: string;
  /** True when this engine can answer with no network at all. */
  readonly worksOffline: boolean;
  /** Whether it could run right now — an offline engine with no model says no. */
  available(): Promise<boolean>;
  translate(text: string): Promise<string | null>;
}

/**
 * Google Cloud Translation, reached through our own edge function.
 *
 * The key never touches the app. A key compiled into a PWA bundle is a public key, and the bill
 * would be somebody else's to run up. The function holds it, and is the one place a per-device
 * limit can be enforced later.
 *
 * Romanized input is the point: Cloud Translation's Advanced tier translates Latin-script Hindi
 * directly, which is what a traveller actually types. Nothing here transliterates first.
 */
export const cloudTranslator: TranslationEngine = {
  id: 'google-cloud-v3',
  worksOffline: false,
  available: () => Promise.resolve(navigator.onLine),
  async translate(text) {
    const base = import.meta.env.VITE_SUPABASE_URL;
    if (base === undefined || base === '') return null;
    try {
      const answer = await fetch(`${base}/functions/v1/translate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!answer.ok) return null;
      const body: unknown = await answer.json();
      const ar = (body as { ar?: unknown }).ar;
      return typeof ar === 'string' && ar.trim() !== '' ? ar : null;
    } catch {
      // No signal, or the function is down. The caller falls through to the next engine.
      return null;
    }
  },
};

/**
 * Ordered by preference. An offline engine, when one exists, goes first: a traveller in a
 * basement should not wait for a request that is going to fail.
 */
export const TRANSLATORS: readonly TranslationEngine[] = [cloudTranslator];

export async function translateToArabic(text: string): Promise<Translation | null> {
  const words = text.trim();
  if (words === '') return null;

  for (const engine of TRANSLATORS) {
    if (!(await engine.available())) continue;
    const ar = await engine.translate(words);
    if (ar !== null) return { ar, engine: engine.id };
  }
  return null;
}

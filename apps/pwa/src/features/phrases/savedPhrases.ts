import type { SavedPhrase } from '@saathi/shared';
import { db } from '../../db/schema.js';

/**
 * Sentences a traveller asked for and kept.
 *
 * A composed sentence needs nothing kept — it rebuilds from its own words. Anything that needed
 * a translator does: without this, a sentence translated on hotel wifi is gone the moment the
 * signal is, which is the opposite of what this product promises.
 *
 * It is also how somebody prepares. A traveller who knows they will need to ask about a
 * wheelchair, a SIM card, or their child's medicine can have those ready before they land — and
 * no phrasebook written in advance can guess those three.
 *
 * Keyed by the words themselves, folded, so asking twice keeps one row and re-saving a sentence
 * refreshes it rather than filling the list with the same thing.
 */

function keyFor(said: string): string {
  return `said:${said.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

export async function savePhrase(
  said: string,
  ar: string,
  engine: string,
): Promise<SavedPhrase | null> {
  const words = said.trim();
  if (words === '' || ar.trim() === '') return null;
  const row: SavedPhrase = {
    id: keyFor(words),
    said: words,
    ar,
    engine,
    savedAt: new Date().toISOString(),
  };
  await db.savedPhrases.put(row);
  return row;
}

/** Newest first, because the last thing saved is the one being looked for. */
export async function savedPhrases(): Promise<readonly SavedPhrase[]> {
  const rows = await db.savedPhrases.orderBy('savedAt').reverse().toArray();
  return rows;
}

/** The Arabic for a sentence already kept, or undefined. Checked before any translator runs. */
export async function savedArabicFor(said: string): Promise<SavedPhrase | undefined> {
  return db.savedPhrases.get(keyFor(said));
}

export async function forgetPhrase(id: string): Promise<void> {
  await db.savedPhrases.delete(id);
}

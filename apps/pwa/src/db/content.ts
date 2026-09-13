import { PHRASE_SITUATIONS, type ContentVersion, type Phrase } from '@saathi/shared';
import { db } from './schema.js';

/**
 * Content is data, not code (CLAUDE.md working conventions): the pack ships as JSON under
 * `data/`, is loaded into IndexedDB once, and is versioned so an update replaces it wholesale
 * rather than merging by hand.
 */
interface PhrasePack {
  readonly contentVersion: number;
  readonly publishedAt: string;
  readonly phrases: readonly Phrase[];
}

/**
 * The pack ships as JSON, so its types are not checked at build time. This narrows it once,
 * at the boundary, and throws on a malformed pack rather than leaving a screen blank.
 */
export function parsePhrasePack(raw: unknown): PhrasePack {
  const pack = raw as PhrasePack;
  const bad = pack.phrases.find(
    (p) => !(PHRASE_SITUATIONS as readonly string[]).includes(p.situation),
  );
  if (bad) throw new Error(`phrase ${bad.id} has an unknown situation: ${bad.situation}`);
  return pack;
}

export const PHRASE_PACK_ID = 'phrases';

/** Idempotent: loading the same version twice is a no-op, so it is safe on every boot. */
export async function loadPhrasePack(pack: PhrasePack): Promise<'loaded' | 'already-current'> {
  const current = await db.contentVersions.get(PHRASE_PACK_ID);
  if (current && current.version >= pack.contentVersion) return 'already-current';

  await db.transaction('rw', db.phrases, db.contentVersions, async () => {
    await db.phrases.clear();
    await db.phrases.bulkAdd(pack.phrases);
    const version: ContentVersion = {
      id: PHRASE_PACK_ID,
      version: pack.contentVersion,
      publishedAt: pack.publishedAt,
      downloadedAt: new Date().toISOString(),
    };
    await db.contentVersions.put(version);
  });
  return 'loaded';
}

export async function phrasesFor(situation: Phrase['situation']): Promise<Phrase[]> {
  return db.phrases.where('situation').equals(situation).toArray();
}

export async function phraseById(id: string): Promise<Phrase | undefined> {
  return db.phrases.get(id);
}

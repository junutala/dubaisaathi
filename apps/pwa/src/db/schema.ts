import Dexie, { type EntityTable } from 'dexie';
import type { ContentVersion, Phrase, VoiceEvent } from '@saathi/shared';
import type { SavedHotel, TravellerDocument } from '../features/info/records.js';

/**
 * The local database. Everything the traveller needs lives here, because the network is for
 * freshness and payment, never for answering a question (CLAUDE.md rule 1).
 *
 * Every schema change is a new version block below with a migration — never an edit to an
 * existing one.
 */
export class SaathiDb extends Dexie {
  phrases!: EntityTable<Phrase, 'id'>;
  contentVersions!: EntityTable<ContentVersion, 'id'>;
  voiceEvents!: EntityTable<VoiceEvent, 'id'>;
  hotels!: EntityTable<SavedHotel, 'id'>;
  documents!: EntityTable<TravellerDocument, 'id'>;

  constructor(name = 'saathi') {
    super(name);
    this.version(1).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      // `synced` is indexed because the only query that matters is "what is still queued".
      voiceEvents: 'id, at, synced',
    });
    // v2: `VoiceEvent` gained `unconstrainedTranscript` — what the offline model heard with
    // nothing constraining its vocabulary. No index changes, because nothing queries it: the
    // review reads it off rows the failure index already found. The version exists so the shape
    // change is recorded here rather than discovered in a row, and so a phone carrying v1 rows
    // opens without complaint (the field is optional; old rows simply do not have it).
    this.version(2).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
    });
    // v3: ज़रूरी जानकारी gets its two tables — the hotel and the traveller's documents, both
    // carrying photographs as Blobs (decision 003). The three tables above are re-declared
    // unchanged, which is what tells Dexie to carry their rows across untouched: a phone that
    // has waited for a 42 MB voice model and photographed a passport must not lose either to a
    // release of ours. Nothing is dropped and no index is rewritten, so no upgrade function is
    // needed — `migration.test.ts` opens a v2 database and proves the rows survive.
    //
    // `documents` is indexed by `addedAt` because the only ordering 4.1 asks for is newest
    // first; `hotels` needs no secondary index, since there is one hotel and it has one key.
    this.version(3).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
      hotels: 'id',
      documents: 'id, addedAt',
    });
  }
}

export const db = new SaathiDb();

/**
 * Ask the browser to treat our data as persistent, so a passport photo is not evicted when
 * the phone runs low on space (decision 003). Best-effort: an installed PWA is usually
 * granted it, a browser tab may not be, and neither outcome changes what the app does.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  // The DOM types promise navigator.storage on every browser; older Android WebViews and
  // some in-app browsers do not have it, and this app is aimed squarely at cheap phones.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom overstates support
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

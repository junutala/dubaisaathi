import Dexie, { type EntityTable } from 'dexie';
import type { ContentVersion, Phrase, VoiceEvent } from '@saathi/shared';

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

  constructor(name = 'saathi') {
    super(name);
    this.version(1).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      // `synced` is indexed because the only query that matters is "what is still queued".
      voiceEvents: 'id, at, synced',
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

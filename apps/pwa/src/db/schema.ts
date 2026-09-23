import Dexie, { type EntityTable } from 'dexie';
import type {
  ContactMessage,
  ContentVersion,
  Phrase,
  SavedPhrase,
  TransportEdge,
  TransportNode,
  VoiceEvent,
} from '@saathi/shared';
import type { SavedHotel, TravellerDocument } from '../features/info/records.js';
import type { StoredPack } from '../features/content/records.js';
import type { TransportMeta } from '../features/transport/network.js';

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
  transportNodes!: EntityTable<TransportNode, 'id'>;
  transportEdges!: EntityTable<TransportEdge, 'id'>;
  transportMeta!: EntityTable<TransportMeta, 'id'>;
  savedPhrases!: EntityTable<SavedPhrase, 'id'>;
  messages!: EntityTable<ContactMessage, 'id'>;
  packs!: EntityTable<StoredPack, 'id'>;

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
    // v4: the transport pack — the stations, the links between them, and the fares and walking
    // speed that turn a path into a journey. Three tables rather than one blob because
    // `TransportNode` and `TransportEdge` are entities in their own right (CLAUDE.md, "Data
    // entities"), and because the planner reads the whole graph at once and nothing else does.
    //
    // This is a version of its own rather than a second helping of v3: tile 1 and tile 4 were
    // built side by side and both reached for v3, and a phone that has already opened v3 would
    // never be told about tables added to it after the fact. Everything above is re-declared
    // unchanged, so a saved hotel and a photographed passport carry across.
    this.version(4).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
      hotels: 'id',
      documents: 'id, addedAt',
      transportNodes: 'id',
      transportEdges: 'id, fromNodeId, toNodeId',
      transportMeta: 'id',
    });
    // v5: sentences a traveller asked for and kept. A phrase translated once — on hotel wifi, or
    // before the flight — is theirs offline for the rest of the trip, and preparing for what they
    // know they will need is something no phrasebook we write in advance can do for them.
    //
    // Indexed by `savedAt` so the list reads newest first without sorting the whole table on a
    // phone. Everything above is re-declared unchanged, so a saved hotel and a photographed
    // passport carry across (rule 6, and decision 003).
    this.version(5).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
      hotels: 'id',
      documents: 'id, addedAt',
      transportNodes: 'id',
      transportEdges: 'id, fromNodeId, toNodeId',
      transportMeta: 'id',
      savedPhrases: 'id, savedAt',
    });
    // v6: the hotel became a free record — name, room, the desk's number, a note and any number
    // of photographs beside the pin and the two it already held (owner, 16 September). No index
    // changes, because nothing queries the new fields; the version exists so the shape change is
    // recorded here, and every table above is re-declared unchanged so a phone carrying v5 rows
    // opens with its hotel, its documents and its unsynced queue intact. The phrase tables are
    // kept although nothing writes them now: a release never takes something away from a phone.
    this.version(6).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
      hotels: 'id',
      documents: 'id, addedAt',
      transportNodes: 'id',
      transportEdges: 'id, fromNodeId, toNodeId',
      transportMeta: 'id',
      savedPhrases: 'id, savedAt',
    });
    // v7: `messages`, the outbox घर.7 wrote to. The screen was taken out the day it shipped
    // (decision 026, reversed) and nothing writes one now — but the version stays, because a
    // phone that opened that build has a v7 database and Dexie refuses to open a database whose
    // version is higher than the schema declares. Dropping this line would take a traveller's
    // hotel and documents with it, which is the one thing a release may never do.
    //
    // Every table above is re-declared unchanged, so a phone carrying v6 opens with its hotel,
    // its documents and its unsynced queue intact (rule 6, decision 003).
    this.version(7).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
      hotels: 'id',
      documents: 'id, addedAt',
      transportNodes: 'id',
      transportEdges: 'id, fromNodeId, toNodeId',
      transportMeta: 'id',
      savedPhrases: 'id, savedAt',
      messages: 'id, at, synced',
    });
    /**
     * v8: `packs` — content that arrives without a release (decision 030). The outlets, the
     * attractions and the RTA network were compiled into the bundle, so a kitchen collected on
     * a Tuesday needed a deployment and a service-worker handover to reach anybody.
     *
     * One row per pack, holding the body as it was published. It lives in IndexedDB rather than
     * in the worker's cache for the reason a 42 MB voice model once did not: a deploy must never
     * take from a phone something it spent somebody's data downloading.
     *
     * Everything above is re-declared unchanged, so no row of the traveller's moves.
     */
    this.version(8).stores({
      phrases: 'id, situation',
      contentVersions: 'id, version',
      voiceEvents: 'id, at, synced',
      hotels: 'id',
      documents: 'id, addedAt',
      transportNodes: 'id',
      transportEdges: 'id, fromNodeId, toNodeId',
      transportMeta: 'id',
      savedPhrases: 'id, savedAt',
      messages: 'id, at, synced',
      packs: 'id, version',
    });
    /**
     * v9: the hotel is read off its card (decision 032). The row gains the card's other side, the
     * address the card prints, and when Submit was pressed. No index changes, because nothing
     * queries them. The front of the building and the extra photographs a phone may already hold
     * are not touched: nothing asks for them now, and a release never takes something away from
     * a phone.
     *
     * The one thing the upgrade does is take empty text off the hotel. Until v9 घर.1 saved every
     * box whenever any was typed into, so a phone with only a room number stored `name: ''` —
     * which जाना printed as " · मेरा होटल". An empty box is no value; the row stops carrying one.
     *
     * Everything above is re-declared unchanged, so no row of the traveller's moves.
     */
    this.version(9)
      .stores({
        phrases: 'id, situation',
        contentVersions: 'id, version',
        voiceEvents: 'id, at, synced',
        hotels: 'id',
        documents: 'id, addedAt',
        transportNodes: 'id',
        transportEdges: 'id, fromNodeId, toNodeId',
        transportMeta: 'id',
        savedPhrases: 'id, savedAt',
        messages: 'id, at, synced',
        packs: 'id, version',
      })
      .upgrade(async (tx) => {
        const blank = (value: unknown) => typeof value === 'string' && value.trim() === '';
        await tx
          .table<{ name?: unknown; room?: unknown; phone?: unknown; note?: unknown }>('hotels')
          .toCollection()
          .modify((hotel) => {
            if (blank(hotel.name)) delete hotel.name;
            if (blank(hotel.room)) delete hotel.room;
            if (blank(hotel.phone)) delete hotel.phone;
            if (blank(hotel.note)) delete hotel.note;
          });
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

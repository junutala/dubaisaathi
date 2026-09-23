import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Phrase, VoiceEvent } from '@saathi/shared';
import { SaathiDb } from '../../db/schema.js';
import { cloneKeepingBlobs } from './blobHarness.js';

/**
 * The worst defect this project has had was a release deleting something a traveller waited
 * for. A schema bump is the other way that happens, so this opens a database written by the
 * shipped version and checks that upgrading to v3 costs the phone nothing: the phrase pack is
 * still there, the unsynced voice events are still there, and the two new tables exist.
 *
 * It runs against a database of its own so the real one is untouched.
 */
const NAME = 'saathi-migration-test';

/** The shape as it shipped: three tables, no hotel and no documents. */
function openV2(): Dexie {
  const old = new Dexie(NAME);
  old.version(1).stores({
    phrases: 'id, situation',
    contentVersions: 'id, version',
    voiceEvents: 'id, at, synced',
  });
  old.version(2).stores({
    phrases: 'id, situation',
    contentVersions: 'id, version',
    voiceEvents: 'id, at, synced',
  });
  return old;
}

const PHRASE: Phrase = {
  id: 'taxi-hotel',
  situation: 'taxi',
  hi: 'इस होटल तक ले चलो',
  hinglish: 'is hotel tak le chalo',
  en: 'Take me to this hotel',
  ar: 'خذني إلى هذا الفندق',
};

const EVENT: VoiceEvent = {
  id: 'event-1',
  deviceId: 'device-1',
  at: '2026-09-13T09:00:00.000Z',
  sttEngine: 'vosk-hi',
  sttModel: 'vosk-model-small-hi-0.22',
  transcript: 'मरीना मॉल जाना है',
  script: 'devanagari',
  intent: 'route',
  confidence: 0.9,
  landedOn: '1.3',
  failure: null,
  synced: false,
};

beforeEach(() => {
  // Without this the harness stores photographs and keeps none of them — see blobHarness.ts.
  vi.stubGlobal('structuredClone', cloneKeepingBlobs);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await Dexie.delete(NAME);
});

describe('upgrading a phone that already has the app', () => {
  it('keeps the phrase pack and the unsynced voice events across the bumps', async () => {
    const old = openV2();
    await old.open();
    await old.table('phrases').put(PHRASE);
    await old.table('contentVersions').put({
      id: 'phrases',
      version: 1,
      publishedAt: '2026-09-13T00:00:00Z',
    });
    await old.table('voiceEvents').put(EVENT);
    old.close();

    const upgraded = new SaathiDb(NAME);
    await upgraded.open();

    expect(upgraded.verno).toBe(10);
    expect((await upgraded.phrases.get('taxi-hotel'))?.ar).toBe(PHRASE.ar);
    expect((await upgraded.contentVersions.get('phrases'))?.version).toBe(1);
    // The queue is what the learning loop is: losing it loses labelled recogniser errors that
    // no one can produce again.
    expect(await upgraded.voiceEvents.count()).toBe(1);
    expect((await upgraded.voiceEvents.get('event-1'))?.transcript).toBe(EVENT.transcript);
    upgraded.close();
  });

  it('opens every table added since on that same upgraded phone, ready to be written to', async () => {
    const old = openV2();
    await old.open();
    old.close();

    const upgraded = new SaathiDb(NAME);
    await upgraded.open();
    await upgraded.documents.add({
      id: 'doc-1',
      name: 'पासपोर्ट',
      addedAt: '2026-09-14T09:00:00.000Z',
      photo: new Blob(['passport-page'], { type: 'image/jpeg' }),
    });

    expect(await upgraded.documents.count()).toBe(1);
    expect(await (await upgraded.documents.get('doc-1'))?.photo.text()).toBe('passport-page');
    expect(await upgraded.hotels.count()).toBe(0);

    // v5 arrived with saved phrases. A traveller mid-trip, upgrading from an older build, must
    // find the table there and their documents still in place — the upgrade adds, never takes.
    await upgraded.savedPhrases.add({
      id: 'said:mera ac kharab hai',
      said: 'mera AC kharab hai',
      ar: 'المكيف لا يعمل',
      engine: 'test',
      savedAt: '2026-09-15T09:00:00.000Z',
    });
    expect(await upgraded.savedPhrases.count()).toBe(1);
    expect(await upgraded.documents.count()).toBe(1);

    // v7 arrived with the outbox (decision 026). Same rule: the table is there on an old
    // phone, and nothing that was already on it has moved.
    await upgraded.messages.add({
      id: 'message-1',
      at: '2026-09-18T09:00:00.000Z',
      name: 'अरुण',
      country: 'IN',
      phone: '9876543210',
      message: 'करामा में साबूदाना खिचड़ी कहाँ मिलेगी?',
      locale: 'hi',
      synced: false,
    });
    expect(await upgraded.messages.count()).toBe(1);
    expect(await upgraded.documents.count()).toBe(1);
    expect(await upgraded.savedPhrases.count()).toBe(1);
    upgraded.close();
  });

  it('carries a hotel photographed before the card screen across v9, every photograph intact', async () => {
    // Decision 032 stopped asking for the front of the building and for extra photographs. A
    // phone that already holds them must open v9 with them still there: nothing asks for them
    // now, and a release never takes something away from a phone.
    // Written as the shipped v8 build wrote it.
    const v8 = new Dexie(NAME);
    v8.version(8).stores({
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
    await v8.open();
    await v8.table('hotels').put({
      id: 'hotel',
      savedAt: '2026-09-22T09:00:00.000Z',
      room: '203',
      // What घर.1 saved before v9 when only the room was typed.
      name: '',
      phone: '',
      note: '  ',
      cardPhoto: new Blob(['card'], { type: 'image/jpeg' }),
      gatePhoto: new Blob(['gate'], { type: 'image/jpeg' }),
      photos: [new Blob(['lift'], { type: 'image/jpeg' })],
    });
    v8.close();

    const upgraded = new SaathiDb(NAME);
    await upgraded.open();
    expect(upgraded.verno).toBe(10);
    const hotel = await upgraded.hotels.get('hotel');
    expect(hotel?.room).toBe('203');
    expect(await hotel?.cardPhoto?.text()).toBe('card');
    expect(await hotel?.gatePhoto?.text()).toBe('gate');
    expect(await hotel?.photos?.[0]?.text()).toBe('lift');
    expect(hotel?.submittedAt).toBeUndefined();
    // An empty box is no value: जाना must not print " · मेरा होटल" for a hotel with no name.
    expect(hotel !== undefined && 'name' in hotel).toBe(false);
    expect(hotel !== undefined && 'phone' in hotel).toBe(false);
    expect(hotel !== undefined && 'note' in hotel).toBe(false);
    upgraded.close();
  });
  it('carries a pinned hotel across v10 untouched, still a pin where the traveller stood', async () => {
    // v10 lets the card's QR code place the pin (decision 032, addendum). A hotel pinned before
    // it has no `pinFrom`, which is what "pinned where you stood" means — so nothing is rewritten.
    const v9 = new Dexie(NAME);
    v9.version(9).stores({
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
    await v9.open();
    await v9.table('hotels').put({
      id: 'hotel',
      savedAt: '2026-09-23T09:00:00.000Z',
      name: 'Rigga Palm Inn',
      pin: { lat: 25.2637, lng: 55.3197 },
      area: { hi: 'अल रिग्गा', en: 'Al Rigga' },
      submittedAt: '2026-09-23T09:00:00.000Z',
      cardPhoto: new Blob(['card'], { type: 'image/jpeg' }),
    });
    v9.close();

    const upgraded = new SaathiDb(NAME);
    await upgraded.open();
    expect(upgraded.verno).toBe(10);
    const hotel = await upgraded.hotels.get('hotel');
    expect(hotel?.name).toBe('Rigga Palm Inn');
    expect(hotel?.pin).toEqual({ lat: 25.2637, lng: 55.3197 });
    expect(hotel?.area?.en).toBe('Al Rigga');
    expect(await hotel?.cardPhoto?.text()).toBe('card');
    expect(hotel?.pinFrom).toBeUndefined();
    expect(hotel?.cardPin).toBeUndefined();
    expect(hotel?.cardLink).toBeUndefined();
    // And the new fields can be written on the upgraded phone.
    await upgraded.hotels.put({
      ...hotel!,
      cardPin: { at: { lat: 25.2521, lng: 55.3012 } },
      cardLink: 'https://maps.app.goo.gl/Xy12',
    });
    expect((await upgraded.hotels.get('hotel'))?.cardLink).toBe('https://maps.app.goo.gl/Xy12');
    upgraded.close();
  });
});

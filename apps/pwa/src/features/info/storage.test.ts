import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema.js';
import { cloneKeepingBlobs } from './blobHarness.js';
import { areaFor } from './nearestArea.js';
import { HOTEL_ID } from './records.js';
import {
  deleteDocument,
  listDocuments,
  readDocument,
  readHotel,
  saveDocument,
  saveHotelCapture,
} from './storage.js';

/**
 * These do not describe the design. They are the things that would be reported from a desk in
 * Deira: the document is not there any more, the hotel I photographed shows nothing, I deleted
 * it and it came back. Each one fails on that symptom and on nothing else.
 */

/** A photograph, as far as IndexedDB is concerned: some bytes with a type. */
function photo(bytes: string): Blob {
  return new Blob([bytes], { type: 'image/jpeg' });
}

async function readBack(blob: Blob | undefined): Promise<string> {
  return blob ? blob.text() : '';
}

describe('what ज़रूरी जानकारी keeps on the phone', () => {
  beforeEach(async () => {
    // Without this the harness stores photographs and keeps none of them — see blobHarness.ts.
    vi.stubGlobal('structuredClone', cloneKeepingBlobs);
    await db.delete();
    await db.open();
  });

  it('still has the document after the app is closed and opened again', async () => {
    await saveDocument('यात्रा बीमा', photo('insurance-page'));

    // What a relaunch actually is: every handle dropped, the database opened from disk again.
    db.close();
    await db.open();

    const [doc] = await listDocuments();
    expect(doc?.name).toBe('यात्रा बीमा');
    expect(await readBack(doc?.photo)).toBe('insurance-page');
  });

  it('keeps a hotel that is only a photograph — no pin, and still showable to a driver', async () => {
    // The traveller pressed कार्ड की फ़ोटो in the lobby and never pressed यहीं पिन करें. That
    // is a complete hotel (4.2: "कोई एक काफ़ी है"), and the bug this guards against is the one
    // where a missing pin makes the card behave as though there were no hotel at all.
    await saveHotelCapture({ cardPhoto: photo('reception-card') });

    db.close();
    await db.open();

    const hotel = await readHotel();
    expect(hotel?.id).toBe(HOTEL_ID);
    expect(hotel?.pin).toBeUndefined();
    expect(await readBack(hotel?.cardPhoto)).toBe('reception-card');
  });

  it('lets a pin gain a card photo later without losing the pin', async () => {
    await saveHotelCapture({ pin: { lat: 25.2697, lng: 55.3095 } });
    await saveHotelCapture({ cardPhoto: photo('reception-card') });

    const hotel = await readHotel();
    expect(hotel?.pin?.lat).toBeCloseTo(25.2697);
    expect(await readBack(hotel?.cardPhoto)).toBe('reception-card');
  });

  it('deletes the photograph with the row, not just the row from the list', async () => {
    const doc = await saveDocument('पासपोर्ट', photo('passport-page'));
    await deleteDocument(doc.id);

    expect(await listDocuments()).toEqual([]);
    expect(await readDocument(doc.id)).toBeUndefined();
    // And it is gone from the table itself, not merely filtered out of one query.
    expect(await db.documents.count()).toBe(0);
  });

  it('puts the newest document first, because that is the one being looked for', async () => {
    const older = await saveDocument('पासपोर्ट', photo('a'));
    await db.documents.update(older.id, { addedAt: '2026-09-01T10:00:00.000Z' });
    await saveDocument('वापसी की फ़्लाइट', photo('b'));

    expect((await listDocuments()).map((d) => d.name)).toEqual(['वापसी की फ़्लाइट', 'पासपोर्ट']);
  });
});

describe('the area a pin falls in', () => {
  it('names the neighbourhood a traveller is standing in, with no network', () => {
    expect(areaFor({ lat: 25.2697, lng: 55.3095 })?.hi).toBe('देरा');
    expect(areaFor({ lat: 25.2451, lng: 55.3047 })?.en).toBe('Karama');
  });

  it('says nothing rather than the wrong thing when the pack does not cover the spot', () => {
    // Abu Dhabi. A name here would be a confident lie on the one screen that must not tell one.
    expect(areaFor({ lat: 24.4539, lng: 54.3773 })).toBeUndefined();
  });

  it('never answers with a mall, because a hotel is not in a shopping centre', () => {
    // Standing at Dubai Mall: the nearest listed place is the mall, the nearest *area* is not.
    expect(areaFor({ lat: 25.1975, lng: 55.2796 })?.en).not.toBe('Dubai Mall');
  });
});

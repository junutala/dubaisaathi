# 015 — The hotel and the documents are typed where they live, and named by the pin

**Decided:** building tile 4, 14 September 2026. Follows decisions 002 and 003.

Three small choices came up building ज़रूरी जानकारी that the next reader would otherwise have
to reverse-engineer.

## `SavedHotel` and `TravellerDocument` are not in `@saathi/shared`

`packages/shared` is described in CLAUDE.md as "entity types shared by pwa and api — one
definition, imported twice". Neither of these has a second side. Decision 003 says the
documents are stored on the device and **never uploaded**: we hold no passports, so there is
nothing to breach. A type in the shared package would describe a wire format that must not
exist, and the first person to write a sync job would find it already modelled for them.

So they live in `apps/pwa/src/features/info/records.ts`, with the feature that owns them, and
`db/schema.ts` imports them from there. The `EmergencyPoint` name **is** reused, for the
consulate, because that one is content and does ship from the pack.

## A hotel's name comes from the pin, or there is no name

The field ledger gives 4.1 a hotel name, and design rule 14 says the hotel is captured by pin,
card photo or entrance photo and **never typed**. Those two are only compatible if the name
comes from somewhere on the phone.

It comes from the place pack that already ships for the intent parser: the neighbourhood the
pin fell in, within 4 km, in both interface languages, resolved at capture time and copied onto
the row so a later pack cannot blank it. Outside that radius, and for a hotel captured by
photograph alone, **the hotel has no name** and 4.1 says what it does have — कार्ड की फ़ोटो ·
पिन लगा है. A wrong district on this screen is worse than a missing one: the whole tile is the
thing a traveller reads out to a stranger when they are lost.

What this does not do is name the hotel itself. "Hotel Rimal, Deira" on the artboard is a hotel
name plus an area, and nothing offline can supply the first half without a keyboard. The area
is the honest half. Naming the hotel needs either a typed field — which rule 14 forbids — or a
hotel in the content pack, which is a content question, not a code one.

## Photographs are Blobs, and the test harness had to be corrected to prove it

`fake-indexeddb` clones values with the platform's `structuredClone`, which does not understand
jsdom's `Blob`: a photograph stored through the harness comes back as an empty object with its
bytes gone, and every assertion about names, dates and counts still passes. That is precisely
the failure CLAUDE.md warns about — a harness asserting properties that stay true while the
product is broken.

`apps/pwa/src/features/info/blobHarness.ts` corrects the harness rather than the tests: every
value is copied as before and a Blob is carried across by reference, which is what a real
IndexedDB does with the bytes. Nothing in the app mutates a stored photograph, so sharing the
instance cannot hide a bug a browser would have. The tests then read the bytes back after
closing and reopening the database, so "the passport is still there" is a claim the suite can
actually make.

One thing this leaves open for the owner. Storing the bytes (an `ArrayBuffer`) rather than a
`Blob` would be a little more durable — WebKit has a history of losing blob bodies held in
IndexedDB, and CLAUDE.md's hardest rule is that a release never takes something away from a
phone. It was not done, because Blobs were the instruction and they are what Dexie and every
current browser support. It is a small change if the owner wants it.

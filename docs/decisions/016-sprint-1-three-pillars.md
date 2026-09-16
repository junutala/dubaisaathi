# 016 — Sprint 1: three pillars, no voice, an offline information desk

**Status:** accepted 16 September · **Supersedes** decisions 004, 010, 013 and 014 in emphasis
and in mechanism; **keeps** 001, 002 (red), 003, 005, 006 (prices), 007, 011, 012, 015 (the
hotel and the documents stay local)

## The decision

Dubai Saathi is an **offline information desk** for Indian travellers in Dubai. Three pillars,
named in the traveller's own language and kept in Devanagari in both interface languages
because they are the brand and not a translation:

- **खाना · Khaana** — the dish is the search, the place is the answer. Small eateries and
  cafeterias a tourist would never find, with what a person in the kitchen was asked.
- **जाना · Jaana** — a place or an address in a box, a suggestion when the spelling is near a
  place we ship, every way there with the time and the fare, the steps, and a taxi hand-off to
  Careem with the Arabic address for a street taxi.
- **जानना · Jaanna** — the places of Dubai with hours, ticket, how long it takes and whom to
  ring, in Hindi. Attractions only. Hotels and homestays are not listed.

**The hotel lives on the top strip**, under the brand, on every screen, until the traveller
changes it: photographs, room, the desk's number, a note, a pin — whatever they want to keep,
without limit, on the phone only. **Documents** are the fourth item in the bar, likewise
without limit.

**There is no microphone anywhere in the app.** Three days on a real phone established that no
offline recogniser at a size a traveller accepts hears Dubai place names in an Indian accent
inside a Hindi sentence — Vosk, Whisper base and Google's cloud recogniser failed the same way
on the same afternoon. The owner's rule, and the reason it is not "online voice only": a
tourist blurs online and offline, and a feature that works in the hotel and fails on the street
is blamed on the app. What survives is the text matcher, which is what every box runs on.

**The pass stays, and it is never a wall.** It is a small dot on the strip, green while the
counter runs and marigold when the Dubai day is ending — never red (decision 002). A पास लें
button sits in the bar while the counter is a trial, in India or in Dubai, and goes once a pass
is bought. From the twentieth hour of the Dubai day, every open of घर nudges toward a pass. A
traveller who has paid once is never gated again, however long ago the fourteen days ran out.

**Time is Dubai's.** Opening and closing hours are computed in Asia/Dubai, never on the phone's
clock, so a traveller testing from India is told what is true in Karama.

**The menu is a grid, not a photograph.** The collector's app reads the card by OCR and the
collector confirms each dish and its price; the traveller sees that list in their script.

**Devanagari is shown only for a place we ship.** "Burjman" is answered with "क्या आपका मतलब
बुरजुमान है?" using the place's own name; the app never transliterates a traveller's Roman
letters into a Devanagari guess.

**3.3 · काम की बातें is parked for Sprint 2.** Abstract questions were two days of fighting and
cannot yet be understood or answered well enough to stand behind.

## What this changed in code

- `features/voice/` is gone; the parser, the nearest-place matcher and the question log moved
  to `features/ask/`. `features/phrases/` is gone with the Arabic screens; the phrase tables
  stay declared in Dexie because a release never takes something away from a phone.
- `@huggingface/transformers`, the model download, the audio worklet, the Dockerfile's voice
  stage and the `/models/` location in nginx are gone. The CSP no longer permits WebAssembly or
  blob workers; the Permissions-Policy denies the microphone.
- New routes: `hotel`, `docs`, `food/:dish`, `outlet`, `menu`, `go`, `taxi`, `know`, `place`.
- New content: `data/restaurants/dishes.v1.json`, `data/places/attractions.v1.json`, seven
  more places in `data/intents/places.v1.json`. The one "collected" outlet at Chennai
  coordinates was a test report and is removed.
- Entitlement: `isGated` is false for anyone who has paid; `needsNudge` from four hours left;
  `canBuy` while unpaid.

## What it costs

The Arabic phrase pack, composition and text-to-speech are no longer reachable from any screen.
The sixteen sentences are still in `data/phrases/`, and the taxi hand-off shows the Arabic name
of a place we ship, which is the one Arabic a driver needs.

The attractions' hours, tickets and phone numbers are as known on 16 September 2026 and not yet
checked by a person on the ground. Every row carries `checkedAt`.

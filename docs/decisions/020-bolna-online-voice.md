# 020 · बोलना: one microphone, online only

**Date:** 17 September
**Status:** accepted
**Supersedes, in part:** [016 · Sprint 1, three pillars](016-sprint-1-three-pillars.md) — only the
part that says the product has no microphone anywhere.

## What 016 decided

Offline Hindi recognition was measured on a real phone in aeroplane mode on 13–15 September with
Vosk small and Whisper base, and online with Google's recogniser (`docs/spikes/002`). All three
mangled Dubai place names in an Indian accent inside a Hindi sentence, and nothing at a size a
traveller will download did better. So voice came out of the product: no recogniser, no synthesis,
no microphone, and the seam that would have let an engine back in was removed on purpose. Every box
in खाना, जाना and जानना is typed into, and the script-agnostic matcher is what runs on what is
typed.

That decision holds. Nothing below changes it.

## What changed

Two things, neither of which was true on 16 September.

1. **The job is different.** 016 was about hearing a _destination_ — one place name, pulled out of
   a sentence, matched against our pack, and routed on. बोलना hears a _whole sentence_ and hands
   it to a person: "I need a room with hot water", said in Hindi or Tamil, shown to a Dubai
   shopkeeper in English and in Arabic. A word misheard in the middle of it is visible on the
   screen and is corrected by the traveller in the box before anyone else reads it. Nothing is
   routed on it, so there is no wrong screen to land on.
2. **It is online, and it is proven.** The recognition is Sarvam's `saaras:v3` in `translate`
   mode, called through our own edge function. The owner has run it on real sentences in Hindi
   and Tamil in his other product, where the same call has been in the field for months. It is
   not an offline model at a size a phone will hold; it is a request, and it needs a signal.

## The decision

- There is a **बोलना tile on घर, and it is on the screen only while the phone is online.** It
  appears and disappears with the signal, with no reload, because a tile that is there when it
  cannot work is a promise the app breaks the moment it is tapped. Offline, घर simply does not
  offer it — a traveller is never handed something that is going to fail.
- The tile leads to **घर.5 · बोलना**: one microphone button that starts and stops, a seconds
  counter while it is open, and the English in a box the traveller can edit. From there,
  **घर.6 · अरबी में**: the English, the same sentence in Arabic, and a button that reads it aloud
  in the phone's own voice.
- **The boundary: no microphone anywhere else.** खाना, जाना and जानना are typed into, exactly as
  016 left them, and their boxes get no mic, no "speak it" affordance and no seam for one. The
  matcher never sees a transcript from here: बोलना's sentence goes to a person, not to a screen.
- **No audio is stored, anywhere.** Not on the phone after the upload, not in the database, not in
  storage, not in a log. The `listen` function forwards the bytes to Sarvam and forgets them. The
  transcript stays on the traveller's phone; the question log keeps transcript text only, keyed to
  the device id, when the engine heard nothing or the traveller immediately recorded again —
  carrying `sarvam` / `saaras:v3`, so a regression in the engine is visible the way CLAUDE.md
  requires.
- **The key never enters the repo, a migration or the bundle.** `SARVAM_API_KEY` is a secret on
  the `listen` function, the way `GOOGLE_TRANSLATE_API_KEY` is on `translate`. A key compiled into
  a PWA is a public key, and the bill would be a stranger's to run up. Nothing of the provider's
  error body is ever passed back to the phone: an error echo can carry the key.
- **The cost has a ceiling before it is billed.** Anything over about half a minute, or about
  6 MB, is refused with a reason rather than sent on. The phone stops its own recording at half a
  minute and says so.
- **The Arabic uses the `translate` function as it is.** It takes `{ text }` and answers
  `{ ar, from }`; nothing about it changes for बोलना.

## What it costs, said plainly

बोलना is the only part of Dubai Saathi that does not work with the radio off, and rule 1 still
stands: it is therefore not a core feature. It is gated by its own absence — no tile, no screen, no
promise — rather than by an error message, and the three pillars are untouched by it. A traveller
who never has a signal has exactly the product they had yesterday.

## Alternatives considered

- **An offline model behind the same tile.** That is what 016 measured and rejected; nothing has
  changed about the sizes or the accents since.
- **A tile that is always there and says "no signal" when tapped.** Rejected: it teaches a
  traveller to distrust the tiles. The screen still says it plainly if the signal drops between
  the tap and the recording, because that can happen and it must be honest when it does.
- **Voice back in the pillars' boxes.** Rejected, unchanged from 016 — that is the job the
  recognisers could not do, and the one where a misheard word lands on the wrong screen.

## Addendum, 17 September — बोलना is a block, not a tile

**Decided by the owner, the same day, after seeing it on his phone:** _"बोलना gets the same
treatment as the three other slots with a different colour. Not below."_

So बोलना leaves the foot of घर and becomes its **fourth deep block**, after जानना and before the
pass tile: the same shape, the same cream type on a deep ground, its microphone as the watermark,
its own Roman caption (`Bolna`), and its own hue — a deep plum, `--speak` / `--onSpeak` in both
themes, which is none of खाना's burnt orange, जाना's teal or जानना's navy at a glance. The plum
carries into घर.5's microphone button, so the screen is the colour of the block that opened it.
The pass tile stays exactly where decision 018 put it, alone at the foot above the bar.

Everything else in this decision is unchanged, and one thing in particular:

- **It is still there only while the phone has a signal.** The block appears and goes with the
  `online` and `offline` events, with no reload, for the reason this decision already gives — the
  recogniser and the Arabic are both online, and a block that is there when it cannot work is a
  promise broken on the tap. A bigger, more prominent slot does not make it truer offline; it
  makes the broken promise louder, which is why it goes with the signal rather than greying out.
- **The three pillars are untouched.** Same order, same hues, same routes.

What this changed elsewhere:

- `HOME_TILES` is the pass alone again; `HomeTileState.online` stays, read now by `HomeScreen`
  for the fourth block.
- Four blocks in a column means each is a quarter of the screen, not a third. The name and the
  Roman caption collided on shorter phones until the type ladder was re-measured on a real render
  at every step from 1000px to 568px: `.pillar` keeps a positive clearance throughout, and below
  720px the blurb goes rather than the name (design rule 15).
- Design rules 1, 6, 11 and 13 were revised and rule 14 added, rather than worked around.
  `design/check-screens.py` now fails a घर board that is online without बोलना, offline with it, or
  that puts it anywhere but fourth. The घर boards regenerate with a strip that says ऑनलाइन;
  `HomeTrial` stays offline and three blocks, so the canvas carries both states.

## What it actually heard, 17 September, on the owner's phone

The spike of 13–15 September (`docs/spikes/002`) is the reason there is no offline recogniser in
this product: Vosk, Whisper base and Google's own all mangled Dubai place names spoken in an
Indian accent inside a Hindi sentence. What was measured on the day बोलना went live is worth
putting beside those numbers, because it is a different result and it decided the feature.

Sarvam's `saaras:v3` in `translate` mode was given, in this order:

- Five Hindi sentences and the same five in Tamil. Every Dubai place name survived — Burjuman,
  Karama, Discovery Gardens, Deira City Centre, Al Rigga — and so did the words that carry the
  constraint: Jain, vegetarian, cafeteria, fasting food.
- Dishes, which the spike never got near: sambar vada, sabudana khichdi, idli sambar, chole
  bhature, fruit chaat. All of them came back as themselves rather than as a translation into
  "chickpea curry", which is why `translate` and not `codemix` is the mode (`listen`'s own note
  says the same thing from the other side).
- A whole itinerary, unrehearsed: Mall of the Emirates, then Discovery Gardens, a late dinner
  party, back to a hotel in Bur Dubai. Correct in English, and correct again in Arabic through
  the existing `translate` function: مول الإمارات, حدائق ديسكفري, بر دبي.
- **One sentence mixing Hindi, English, Tamil and Telugu.** It was transcribed correctly.

That last line is the one that matters for scope. Rule 4 of CLAUDE.md governs what the _matcher_
reads and what the _interface_ speaks, and it is unchanged: Hindi and Hinglish typed, two
catalogues. बोलना does not touch it — a spoken sentence goes to a person, not to the matcher, and
the recogniser does not care which language it started in. So a Tamil or Telugu speaker can use
बोलना today without a third catalogue existing, and that is not an argument for adding one.

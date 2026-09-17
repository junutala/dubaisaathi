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

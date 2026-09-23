# 032 — The hotel is its card, read on the phone

**23 September 2026.** The owner, in Dubai, photographed his hotel's card into घर.1 and found he
still had to type the name, the number and the street printed on it:

> _"once the user uploads the card of the hotel, can we populate the fields instead of asking him
> again? except for room number, which will NOT be on the business card!"_

and then, on what the screen should be:

> _"Usually, the hotel card has front and back. So, I think we should remove the hotel photo and
> instead seek Hotel card front and back. Then once these images are uploaded, OCR them and try to
> fill up as much as possible. Besides, the Geo coordinate button is at the bottom. If the user
> does not scroll down, we miss this info. SO, keep the Geo button at the first screen itself. So,
> the hotel card(s) image and geo button. Then let the user press a CTA - Submit. Then show the
> results and let him correct if they are wrong. NO need for arabic here as our user does not read
> it anyway. Try to do nice UI so that all the data fits into one screen. No need for scrolling
> down"_

Asked on the two points it left open, he removed the front-of-the-hotel photograph as well as the
extra ones, and added an address field filled from the card.

## What घर.1 is now

**Step one, the card.** Front, back, the pin, Submit. Nothing to type. One screen.

**Step two, what the card said.** The two sides small at the top (tap one to see it full size, for a
driver; retake it from there, and a retaken side is read again) with a line beside them saying the values were read from the card, then होटल, कमरा
beside रिसेप्शन, पता and नोट, then the pin in one line. होटल हटाएँ is a bin in the header, where it
costs no row. One screen — measured at 360 × 672, the owner's phone with its browser bars, in both
languages. Everything saves as it is typed.

- **Only empty boxes are filled.** A reading never writes over what the traveller typed, and a box
  typed into while a reading is on its way is not undone by it.
- **The room is never filled.** No card carries it.
- **The pin is never taken from the card.** Decision 024: the address on a card is not a place the
  traveller stood, and a wrong pin is quietly wrong in all three pillars.
- **No Arabic** is read, shown or kept as text. The photograph carries it for a driver.
- **An emptied box is taken off the row**, not kept as `''` — which reached जाना as a hotel with no
  name (" · मेरा होटल"). The v9 upgrade takes the empty text off hotels already saved that way.
- **Photographs taken before today are kept** and shown small beside the card until the traveller
  removes them. A release never takes something away from a phone.

## Read on the phone, never sent

घर.1 promises under every hotel, and the website promises in public, that nothing about the hotel
leaves the phone (decisions 001, 003, design rule 24). The card is read by tesseract.js — the
engine the collectors' app already uses for menus (decision 029) — in a worker on the phone.

This reverses one line of decision 016, which took WebAssembly out of the security policy when the
offline recogniser went. `'wasm-unsafe-eval'` is back in `script-src` for this and nothing else. It
permits compiling WebAssembly; it is not `'unsafe-eval'` and runs no JavaScript string. Workers from
blobs stay refused: the engine's worker is started from our own origin (`workerBlobURL: false`).

## What it costs a phone

About 4.5 MB the first time a card is read — the worker, one core (the worker picks the one the
phone can run), and `best_int` English — and nothing for a traveller who never reads one: the files
are copied into the image after the build, so the precache never sees them. Once fetched they are
kept: the English in the engine's own IndexedDB store, the worker and core in `saathi-ocr`, a cache
of their own with no limit and no expiry, spared by name when the app repairs itself. Versioned
paths (`/ocr/v7/`) make a new engine a new name, never an eviction.

`best_int` rather than the 1.9 MB `fast` data the collectors' app downloads: on 23 September the two
read the test cards identically, `fast` 1.3× quicker. `best_int` is chosen because it comes from npm
under the lockfile, so the build fetches nothing from a host of anybody else's. If reading proves
slow on a real phone, `fast` is the first thing to try.

With no signal the first time, the screen says the card needs a signal once, the boxes stay live,
and the hotel is marked `cardUnread`. The card is then read by itself at launch and every time the
phone comes back online, from whichever screen the traveller is on — a job of the app's, started at
boot like the outbox, because a listener on घर.1 dies when the traveller leaves it. The engine is
given two minutes to start online and twenty-five seconds offline, and a minute a side to read: an
engine whose English could not be fetched never answers at all, and Submit must not say
"Reading…" for ever.

## How it reads, and what was measured

Measured on 23 September on four invented Dubai cards (centred, two-column, dark, letter-spaced),
each clean, photographed and badly photographed, and the clean and photographed ones turned
sideways both ways — 28 images — through the repository's own `cardImage.ts` and `cardFields.ts`:

| field       | right | wrong | left empty |
| ----------- | ----- | ----- | ---------- |
| name        | 12    | 0     | 16         |
| desk number | 22    | 0     | 6          |
| address     | 23    | 1\*   | 4          |

\* "Building 18, Dubai" — the area missing, not a wrong one.

What that took, each learnt from a measurement that day:

- **300 dpi, said to the engine.** A photograph carries no resolution it believes; it guessed
  25 dpi and read a card as noise that it read whole at 300.
- **The engine's own threshold, not a local one.** Sauvola rescued unevenly lit photographs in one
  run and misread three desk numbers in another. The whole-card threshold misread none.
- **Every way round, the likely one first.** A card is held however the hand holds it; the owner's
  was sideways. The ink says which way the print runs but not which way up, and it guessed wrong
  on upright cards with a coloured panel — so it only orders the four turns, never removes one,
  and the next turn is tried while the reading has fewer than eight sure words.
- **A dark card is turned light** before it is read.
- **The name comes from the hotel's own web address.** Every name read right off a photographed
  card was found by matching a printed line to the email or website domain. Without it, only a
  single line carrying a hotel word and a real name is taken; the size of the print is not trusted.
- **The desk is a Dubai landline or nothing.** Not the manager's mobile, not the fax, not another
  emirate's code (a misread 4). An empty box is typed into; a wrong number rings the wrong phone.

These are invented cards. Real ones bring foil, gloss and odd typefaces, and the owner's own card
is the first real test.

## What this does not do

- It does not find the card in the photograph. A card that fills the frame reads best; a card small
  on a table reads worse. Finding the four corners would help most and is not built.
- It does not store where a value came from. The line on step two says so at the moment of reading;
  a hotel opened later shows its values without it.

## Addendum, the same day: the nearest metro and bus stop

The owner, after the card screen shipped: _"I am tempted to add … Nearest Bus stop, Nearest Metro
station, Nearest landmark. Not sure if we can auto populate some"_ — and, told that two of the three
can be, _"yes, build metro and bus stop after this ships"_.

Once the hotel is pinned, step two names the metro station and the bus stop nearest the pin, with
the distance to each, read off the RTA network the phone already carries — no signal, no typing,
and nothing stored: they are worked out from the pin each time, so a new network pack moves them
with it. From the owner's Al Rigga pin: Al Rigga metro, 450 m; Ghurair City 1, 250 m.

**The landmark is not built.** The phone knows 22 landmarks and malls, and from Al Rigga the
nearest is Deira City Centre at 1.8 km — too far to tell a driver anything. It waits for the data.

To keep step two on one screen with the new row, its one-line "kept on this phone only" footer
went; step one still says it in full, where the card is photographed.

The owner, later that day, on step two: the room box showed "412" in grey and read as filled in —
the example is now "लिखें" / "Type it". And a tap on a card photograph opened the camera; it now
opens the card full size, uncropped, with the retake as a button there.

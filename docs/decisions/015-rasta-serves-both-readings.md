# 015 — रास्ता opens with a box and two buttons

**Status:** accepted 14 September · **Affects** screens 1.1, 1.3, 1.4, the home mic, the four-tile
home · **Closes** the open question left by decision 014

## The decision

**रास्ता opens with a text bar with a small mic at the end of it. Below the bar, two CTAs:
कैसे जाएँ and ड्राइवर को दिखाएँ. The traveller chooses what he needs and shows it to whoever he
needs.**

- **कैसे जाएँ** → 1.3, the route options for that destination.
- **ड्राइवर को दिखाएँ** → 3.2, the Arabic for "take me to «place»".

The owner settled this on 14 September and it overrides how the 1.1 artboard currently reads.

## Why it is shaped this way

"Discovery Gardens jaana hai" means _show me the transport_ in a hotel room and _tell the driver_
at a taxi door. The difference is **where the traveller is standing**, which is not in the words —
so no parser recovers it and the app must never guess.

It must also never require a particular form of words: _"I cannot teach Hindi to my user."_
Requiring "ड्राइवर को कहो Discovery Gardens ले चलो" to reach the Arabic is teaching a traveller our
grammar, and a traveller who says the ordinary thing gets the wrong screen with no idea why.

So the screen serves both readings and the traveller picks. Nothing to learn, no guess to get
wrong, and the mic-placement question dissolves with it: the home input stops having to choose,
because a resolved destination lands on 1.1 with both doors open rather than on one of them.

## What follows from it, in code

- `landingFor` sends every `route` intent to `{ screen: 'transport', placeId }` — 1.1 with the box
  already filled — not to the options. So does the two-button clarifier's "वहाँ कैसे जाएँ".
- The entry route carries a destination in (`#/transport/<placeId>`), so tile 2's "go there" on a
  restaurant will be a navigation rather than a rewrite.
- The mic on 1.1 is the small, plain, ink-coloured one at the end of the box (decision 014). It
  fills the box; it is not the offer.
- **1.1 needs no two-button clarifier.** The screen supplies the context — this is the "where do
  you want to go" screen — so a bare place name here is unambiguous. What it does need is an
  honest answer when the typed place is not one we know, which is on the screen with the box
  still there.

## What this changed on 1.1, against the artboard

The artboard (`design/screens/Destination.dc.html`) still shows the superseded screen: a large
mic as the offer, "या जगह का नाम लिखिए" under it, and quick picks. The built screen is the box,
the mic inside it, and the two buttons. **The generator and the artboard have not been redrawn** —
they are owned elsewhere and were out of scope for this change. `docs/field-ledger.md` §1.1 has
been rewritten to describe what is built; the artboard is the thing now out of date.

Three artboard fields are deliberately not built, and each has a reason:

- **मेरा होटल** — the hotel is captured in tile 4, which does not exist yet. A quick pick to a
  hotel nobody has saved is a button that does nothing.
- **एयरपोर्ट** and **हाल में** — quick picks that exist to save typing. The owner's decision
  replaces the screen's shape with the box and the two buttons; these can come back as a row
  above the box once there is a recent-destination store to fill them from.

## The one thing on 1.3 that is not in the ledger

When the traveller's location cannot be had — the phone could not get a fix, or they are outside
Dubai testing the app before the trip — 1.3 has nothing to plan with. It says so, and offers
**ड्राइवर को दिखाएँ**, because the Arabic needs no location at all. That is an error state rather
than a field, and it exists because "never a dead end and never a blank" outranks a short screen:
the alternative was a header over an empty list.

A refused permission is different and goes to **1.1b**, which is the screen that says what a
refusal costs and how to undo it.

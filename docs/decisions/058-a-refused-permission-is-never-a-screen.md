# 058 — A refused permission is never a screen

**2 October 2026 · the owner**

Supersedes the 2.5 screen ("जगह की इजाज़त नहीं मिली") and the first half of design rule 18.

## What happened

The owner opened जाना on his laptop, in India, and was stopped by a full screen saying that
without his location Saathi could not show the way, with a button telling him to open his
phone's settings. The strip at the top of the same screen said "अभी बुरजुमान मॉल से दिखा रहे
हैं". So one screen said we were measuring from BurJuman, and the next said we could not measure
at all.

> "Your over enthu in being transparent is killing the app. Once and for all."

The cause was that two parts of the app worked out "where from" differently.

- **The strip and खाना** (`lib/here.ts`) fall back to BurJuman when the phone's clock is not
  Dubai's.
- **जाना** (`transport/origin.ts`) had no such fallback. A refusal, or a laptop with no GPS,
  with no hotel saved, ended on 2.5.

## Decision

- **A refused permission never becomes a screen.** जाना's start is the phone's fix inside
  Dubai, else the hotel's pin, else BurJuman, whatever the phone said. 2.5, its route, its
  strings, its board and its ledger rows are gone.
- **The screen says where from, and nothing about what the phone would not do.** "बुरजुमान
  से" is the line. "आप दुबई से बाहर हैं" is kept only when the phone actually gave a fix outside
  Dubai, because that is a fact about the trip.
- **खाना's "can't show distances" line is gone too.** A list with no distances needs no
  apology.

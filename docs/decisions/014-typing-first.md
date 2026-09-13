# 014 — Typing is the front door; voice fills the box

**Status:** accepted 13 September · **Affects** screen 1.2, the four-tile home, the order of work
**Supersedes** the emphasis in decision 004, not its mechanism

## The decision

**Typing is the primary way a traveller tells Saathi what they want. Voice is a way to fill the
box faster, and it is allowed to fail.**

Tomorrow's work is the three unbuilt tiles — रास्ता, खाना, ज़रूरी जानकारी — with typing at the
front. Voice recognition is not developed further until those exist.

## Why

The owner's words, after a day of testing on a real phone: _"If this is the quality I am getting in
a relatively quiet room, I can assume the quality of voice on a busy street. I think we are chasing
an unsolvable problem."_

That is the right read of the evidence, and the evidence is ours:

- Offline Vosk gets ordinary sentences roughly right and **proper nouns wrong** — "Mall of the
  Emirates" came back as "माला एमरेट्स". Place names are most of what this product must hear.
- There is no bigger model to reach for. Between Vosk's 42 MB Hindi model and its 1489 MB one
  there is nothing, and 1.5 GB is not a download a traveller accepts (decision 013).
- Every measurement so far was taken **in a quiet room**. A Dubai street, a taxi with the window
  down, a mall concourse — each is worse, and none of them is optional for this product.
- Typing already works completely: Hinglish is first-class (rule 4), the parser is script-agnostic,
  and the keyboard needs no permission, no model, no download and no network.

So the product should lean on the input that works everywhere rather than the one that works
sometimes, in quiet, on a phone that has spent 42 MB.

## What this does not mean

**Nothing built for voice is discarded, and the pivot costs no rework.** The confirm step built on
13 September already made this true: speech no longer opens a screen, it fills a text box that the
traveller checks and sends. Typing and speaking are the same path, and this decision is a change of
emphasis on a path that already exists.

Still standing and still used: the `SttEngine` seam, the offline Vosk engine and its grammar, the
end-of-speech clock, the confirm box, and the learning loop with `correctedFrom`.

**Grammar biasing (decision 013) is built and remains untested on a phone.** It is not abandoned,
it is unmeasured. If it is ever worth ten minutes, the ten sentences in `docs/spikes/002` are ready
and the result would tell us whether the offline recogniser is worth keeping at all.

**Steps 3 and 4 of the agreed plan are not dead, they are deferred.** sherpa-onnx measurement, and
Sarvam online-only, are still the next things to try _if_ voice is ever promoted again.

## The open question this decision does not settle

**Where the microphone belongs, and what it means when there is no tile context.**

"I have to go to Discovery Gardens" — does the traveller want the modes of transport, or the Arabic
to show a driver? Both readings are ordinary, and the app currently picks one:

- The parser files **`le chalo` / `ले चलो` as a `route` keyword**, so "Discovery Gardens le chalo" —
  the exact sentence said leaning into a taxi — opens रास्ता rather than the Arabic.
- Only an explicitly driver-shaped sentence ("ड्राइवर को कहो …") reaches tile 3.

This is not a keyword to re-file. The difference between the two meanings is **where the tourist is
standing** — a hotel room or a taxi door — and that is not in the words. No parser recovers it.

The mics on 1.1, 2.1 and 3.1 are unambiguous, because the screen supplies the context. **The mic on
the four-tile home screen is the one that has to guess**, and it is the one the owner flagged.

**The owner's constraint settles the shape:** _"I cannot teach Hindi to my user."_ Requiring
"ड्राइवर को कहो Discovery Gardens ले चलो" to reach the Arabic is teaching a traveller our grammar,
and a traveller who says the ordinary thing gets the wrong screen with no idea why. A required form
of words is our defect wearing their clothes.

So: **do not infer — serve both readings on one screen.** A resolved destination lands on रास्ता
carrying _how to get there_ and _show this to the driver_ together. Nothing to learn, no guess to get
wrong, and the mic-placement question dissolves with it because the home input stops having to
choose. Same principle as the confirm box built the same day: never guess irreversibly; show the
traveller and let them redirect.

What is still open is the screen itself — what those two actions look like side by side without
रास्ता becoming a menu. That is design work and it belongs on the artboards before the code.

Also noticed while answering this: **Discovery Gardens is not in `data/intents/places.v1.json`.**
Twelve places ship today, and the neighbourhoods a budget Indian traveller actually stays in —
Discovery Gardens, International City, Al Qusais, Satwa — are mostly missing. That is content, not
code, and it is probably worth more to a real traveller than any recogniser.
